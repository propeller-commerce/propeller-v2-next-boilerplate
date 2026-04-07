/**
 * truncation — HTML truncation utilities for descriptions.
 *
 * Used by ProductDescription and CategoryDescription components.
 * Framework-agnostic pure functions.
 */

/**
 * Strips HTML tags from a string, returning plain text.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Returns true when the plain text of the HTML exceeds maxLength characters.
 */
export function shouldTruncate(html: string, maxLength: number): boolean {
  if (!maxLength || maxLength <= 0) return false;
  const plain = stripHtml(html);
  return plain.length > maxLength;
}

/**
 * Returns the truncated plain text ending at the last word boundary before
 * maxLength characters, with a trailing ellipsis (…).
 *
 * If the content is shorter than maxLength, returns the original HTML unchanged.
 */
export function truncateAt(html: string, maxLength: number): string {
  if (!maxLength || maxLength <= 0) return html;
  const plain = stripHtml(html);
  if (plain.length <= maxLength) return html;
  const truncated = plain.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '\u2026';
}
