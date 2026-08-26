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
   * The generated Prisma Client wraps `this` in a Proxy (to synthesize `.user`, `.task`, etc.),
   * and that Proxy rebinds `this` to the raw, un-proxied target whenever one of OUR OWN subclass
   * methods/getters is invoked through it — so a bare `return this` from `db` below would hand
   * back an object missing every model delegate. Capturing the reference once here, right after
   * `super()` returns (still the real, fully-proxied instance at that point), sidesteps that.
   */
  private readonly self: PrismaService;

  /** Active transaction for this async context (set by runTopLevelTransaction), or this client itself. */
  get db(): Prisma.TransactionClient {
    return PrismaTransactionContext.getActiveClient() ?? this.self;
  }

  /** Joins the ambient transaction if one is active (e.g. inside an idempotent request), otherwise opens a new one. */
  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const active = PrismaTransactionContext.getActiveClient();
    if (active) return fn(active);
    return this.runTopLevelTransaction(fn);
  }

  /**
   * Opens a brand new transaction and exposes it via PrismaTransactionContext for the duration of
   * `fn`. Post-commit hooks registered during `fn` (PostCommitHooks.register) — e.g. an outbound
   * notification triggered by whatever `fn` did — only run after this transaction has committed,
   * so a slow/failing HTTP call never holds DB locks or risks rolling back real work.
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
