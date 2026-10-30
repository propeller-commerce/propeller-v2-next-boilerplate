import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { resolvePreviewRequest } from '@/lib/cms/preview';
import { PREPR_ENABLED } from '@/lib/preprEvent';

const STRAPI_ENABLED = process.env.CMS_PROVIDER === 'strapi';

// Shared secret guarding draft mode.
// Prepr: configure the environment's preview URL as
//   https://<host>/api/preview?secret=<PREPR_PREVIEW_SECRET>&slug=/{slug}&locale={locale}
// Prepr fills {locale} with the locale being edited (e.g. en-US), so the preview
// follows the editor's locale switch.
// Strapi: cms/config/admin.ts builds the URL (with &status=draft|published)
// from PREVIEW_SECRET, which must equal STRAPI_PREVIEW_SECRET here.
const PREVIEW_SECRET = PREPR_ENABLED
  ? process.env.PREPR_PREVIEW_SECRET || 'prepr-preview'
  : process.env.STRAPI_PREVIEW_SECRET;

/**
 * Enables Next.js draft mode (so pages fetch unpublished content) and redirects
 * to the requested page. Used by Prepr's in-editor preview and Strapi's admin
 * preview. Strapi's "Published" tab turns draft mode off instead.
 */
export async function GET(request: NextRequest) {
  const decision = resolvePreviewRequest(new URL(request.url).searchParams, {
    prepr: PREPR_ENABLED,
    strapi: STRAPI_ENABLED,
    secret: PREVIEW_SECRET,
  });
  if (decision.status !== 307) {
    return new Response(decision.body, { status: decision.status });
  }

  const draft = await draftMode();
  if (decision.draft) draft.enable();
  else draft.disable();

  redirect(decision.location);
}
