import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { PREPR_ENABLED } from '@/lib/preprEvent';

/** Disables draft mode and returns to the requested page (or home). Only
 *  available when Prepr is the active CMS. */
export async function GET(request: NextRequest) {
  if (!PREPR_ENABLED) {
    return new Response('Not found', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('redirect') || '/';

  (await draftMode()).disable();

  const target = slug.startsWith('/') ? slug : `/${slug}`;
  redirect(target);
}
