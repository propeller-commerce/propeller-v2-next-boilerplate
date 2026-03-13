import type { CmsBlock } from '@/lib/cms/types';
import HeroBanner from './blocks/HeroBanner';
import RichTextBlock from './blocks/RichTextBlock';
import ValueProps from './blocks/ValueProps';
import CallToAction from './blocks/CallToAction';
import ProductCarousel from './blocks/ProductCarousel';
import ContactForm from './blocks/ContactForm';
import MediaBlock from './blocks/MediaBlock';
import QuoteBlock from './blocks/QuoteBlock';
import ProductSliderBlock from './blocks/ProductSliderBlock';

const blockComponents: Record<string, React.ComponentType<{ block: any }>> = {
  'hero-banner': HeroBanner,
  'rich-text': RichTextBlock,
  'value-props': ValueProps,
  'call-to-action': CallToAction,
  'product-carousel': ProductCarousel,
  'contact-form': ContactForm,
  'media': MediaBlock,
  'quote': QuoteBlock,
  'product-slider': ProductSliderBlock,
};

export default function DynamicBlockRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        const Component = blockComponents[block._type];
        if (!Component) {
          console.warn(`No component found for block type: ${block._type}`);
          return null;
        }
        return <Component key={index} block={block} />;
      })}
    </>
  );
}
