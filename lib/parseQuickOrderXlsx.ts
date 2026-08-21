/**
 * XLSX parser for the quick-order upload, kept app-local so the react-ui package
 * stays free of a heavy spreadsheet dependency. Loaded via dynamic import from
 * the quick-order page, so `xlsx` (SheetJS) is only pulled into that route's
 * bundle — never the rest of the app.
 *
 * Format (matches the downloadable template + the WP plugin): column A = SKU /
 * article code, column B = quantity. The first two rows are treated as headers
 * and skipped.
 *
 * Security posture: SheetJS reads cell *values* (no formula execution). We never
 * render a raw cell as HTML and never trust the code for product identity — each
 * code is re-resolved against the API by <QuickOrder>. Here we only coerce the
 * quantity to a positive integer and hand back plain {code, quantity} pairs.
 */
import type { QuickOrderUploadLine } from '@propeller-commerce/propeller-v2-react-ui';

/** Rows above this index are treated as header rows and skipped (0-based). */
const HEADER_ROWS = 2;

export async function parseQuickOrderXlsx(file: File): Promise<QuickOrderUploadLine[]> {
  // Dynamic import: keep SheetJS out of every other bundle.
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  // `header: 1` → array-of-arrays; `raw: false` → formatted strings (no formulas).
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
  });

  const out: QuickOrderUploadLine[] = [];
  for (let i = HEADER_ROWS; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const code = String(row[0] ?? '').trim();
    if (!code) continue;
    const quantity = Math.max(1, parseInt(String(row[1] ?? '1'), 10) || 1);
    out.push({ code, quantity });
  }
  return out;
}
