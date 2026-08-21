/**
 * GET /api/spl/drawings?publicationId=<id>
 *
 * Root SPL load for a product's publication: returns `{ tree, drawing, cards, nav }`
 * — the drawing tree, the root drawing's SVG, and its part hotspots resolved to
 * Propeller products. Ports `PropellerSparepartsAjax::get_drawings`.
 *
 * Server-only: the SPL token never reaches the client. Viewer-scoped (reads the
 * auth cookie via `getServerInfra`), so responses are per-viewer and dynamic.
 */
import { NextResponse } from 'next/server';
import { assembleRoot } from '@propeller-commerce/propeller-v2-spl/server';
import { getServerInfra } from '@/lib/server';
import { isSplEnabled, getSplClient, buildSplProductResolver } from '@/lib/spl';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSplEnabled()) {
    return NextResponse.json({ error: 'spl not configured' }, { status: 503 });
  }
  const publicationId = new URL(request.url).searchParams.get('publicationId');
  if (!publicationId) {
    return NextResponse.json({ error: 'publicationId is required' }, { status: 400 });
  }
  try {
    const infra = await getServerInfra();
    const result = await assembleRoot(getSplClient(), publicationId, buildSplProductResolver(infra));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'spl error' },
      { status: 500 }
    );
  }
}
