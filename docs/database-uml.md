# UML — Estructura de la base de datos

Diagrama entidad-relación (PostgreSQL, gestionado con Prisma). Ver el esquema completo y versionado en [`prisma/schema.prisma`](../prisma/schema.prisma) y las migraciones en [`prisma/migrations/`](../prisma/migrations/).

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string lastName
        string email UK
        datetime createdAt
    }

    TASK {
        int id PK
        string title
        string description "nullable"
        enum status "open | archived"
        datetime createdAt
        datetime archivedAt "nullable"
    }

    TASK_ASSIGNMENT {
        int id PK
        int taskId FK
        int userId FK
        datetime assignedAt
        datetime completedAt "nullable"
    }

    NOTIFICATION_ATTEMPT {
        int id PK
        int taskId FK
        int attemptNumber
        int httpStatus "nullable"
        boolean success
        string errorMessage "nullable"
        datetime attemptedAt
    }

    IDEMPOTENCY_KEY {
        int id PK
        string key UK
        string method
        string path
        string bodyHash
        enum status "IN_PROGRESS | COMPLETED"
        int responseStatus "nullable"
        json responseBody "nullable"
        datetime createdAt
        datetime completedAt "nullable"
    }

    USER ||--o{ TASK_ASSIGNMENT : "es asignado en"
    TASK ||--o{ TASK_ASSIGNMENT : "tiene asignaciones"
    TASK ||--o{ NOTIFICATION_ATTEMPT : "registra intentos"
```

## Notas

- `TASK_ASSIGNMENT` es la tabla de unión que resuelve la relación muchos-a-muchos entre `USER` y `TASK`, con `@@unique([taskId, userId])` para evitar asignaciones duplicadas, y `completedAt` (nullable) para marcar si ese usuario ya completó su parte.
- `TASK.status` es un enum (`open` | `archived`); la tarea se archiva automáticamente cuando ya no quedan `TASK_ASSIGNMENT` con `completedAt = NULL`.
- `NOTIFICATION_ATTEMPT` registra cada intento de notificación al archivar una tarea (número de intento, timestamp, status HTTP obtenido), consultable vía `GET /tasks/:idTask/notifications`.
- `IDEMPOTENCY_KEY` respalda el header `Idempotency-Key`: guarda el hash del cuerpo del request y la respuesta ya calculada, para que un reintento con la misma clave reciba una respuesta idéntica sin volver a ejecutar la operación.
- Todos los IDs son enteros autoincrementales (no UUID), para que coincidan con los ejemplos numéricos del enunciado (`userIds: [1,2,3]`, `taskId: 123`).
