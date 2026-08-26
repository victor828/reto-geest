# RETO GEEST — API de gestión de tareas

API REST (NestJS + TypeScript + PostgreSQL/Prisma) para crear tareas, asignarlas a uno o varios usuarios, marcar cada participación como completada y archivar automáticamente la tarea (con notificación al sistema del cliente) cuando todos terminan.

- **UML de la base de datos:** [`docs/database-uml.md`](docs/database-uml.md)
- **Esquema versionado:** [`prisma/schema.prisma`](prisma/schema.prisma) + [`prisma/migrations/`](prisma/migrations/)
- **URL pública:** `<pendiente — ver sección Despliegue>`

## Cómo ejecutar el proyecto localmente

Requisitos: Node 22+, pnpm, Docker (para Postgres).

```bash
pnpm install
cp .env.example .env                       # valores por defecto ya apuntan al Postgres de docker-compose
docker compose -f docker-compose.dev.yml up -d db
pnpm prisma migrate deploy                  # aplica las migraciones versionadas
pnpm run start:dev                          # http://localhost:3500 — Swagger en /api
```

También se puede levantar todo (API + Postgres) con `docker compose -f docker-compose.dev.yml up`, que ya corre las migraciones automáticamente al iniciar.

### Tests

```bash
pnpm test          # unitarios (servicios de dominio, mocks de los repositorios)
pnpm run test:e2e  # e2e contra Postgres real (requiere el paso "docker compose ... up -d db" de arriba)
```

Los e2e cubren los 9 endpoints, los casos de error, y específicamente los tres requisitos de la sección **Confiabilidad**: idempotencia (secuencial y en paralelo), archivado exactamente una vez bajo dos completados concurrentes, y reintentos de notificación con backoff. Usan [`nock`](https://github.com/nock/nock) para interceptar `NOTIFY_URL` sin depender de un servicio externo real.

## Decisiones técnicas

- **Arquitectura reutilizada:** el repo ya traía NestJS + Prisma + arquitectura hexagonal por módulo (`application/domain/infrastructure/config`, patrón port/impl para repositorios) con Docker dev/prod. Se mantuvo esa base; el dominio de `users`/`tasks` se escribió desde cero porque el modelo previo (auth con JWT, `passwordHash`, roles) no correspondía a lo pedido por el reto.
- **IDs numéricos autoincrementales**, no UUID, para calzar con los ejemplos del PDF (`userIds: [1,2,3]`, `taskId: 123`).
- **Idempotencia (`Idempotency-Key`):** un interceptor global (aplicado solo a los 4 POST vía decorator `@Idempotent()`) toma un *advisory lock* de Postgres (`pg_advisory_xact_lock`) sobre el hash de la key, ejecuta el handler dentro de esa misma transacción y persiste la respuesta. Un segundo request con la misma key **espera físicamente** el lock (no hace polling) y luego devuelve la respuesta ya guardada — así ambas respuestas son literalmente idénticas incluso en paralelo. Reusar la key con un body distinto responde `422 IDEMPOTENCY_KEY_REUSED`.
- **Archivado sin duplicados:** independiente del header anterior. `POST /tasks/:id/complete` toma un `SELECT ... FOR UPDATE` sobre la fila de la tarea antes de contar cuántos usuarios siguen pendientes; eso serializa dos completados concurrentes de usuarios distintos y garantiza que solo una transacción vea "ya no queda nadie pendiente" y archive (`UPDATE ... WHERE status='open'` con chequeo de `rowCount`).
- **Notificación con reintentos:** se dispara solo si el archivado ocurrió, y **después** de que esa transacción hizo commit (nunca dentro — una notificación lenta no debe retener el lock de la tarea ni arriesgar el archivado). Un mecanismo de "post-commit hooks" (`src/db/post-commit-hooks.ts`) garantiza esto tanto si el request iba envuelto en la transacción de idempotencia como si no. Hasta 3 intentos con backoff creciente (`NOTIFICATION_BACKOFF_MS`), reintenta solo en 5xx/timeout, cada intento se persiste en `NotificationAttempt`.
- **PostgreSQL** vía Prisma con el adapter `@prisma/adapter-pg` (ya configurado en el repo original).
- **Formato de error uniforme** (`{"error":{"code","message"}}`) vía un `ExceptionFilter` global + una excepción tipada (`AppException`) que también absorbe los errores de validación (`class-validator`) y del rate limiter.

## Supuestos ante ambigüedades

- El reto no pide autenticación en ningún endpoint; se descartó por completo el módulo de auth/JWT que traía la plantilla (rompía el contrato de `POST /users`, que no lleva password).
- El header `Idempotency-Key` es **opcional** ("deben aceptar el header", no "deben requerirlo"): sin él, cada POST se ejecuta normalmente cada vez.
- `POST /tasks/:id/complete` sobre una participación ya completada (sin `Idempotency-Key`) es un *no-op* que responde 200, no un error — coherente con el espíritu de "doble clic" de la sección Confiabilidad.
- `email` de usuario es único; reutilizarlo responde `409 EMAIL_ALREADY_REGISTERED`.
- Asignar usuarios a una tarea ya archivada está permitido (no se especifica lo contrario) y no la reabre.
- No hay paginación en `GET /users` ni `GET /tasks` — no la pide el PDF y el volumen de datos del reto no la justifica.

## Qué se recortó por falta de tiempo

- No hay `PATCH`/`DELETE` de usuarios o tareas (no requeridos).
- No hay un mecanismo de reenvío manual para notificaciones que agotaron sus 3 intentos (quedan registradas y consultables, pero no se reintenta más tarde).
- Documentación Swagger básica (rutas mapeadas en `/api`), sin decorators `@ApiProperty` exhaustivos en cada DTO.

## Extra — Rate limiting

**Problema que resuelve:** la propia sección Confiabilidad describe un escenario de reintentos automáticos y dobles clics; sin límite de tasa, una ráfaga de reintentos (de un cliente con bug, o un ataque) puede saturar la API/DB sin que la idempotencia (que dedupe por *key*, no por volumen) lo evite.
**Por qué se consideró necesaria:** es una capa de protección independiente y barata que no interfiere con la funcionalidad requerida — los límites (`THROTTLE_TTL_MS`/`THROTTLE_LIMIT`, configurables) están calibrados para no afectar el uso normal ni los tests de concurrencia.
**Por qué esta sobre otras alternativas:** se evaluaron auditoría/soft-delete y logging estructurado; rate limiting se eligió por ser la que más se conecta con el tema de "Confiabilidad" ya presente en el reto, es funcional en minutos (`@nestjs/throttler`) y es fácilmente verificable (ver `test`/`curl` — a partir del request 28 en 10s responde `429` con el mismo formato `{"error":{"code":"RATE_LIMITED",...}}`).

## Despliegue

**Dónde:** Render (Web Service desde este `Dockerfile` + Render PostgreSQL, free tier).
**Por qué:** deploy directo desde GitHub sin tarjeta de crédito en el plan free, y el repo ya tenía un `Dockerfile` multi-stage listo (`target: prod`) que Render puede construir sin cambios — el `CMD` corre `prisma migrate deploy` antes de levantar la API en cada deploy.
**Cómo acceder:** `<URL pública — completar tras el deploy>`. Variables de entorno a configurar en Render: `DATABASE_URL` (de Render Postgres), `NOTIFY_URL`, y opcionalmente `NOTIFICATION_BACKOFF_MS`/`THROTTLE_*` (ver `.env.example`).
