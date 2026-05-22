/**
 * SEO metadata helpers — shared by the `generateMetadata` functions of the
 * product, category and cluster pages.
 *
 * Propeller's `Product` / `Category` / `Cluster` types each expose localized
 * SEO fields — `metadataTitles`, `metadataDescriptions`, `metadataCanonicalUrls`
 * (and `metadataKeywords`) — all `LocalizedString[]`. These are the
 * editor-curated source of truth for the page `<title>`, `<meta description>`
 * and canonical URL.
 *
 * In practice a given entity often has these fields EMPTY (not every product
 * has hand-written SEO copy). So every resolver here takes a fallback — the
 * entity's own `names` / `shortDescriptions` — and a metadata field only wins
 * when it actually carries a non-blank value for the active language.
 */

import 'server-only';
import type { LocalizedString } from 'propeller-sdk-v2';
import { getLanguageString } from 'propeller-v2-react-ui/shared';

/**
 * Resolve a localized field for `language`, returning `undefined` (not '')
 * when the field is absent or its matched entry has no usable value — so the
 * caller can cleanly fall back.
 */
function resolveOrUndefined(
  items: LocalizedString[] | null | undefined,
  language: string
): string | undefined {
  if (!items || items.length === 0) return undefined;
  const value = getLanguageString(items, language, '');
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Pick the SEO `<title>`: the curated `metadataTitles` entry when present,
 * otherwise the entity's localized name.
 */
export function resolveSeoTitle(
  metadataTitles: LocalizedString[] | null | undefined,
  fallbackNames: LocalizedString[] | null | undefined,
  language: string
): string | undefined {
  return (
    resolveOrUndefined(metadataTitles, language) ??
    resolveOrUndefined(fallbackNames, language)
  );
}

/**
 * Pick the `<meta description>`: the curated `metadataDescriptions` entry
 * when present, otherwise the first non-empty entry from `fallbacks`, tried
 * in order.
 *
 * Pass fallbacks shortest-first — e.g. `[shortDescriptions, descriptions]` —
 * so a concise short description wins, but a populated long description is
 * still used when the short one is empty (common in Propeller catalog data).
 * The chosen fallback is stripped of HTML and clamped to a meta-safe length.
 */
export function resolveSeoDescription(
  metadataDescriptions: LocalizedString[] | null | undefined,
  fallbacks: (LocalizedString[] | null | undefined)[],
  language: string,
  maxLength = 160
): string | undefined {
  const curated = resolveOrUndefined(metadataDescriptions, language);
  if (curated) return clamp(curated, maxLength);

  for (const fallback of fallbacks) {
    const value = resolveOrUndefined(fallback, language);
    if (value) return clamp(stripHtmlTags(value), maxLength);
  }
  return undefined;
}

/**
 * Resolve the canonical URL from `metadataCanonicalUrls`. Returns `undefined`
 * when no curated canonical exists — in that case the caller should omit
 * `alternates.canonical` so Next.js defaults to the request URL.
 */
export function resolveCanonicalUrl(
  metadataCanonicalUrls: LocalizedString[] | null | undefined,
  language: string
): string | undefined {
  return resolveOrUndefined(metadataCanonicalUrls, language);
}

/** Resolve `metadataKeywords` into a comma-split keyword list, if curated. */
export function resolveSeoKeywords(
  metadataKeywords: LocalizedString[] | null | undefined,
  language: string
): string[] | undefined {
  const raw = resolveOrUndefined(metadataKeywords, language);
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/** Strip HTML tags and collapse whitespace — for description fallbacks. */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clamp a string to `max` chars, breaking on a word boundary with an ellipsis. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
