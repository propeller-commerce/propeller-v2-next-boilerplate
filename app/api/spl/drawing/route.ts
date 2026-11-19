/**
 * GET /api/spl/drawing?id=<drawingId>
 *
 * Drill-down SPL load: returns `{ drawing, cards, nav }` for a single drawing.
 * Ports `PropellerSparepartsAjax::get_drawing`.
 *
 * Server-only (SPL token stays server-side); viewer-scoped and dynamic.
 */
import { NextResponse } from 'next/server';
import { errorSummary } from '@/lib/http/errorSummary';
import { assembleDrawing } from '@propeller-commerce/propeller-v2-spl/server';
import { getServerInfra } from '@/lib/server';
import { isSplEnabled, getSplClient, buildSplProductResolver } from '@/lib/spl';
import { withoutCostPrices } from '@/lib/catalog/hidePrices';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSplEnabled()) {
    return NextResponse.json({ error: 'spl not configured' }, { status: 503 });
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  try {
    const infra = await getServerInfra();
    // Cards are named in the language the products were resolved in.
    const result = await assembleDrawing(getSplClient(), id, buildSplProductResolver(infra), {
      language: infra.language,
    });
    // Hotspot products come from the SDK's category document: no cost prices to the browser.
    return NextResponse.json(withoutCostPrices(result));
  } catch (e) {
    // Generic to the client: SPL errors can carry upstream URLs and details.
    console.error('[api/spl/drawing] failed:', errorSummary(e));
    return NextResponse.json(
      { error: 'spl error' },
      { status: 500 }
    );
  }
}
