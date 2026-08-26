import { AsyncLocalStorage } from 'node:async_hooks';

type Hook = () => Promise<void> | void;

const storage = new AsyncLocalStorage<Hook[]>();

/**
 * Lets deeply-nested services schedule work (e.g. an outbound notification) that must run only
 * after the current database transaction has actually committed, without those services needing
 * to know whether they are inside a top-level transaction or one reused from an outer caller
 * (see PrismaService.runTopLevelTransaction, which owns collecting and draining these hooks).
 */
export const PostCommitHooks = {
  async runWithCollector<T>(fn: () => Promise<T>): Promise<{ result: T; hooks: Hook[] }> {
    const hooks: Hook[] = [];
    const result = await storage.run(hooks, fn);
    return { result, hooks };
  },

  /** Resolves once the hook has actually run — either deferred to post-commit, or immediately if there is no active transaction to wait on. */
  register(hook: Hook): Promise<void> {
    const hooks = storage.getStore();
    if (hooks) {
      hooks.push(hook);
      return Promise.resolve();
    }
    return Promise.resolve(hook());
  },
};
