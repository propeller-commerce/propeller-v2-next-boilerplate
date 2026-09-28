/**
 * Shared email shell for app-sent mail.
 *
 * Table-based with inline styles on purpose: Outlook ignores <style> blocks and
 * most modern CSS. The wordmark is text, not an image — clients block remote
 * images by default, so a logo would render as a broken box for most readers.
 */

const ACCENT = process.env.MAIL_ACCENT_COLOR || '#1a1a1a';
const TEXT = '#333333';
const MUTED = '#666666';
const BORDER = '#dddddd';

export const escapeHtml = (s: string): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** One `<strong>Label:</strong> value` row. Values are escaped by the caller. */
export function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 10px;font-size:15px;line-height:22px;color:${TEXT}">
    <strong style="color:${TEXT}">${escapeHtml(label)}:</strong> ${value}
  </p>`;
}

/** Section heading inside the body. */
export function sectionHeading(text: string): string {
  return `<h3 style="margin:24px 0 12px;font-size:16px;line-height:22px;color:${TEXT};font-weight:bold">
    ${escapeHtml(text)}
  </h3>`;
}

/** A two-column SKU/name table. Rows are escaped here. */
export function productTable(
  items: Array<{ code?: string; name?: string; quantity?: number }>,
  headings: { code: string; name: string; quantity: string }
): string {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED};white-space:nowrap;vertical-align:top">${escapeHtml(i.code || '')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT}">${escapeHtml(i.name || '')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT};text-align:right">${escapeHtml(String(i.quantity ?? ''))}</td>
      </tr>`
    )
    .join('');
  const th = `padding:8px 12px;border-bottom:2px solid ${ACCENT};font-size:13px;color:${TEXT};text-transform:uppercase;letter-spacing:0.3px`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 8px">
    <tr>
      <th align="left" style="${th}">${escapeHtml(headings.code)}</th>
      <th align="left" style="${th}">${escapeHtml(headings.name)}</th>
      <th align="right" style="${th}">${escapeHtml(headings.quantity)}</th>
    </tr>
    ${rows}
  </table>`;
}

export interface EmailShellOptions {
  /** Bold heading at the top. */
  title: string;
  /** Pre-rendered, already-escaped HTML for the body. */
  body: string;
}

export function renderEmail({ title, body }: EmailShellOptions): string {
  const shopName = process.env.NEXT_PUBLIC_SITE_NAME || 'Propeller';
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td style="padding:32px 24px 0;">
        <span style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;color:${ACCENT};letter-spacing:0.5px;">${escapeHtml(shopName)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 24px 8px;font-family:Arial,Helvetica,sans-serif;">
        <h2 style="margin:0 0 16px;font-size:20px;line-height:28px;color:${TEXT};font-weight:bold;">
          ${escapeHtml(title)}
        </h2>
        ${body}
      </td>
    </tr>
    <tr>
      <td style="padding:24px 24px 32px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid ${BORDER};">
        <p style="margin:16px 0 0;font-size:12px;line-height:18px;color:${MUTED};">
          &copy; ${year} ${escapeHtml(shopName)}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
