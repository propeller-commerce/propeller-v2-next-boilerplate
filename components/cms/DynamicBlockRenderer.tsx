import { CmsPageRenderer } from '@propeller-commerce/propeller-v2-cms-react';
import type { CmsBlock } from '@/lib/cms/types';
import { cmsBlockRenderers } from './blockRenderers';

/**
 * Renders a list of CMS blocks via the package renderer
 * (`@propeller-commerce/propeller-v2-cms-react`) + this app's renderer registry.
 *
 * Thin wrapper: consumers pass `blocks` (a page's or article's block list);
 * we hand them to `<CmsPageRenderer>` through a minimal page shape. Unknown
 * block types render nothing in prod, a debug box in dev.
 */
export default function DynamicBlockRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <CmsPageRenderer
      page={{ id: 0, blocks } as never}
      renderers={cmsBlockRenderers}
      debug={process.env.NODE_ENV !== 'production'}
    />
  );
}
