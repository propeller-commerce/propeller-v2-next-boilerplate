/**
 * formatting — Price and date formatting helpers.
 *
 * Framework-agnostic pure functions.
 */

/**
 * Formats a numeric price to a localised currency string.
 * Defaults to EUR (€) with 2 decimal places.
 */
export function formatPrice(
  amount: number | null | undefined,
  options: {
    currency?: string;
    locale?: string;
    symbol?: string;
  } = {}
): string {
  if (amount === null || amount === undefined) return '';
  const { currency = 'EUR', locale = 'nl-NL', symbol } = options;

  if (symbol !== undefined) {
    return `${symbol}${Number(amount).toFixed(2)}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `€${Number(amount).toFixed(2)}`;
  }
}

/**
 * Formats a date string or Date object to a localised date string.
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    locale?: string;
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
  } = {}
): string {
  if (!date) return '';
  const { locale = 'nl-NL', dateStyle = 'medium' } = options;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, { dateStyle }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Calculates the percentage discount between original and discounted price.
 * Returns 0 if original is 0 or undefined.
 */
export function calcDiscountPercent(
  original: number | null | undefined,
  discounted: number | null | undefined
): number {
  if (!original || original === 0) return 0;
  if (discounted === null || discounted === undefined) return 0;
  return Math.round(((original - discounted) / original) * 100);
}
