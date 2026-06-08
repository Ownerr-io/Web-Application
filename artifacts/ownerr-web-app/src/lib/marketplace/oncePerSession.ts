const onceKeys = new Set<string>();

/** Run an async side effect at most once per browser session for a given key. */
export async function runOncePerSession(
  key: string,
  fn: () => Promise<void>,
): Promise<void> {
  if (onceKeys.has(key)) return;
  onceKeys.add(key);
  try {
    await fn();
  } catch (err) {
    onceKeys.delete(key);
    throw err;
  }
}
