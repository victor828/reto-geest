import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from 'src/generated/prisma/client';
import { PrismaTransactionContext } from './prisma-transaction.context';
import { PostCommitHooks } from './post-commit-hooks';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  logger = new Logger(PrismaService.name);

  /**
   * El Prisma Client generado envuelve `this` en un Proxy (para sintetizar `.user`, `.task`, etc.),
   * y ese Proxy reasigna `this` al objetivo crudo, sin proxy, cada vez que se invoca a través de él
   * uno de los métodos/getters de NUESTRA PROPIA subclase — así que un simple `return this` desde
   * `db` más abajo devolvería un objeto sin ninguno de los delegados de modelo. Capturar la referencia
   * una sola vez aquí, justo después de que `super()` retorna (todavía la instancia real y completamente
   * proxied en ese punto), evita ese problema.
   */
  private readonly self: PrismaService;

  /** Transacción activa para este contexto asíncrono (definida por runTopLevelTransaction), o este mismo cliente. */
  get db(): Prisma.TransactionClient {
    return PrismaTransactionContext.getActiveClient() ?? this.self;
  }

  /** Se une a la transacción ambiental si hay una activa (p. ej. dentro de una petición idempotente), si no abre una nueva. */
  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const active = PrismaTransactionContext.getActiveClient();
    if (active) return fn(active);
    return this.runTopLevelTransaction(fn);
  }

  /**
   * Abre una transacción completamente nueva y la expone vía PrismaTransactionContext durante la
   * duración de `fn`. Los hooks de post-commit registrados durante `fn` (PostCommitHooks.register)
   * — p. ej. una notificación saliente disparada por lo que haya hecho `fn` — solo se ejecutan después
   * de que esta transacción haya hecho commit, así una llamada HTTP lenta o fallida nunca mantiene
   * bloqueos de BD ni arriesga revertir trabajo real.
   */
  async runTopLevelTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const { result, hooks } = await PostCommitHooks.runWithCollector(() =>
      this.$transaction((tx) => PrismaTransactionContext.run(tx, () => fn(tx))),
    );
    for (const hook of hooks) {
      await hook();
    }
    return result;
  }

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
    this.self = this;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error as Error);
      throw error;
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
