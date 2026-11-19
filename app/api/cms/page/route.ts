import { NextResponse, type NextRequest } from 'next/server';
import { draftMode } from 'next/headers';
import type { Contact } from '@propeller-commerce/propeller-sdk-v2';
import { getPage } from '@/lib/cms';
import { getUserSegments } from '@/lib/preprSegments';
import { getServerInfra } from '@/lib/server';

/**
 * GET /api/cms/page?slug=home&locale=EN — a CMS page for client re-renders
 * (PersonalizedPage after a language switch, or with Prepr segments). The CMS
 * token stays server-side; segments come from the verified session, never from
 * the request, and draft mode is honoured so a preview keeps showing the draft.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const slug = (params.get('slug') || '').trim();
  const locale = (params.get('locale') || '').trim();
  if (!/^[a-z0-9][a-z0-9/-]{0,200}$/i.test(slug) || (locale && !/^[a-z]{2}$/i.test(locale))) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const infra = await getServerInfra();
  // The company the contact switched to, else their default company (getUserSegments' fallback).
  const contact = infra.user && 'contactId' in infra.user ? (infra.user as Contact) : null;
  const company = contact?.companies?.items?.find((c) => c.companyId === infra.selectedCompanyId) ?? null;
  const { isEnabled: preview } = await draftMode();

  const page = await getPage(slug, {
    locale: locale ? locale.toUpperCase() : undefined,
    segments: getUserSegments(infra.user, company),
    preview,
    noStore: true,
  });
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(page, { headers: { 'Cache-Control': 'private, no-store' } });
}
