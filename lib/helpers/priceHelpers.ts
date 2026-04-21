export function formatPrice(value: number | null | undefined, currency = '€'): string {
  if (value === null || value === undefined) return '';
  return `${currency}${Number(value).toFixed(2)}`;
}
