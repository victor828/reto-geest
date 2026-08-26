import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from 'src/generated/prisma/client';

const storage = new AsyncLocalStorage<Prisma.TransactionClient>();

export const PrismaTransactionContext = {
  run<T>(tx: Prisma.TransactionClient, fn: () => Promise<T>): Promise<T> {
    return storage.run(tx, fn);
  },
  getActiveClient(): Prisma.TransactionClient | undefined {
    return storage.getStore();
  },
};
