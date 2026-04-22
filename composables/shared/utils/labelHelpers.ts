export function getLabel(
  labels: Record<string, string> | null | undefined,
  key: string,
  fallback: string,
): string {
  return labels?.[key] || fallback;
}
