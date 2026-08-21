import { headers } from 'next/headers';

/**
 * Collect the Prepr personalization headers that proxy.ts forwarded onto this
 * request (Prepr-Segments, Prepr-Customer-Id, Prepr-Visitor-IP, Prepr-Context-*,
 * Prepr-ABTesting), ready to pass to a CMS fetch as `extraHeaders`.
 *
 * Prepr prioritizes Prepr-Customer-Id over Prepr-Segments, so when a segment is
 * targeted — a logged-in B2B group, or the editor's preview segment switch
 * (?prepr_preview_segment) — we send the segment (plus any A/B-test selection)
 * and drop the visitor identity/context, so the segment's adaptive variant
 * resolves instead of the individual visitor's.
 */
export async function readForwardedPreprHeaders(): Promise<Record<string, string>> {
  const requestHeaders = await headers();
  const preprHeaders: Record<string, string> = {};
  requestHeaders.forEach((value, key) => {
    if (key.toLowerCase().startsWith('prepr-')) preprHeaders[key] = value;
  });

  if (preprHeaders['prepr-segments']) {
    const keep = new Set(['prepr-segments', 'prepr-abtesting']);
    for (const key of Object.keys(preprHeaders)) {
      if (!keep.has(key)) delete preprHeaders[key];
    }
  }

  return preprHeaders;
}
