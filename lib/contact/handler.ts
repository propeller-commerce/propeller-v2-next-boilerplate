import type { MailMessage } from '../mail/core';
import { detailRow, escapeHtml, renderEmail, sectionHeading } from '../mail/template.ts';
import {
  CONTACT_POLICY,
  captchaResponse,
  isHoneypot,
  rateLimitResponse,
  type FormProtection,
} from '../form-protection/index.ts';

// CMS contact form: mails CONTACT_TO_EMAIL only, visitor as reply-to.

export const MAX_NAME = 200;
export const MAX_EMAIL = 254;
export const MAX_MESSAGE = 5000;

export interface ContactDeps {
  send: (message: MailMessage) => Promise<void>;
  // Comma-separated CONTACT_TO_EMAIL value.
  recipients: string | undefined;
  protection: FormProtection;
}

const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Trimmed string, or null when not a string or over the cap.
function field(raw: unknown, max: number): string | null {
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value.length > max ? null : value;
}

export async function handleContact(req: Request, deps: ContactDeps): Promise<Response> {
  const limited = rateLimitResponse(req, CONTACT_POLICY, deps.protection);
  if (limited) return limited;

  const to = (deps.recipients || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) {
    console.error('[api/contact] CONTACT_TO_EMAIL is not configured');
    return Response.json({ error: 'Contact form not configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (isHoneypot(body)) {
    console.info('[api/contact] honeypot filled; submission dropped');
    return Response.json({ ok: true });
  }
  const rejected = await captchaResponse(req, body, CONTACT_POLICY, deps.protection);
  if (rejected) return rejected;

  const name = field(body.name, MAX_NAME);
  const email = field(body.email, MAX_EMAIL);
  const message = field(body.message, MAX_MESSAGE);

  if (!name) return Response.json({ error: 'A name is required' }, { status: 400 });
  if (!email || !isEmail(email)) {
    return Response.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (!message) return Response.json({ error: 'A message is required' }, { status: 400 });

  const subjectName = name.replace(/[\r\n]+/g, ' ');

  try {
    await deps.send({
      to,
      replyTo: email,
      subject: `Contact form - ${subjectName}`,
      text: [`Name: ${name}`, `Email: ${email}`, '', 'Message:', message].join('\n'),
      html: renderEmail({
        title: 'New contact form message',
        body: [
          sectionHeading('Contact details'),
          detailRow('Name', escapeHtml(name)),
          detailRow('Email', `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`),
          sectionHeading('Message'),
          `<p style="margin:0;font-size:15px;line-height:22px;color:#333333;white-space:pre-wrap">${escapeHtml(message)}</p>`,
        ].join(''),
      }),
    });
  } catch (e) {
    console.error('[api/contact] send failed:', e);
    return Response.json({ error: 'Failed to send the message' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
