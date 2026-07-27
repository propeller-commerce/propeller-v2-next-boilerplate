/**
 * GET /api/spl/drawing?id=<drawingId>
 *
 * Drill-down SPL load: returns `{ drawing, cards, nav }` for a single drawing.
 * Ports `PropellerSparepartsAjax::get_drawing`.
 *
 * Server-only (SPL token stays server-side); viewer-scoped and dynamic.
 */
import { NextResponse } from 'next/server';
import { assembleDrawing } from '@propeller-commerce/propeller-v2-spl/server';
import { getServerInfra } from '@/lib/server';
import { isSplEnabled, getSplClient, buildSplProductResolver } from '@/lib/spl';

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
    const result = await assembleDrawing(getSplClient(), id, buildSplProductResolver(infra));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'spl error' },
      { status: 500 }
    );
  }
}
