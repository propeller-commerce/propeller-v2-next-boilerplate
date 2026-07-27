/**
 * POST /api/spl/contact
 *
 * Sends a spare-part "Information request" (the modal shown for a hotspot whose
 * SKU has no Propeller product) to the configured SPL contact email, via the
 * Propeller backend's mail (`publishEmailSendEvent`). Ports the WP
 * `PropellerSparepartsAjax::spl_contact`.
 *
 * Body: SplContactPayload `{ part, hostProduct?, breadcrumb?, form }`.
 * 200 { ok: true } · 400 invalid · 503 not configured · 500 send failed.
 */
import { NextResponse } from 'next/server';
import type { SplContactPayload } from '@propeller-commerce/propeller-v2-spl/server';
import { isSplEnabled, splContactEmail, sendSplContactEmail } from '@/lib/spl';

export const dynamic = 'force-dynamic';

const REQUIRED_FIELDS = ['company', 'firstName', 'lastName', 'email', 'phone'] as const;

function isValid(body: unknown): body is SplContactPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as { part?: { sku?: unknown }; form?: Record<string, unknown> };
  if (!b.part || typeof b.part.sku !== 'string') return false;
  const f = b.form;
  if (!f || typeof f !== 'object') return false;
  return REQUIRED_FIELDS.every((k) => typeof f[k] === 'string' && (f[k] as string).trim().length > 0);
}

export async function POST(request: Request) {
  if (!isSplEnabled()) {
    return NextResponse.json({ error: 'spl not configured' }, { status: 503 });
  }
  if (!splContactEmail()) {
    return NextResponse.json({ error: 'contact email not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!isValid(body)) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  try {
    await sendSplContactEmail(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'send failed' },
      { status: 500 }
    );
  }
}
