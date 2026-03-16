import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCallToAction extends Struct.ComponentSchema {
  collectionName: 'components_shared_call_to_actions';
  info: {
    description: 'CTA section with title, description and button';
    displayName: 'Call To Action';
    icon: 'cursor';
  };
  attributes: {
    buttonText: Schema.Attribute.String & Schema.Attribute.Required;
    buttonUrl: Schema.Attribute.String & Schema.Attribute.Required;
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['primary', 'secondary']> &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SharedContactForm extends Struct.ComponentSchema {
  collectionName: 'components_shared_contact_forms';
  info: {
    description: 'Contact form with configurable title and success message';
    displayName: 'Contact Form';
    icon: 'envelop';
  };
  attributes: {
    description: Schema.Attribute.Text;
    successMessage: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Thank you for your message. We will get back to you soon.'>;
    title: Schema.Attribute.String;
  };
}

export interface SharedFooterColumn extends Struct.ComponentSchema {
  collectionName: 'components_shared_footer_columns';
  info: {
    description: 'Footer link column with title and links';
    displayName: 'Footer Column';
    icon: 'layout';
  };
  attributes: {
    links: Schema.Attribute.Component<'shared.nav-link', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedHeroBanner extends Struct.ComponentSchema {
  collectionName: 'components_shared_hero_banners';
  info: {
    description: 'Full-width hero section with background image and CTA';
    displayName: 'Hero Banner';
    icon: 'picture';
  };
  attributes: {
    ctaText: Schema.Attribute.String;
    ctaUrl: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    secondaryCtaText: Schema.Attribute.String;
    secondaryCtaUrl: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedNavLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_nav_links';
  info: {
    description: 'Navigation link with optional highlight';
    displayName: 'Nav Link';
    icon: 'link';
  };
  attributes: {
    highlight: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedProductCarousel extends Struct.ComponentSchema {
  collectionName: 'components_shared_product_carousels';
  info: {
    description: 'Displays products from a Propeller category';
    displayName: 'Product Carousel';
    icon: 'apps';
  };
  attributes: {
    categoryId: Schema.Attribute.String & Schema.Attribute.Required;
    limit: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 24;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<8>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedProductSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_product_sliders';
  info: {
    description: 'Displays products/clusters from Propeller by ID';
    displayName: 'Product Slider';
    icon: 'shoppingCart';
  };
  attributes: {
    clusterIds: Schema.Attribute.String;
    productIds: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface SharedValuePropItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_value_prop_items';
  info: {
    description: 'Single value proposition with icon, title and text';
    displayName: 'Value Prop Item';
    icon: 'star';
  };
  attributes: {
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    text: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedValueProps extends Struct.ComponentSchema {
  collectionName: 'components_shared_value_props';
  info: {
    description: 'Grid of value propositions';
    displayName: 'Value Props';
    icon: 'bulletList';
  };
  attributes: {
    items: Schema.Attribute.Component<'shared.value-prop-item', true>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.call-to-action': SharedCallToAction;
      'shared.contact-form': SharedContactForm;
      'shared.footer-column': SharedFooterColumn;
      'shared.hero-banner': SharedHeroBanner;
      'shared.media': SharedMedia;
      'shared.nav-link': SharedNavLink;
      'shared.product-carousel': SharedProductCarousel;
      'shared.product-slider': SharedProductSlider;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.value-prop-item': SharedValuePropItem;
      'shared.value-props': SharedValueProps;
    }
  }
}
