/**
 * Block renderer registry for `<CmsPageRenderer renderers={...}>` (from
 * `@propeller-commerce/propeller-v2-cms-react`).
 *
 * The package ships no block components — brand styling is the shop's job.
 * We register nextDemo's app-local, theme-tokened blocks here, keyed by the
 * typed `_type` discriminator. `<CmsBlock>` resolves `_type ?? type`, so this
 * map works for both the typed `CmsRichPage` a `CmsProvider.getPage` returns
 * and any flat adapter blocks.
 *
 * Unknown block types render nothing in prod, or a debug box when `debug` is on.
 */
import type { CmsBlockRenderer } from '@propeller-commerce/propeller-v2-cms-react';
import HeroBanner from './blocks/HeroBanner';
import RichTextBlock from './blocks/RichTextBlock';
import ValueProps from './blocks/ValueProps';
import CallToAction from './blocks/CallToAction';
import ProductCarousel from './blocks/ProductCarousel';
import ContactForm from './blocks/ContactForm';
import MediaBlock from './blocks/MediaBlock';
import QuoteBlock from './blocks/QuoteBlock';
import ProductSliderBlock from './blocks/ProductSliderBlock';
import FeatureBlock from './blocks/FeatureBlock';
import FAQBlock from './blocks/FAQBlock';
import PostCardsBlock from './blocks/PostCardsBlock';
import ProductCardsBlock from './blocks/ProductCardsBlock';
import StaticBlock from './blocks/StaticBlock';
import CardActionsBlock from './blocks/CardActionsBlock';

/**
 * `_type` → renderer. Each renderer receives the whole block; the block
 * components narrow it to their specific type via their own prop typing.
 * `block as never` keeps the shared `CmsBlockRenderer` signature (a generic
 * block) compatible with each component's specific-block prop.
 */
export const cmsBlockRenderers: Record<string, CmsBlockRenderer> = {
  'hero-banner': (block) => <HeroBanner block={block as never} />,
  'rich-text': (block) => <RichTextBlock block={block as never} />,
  'value-props': (block) => <ValueProps block={block as never} />,
  'call-to-action': (block) => <CallToAction block={block as never} />,
  'product-carousel': (block) => <ProductCarousel block={block as never} />,
  'contact-form': (block) => <ContactForm block={block as never} />,
  media: (block) => <MediaBlock block={block as never} />,
  quote: (block) => <QuoteBlock block={block as never} />,
  'product-slider': (block) => <ProductSliderBlock block={block as never} />,
  feature: (block) => <FeatureBlock block={block as never} />,
  faq: (block) => <FAQBlock block={block as never} />,
  'post-cards': (block) => <PostCardsBlock block={block as never} />,
  'product-cards': (block) => <ProductCardsBlock block={block as never} />,
  static: (block) => <StaticBlock block={block as never} />,
  'card-actions': (block) => <CardActionsBlock block={block as never} />,
};
