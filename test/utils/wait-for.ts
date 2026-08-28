/**
 * Polls `check` until it returns true or `timeoutMs` elapses. Needed now that notification
 * delivery happens on a BullMQ worker after the HTTP response returns, instead of inline.
 */
export async function waitFor(
  check: () => Promise<boolean>,
  { timeoutMs = 2000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
}
