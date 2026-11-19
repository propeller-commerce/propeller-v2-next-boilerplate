const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * `raw` when it is a path on this site ("/account"), else undefined: no scheme, "//host", "/\host",
 * and no "//" or "\" anywhere in the path part, so stripping a language prefix ("/en//host" →
 * "//host") can't turn it into another host either.
 */
export function localPath(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value.startsWith('/') || CONTROL_CHARS.test(value)) return undefined;
  const path = value.split(/[?#]/, 1)[0];
  if (path.includes('//') || path.includes('\\')) return undefined;
  return value;
}
