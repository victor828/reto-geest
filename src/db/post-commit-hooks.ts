import { AsyncLocalStorage } from 'node:async_hooks';

type Hook = () => Promise<void> | void;

const storage = new AsyncLocalStorage<Hook[]>();

/**
 * Permite que servicios profundamente anidados programen trabajo (p. ej. una notificación saliente)
 * que debe ejecutarse solo después de que la transacción de base de datos actual haya hecho commit,
 * sin que esos servicios necesiten saber si están dentro de una transacción de nivel superior o de
 * una reutilizada de un caller externo (ver PrismaService.runTopLevelTransaction, que se encarga de
 * recolectar y vaciar estos hooks).
 */
export const PostCommitHooks = {
  async runWithCollector<T>(fn: () => Promise<T>): Promise<{ result: T; hooks: Hook[] }> {
    const hooks: Hook[] = [];
    const result = await storage.run(hooks, fn);
    return { result, hooks };
  },

  /** Se resuelve una vez que el hook realmente se ejecutó — ya sea diferido a post-commit, o de inmediato si no hay transacción activa que esperar. */
  register(hook: Hook): Promise<void> {
    const hooks = storage.getStore();
    if (hooks) {
      hooks.push(hook);
      return Promise.resolve();
    }
    return Promise.resolve(hook());
  },
};
