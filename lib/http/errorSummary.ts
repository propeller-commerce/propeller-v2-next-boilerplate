/**
 * What to log about a mail or Propeller failure: the error type and codes only. Messages and
 * responses often quote the recipient or contact email, which must not reach the logs.
 */
export function errorSummary(e: unknown): Record<string, string | number> {
  if (e === null) return { name: 'null' };
  if (!(e instanceof Error)) return { name: typeof e };
  const out: Record<string, string | number> = { name: e.name };
  const extra = e as unknown as Record<string, unknown>;
  for (const key of ['code', 'responseCode', 'command', 'status', 'statusCode']) {
    const v = extra[key];
    if (typeof v === 'string' || typeof v === 'number') out[key] = v;
  }
  return out;
}
