import 'dotenv/config';

const API_BASE = 'https://api.prepr.io';
const TOKEN = process.env.PREPR_MANAGEMENT_TOKEN;

if (!TOKEN) {
  console.error('Missing PREPR_MANAGEMENT_TOKEN in .env');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Field helper functions
// ---------------------------------------------------------------------------

interface Field {
  label: string;
  api_id: string;
  field_type: string;
  required?: boolean;
  [key: string]: unknown;
}

function textField(label: string, apiId: string, required = false): Field {
  return { label, api_id: apiId, field_type: 'string', required };
}

function boolField(label: string, apiId: string, defaultValue?: boolean): Field {
  const f: Field = { label, api_id: apiId, field_type: 'boolean' };
  if (defaultValue !== undefined) f.default_value = defaultValue;
  return f;
}

function assetField(label: string, apiId: string): Field {
  return { label, api_id: apiId, field_type: 'asset' };
}

function multiAssetField(label: string, apiId: string): Field {
  return { label, api_id: apiId, field_type: 'assets' };
}

function numberField(label: string, apiId: string, defaultValue?: number): Field {
  const f: Field = { label, api_id: apiId, field_type: 'integer' };
  if (defaultValue !== undefined) f.default_value = defaultValue;
  return f;
}

function richTextField(label: string, apiId: string): Field {
  return { label, api_id: apiId, field_type: 'rich_content' };
}

function enumField(label: string, apiId: string, values: string[]): Field {
  return { label, api_id: apiId, field_type: 'enum', enum_values: values };
}

function stackField(label: string, apiId: string, componentAliases: string[]): Field {
  return {
    label,
    api_id: apiId,
    field_type: 'stack',
    component_aliases: componentAliases,
  };
}

// ---------------------------------------------------------------------------
// Model definitions
// ---------------------------------------------------------------------------

interface ModelDef {
  name: string;
  alias: string;
  type: 'component' | 'content';
  repeatable?: boolean;
  fields: Field[];
}

const ALL_BLOCK_ALIASES = [
  'hero_banner',
  'rich_text',
  'media',
  'quote',
  'value_props',
  'call_to_action',
  'product_carousel',
  'contact_form',
  'slider',
  'product_slider',
];

// -- Stack components -------------------------------------------------------

const stackComponents: ModelDef[] = [
  {
    name: 'Hero Banner',
    alias: 'hero_banner',
    type: 'component',
    fields: [
      textField('Title', 'title', true),
      textField('Subtitle', 'subtitle'),
      assetField('Image', 'image'),
      textField('CTA Text', 'cta_text'),
      textField('CTA URL', 'cta_url'),
      textField('Secondary CTA Text', 'secondary_cta_text'),
      textField('Secondary CTA URL', 'secondary_cta_url'),
    ],
  },
  {
    name: 'Rich Text',
    alias: 'rich_text',
    type: 'component',
    fields: [richTextField('Body', 'body')],
  },
  {
    name: 'Media',
    alias: 'media',
    type: 'component',
    fields: [assetField('File', 'file')],
  },
  {
    name: 'Quote',
    alias: 'quote',
    type: 'component',
    fields: [
      textField('Title', 'title'),
      textField('Body', 'body', true),
    ],
  },
  {
    name: 'Value Prop Item',
    alias: 'value_prop_item',
    type: 'component',
    fields: [
      textField('Icon', 'icon'),
      textField('Title', 'title'),
      textField('Text', 'text'),
    ],
  },
  {
    name: 'Value Props',
    alias: 'value_props',
    type: 'component',
    fields: [stackField('Items', 'items', ['value_prop_item'])],
  },
  {
    name: 'Call to Action',
    alias: 'call_to_action',
    type: 'component',
    fields: [
      textField('Title', 'title', true),
      textField('Description', 'description'),
      textField('Button Text', 'button_text', true),
      textField('Button URL', 'button_url', true),
      enumField('Variant', 'variant', ['primary', 'secondary']),
    ],
  },
  {
    name: 'Product Carousel',
    alias: 'product_carousel',
    type: 'component',
    fields: [
      textField('Title', 'title'),
      textField('Category ID', 'category_id'),
      numberField('Limit', 'limit', 8),
    ],
  },
  {
    name: 'Contact Form',
    alias: 'contact_form',
    type: 'component',
    fields: [
      textField('Title', 'title'),
      textField('Description', 'description'),
      textField('Success Message', 'success_message'),
    ],
  },
  {
    name: 'Slider',
    alias: 'slider',
    type: 'component',
    fields: [multiAssetField('Files', 'files')],
  },
  {
    name: 'Product Slider',
    alias: 'product_slider',
    type: 'component',
    fields: [
      textField('Title', 'title'),
      textField('Product IDs', 'product_ids'),
      textField('Cluster IDs', 'cluster_ids'),
    ],
  },
  {
    name: 'Nav Link',
    alias: 'nav_link',
    type: 'component',
    fields: [
      textField('Label', 'label', true),
      textField('URL', 'url', true),
      boolField('Highlight', 'highlight'),
    ],
  },
  {
    name: 'Footer Column',
    alias: 'footer_column',
    type: 'component',
    fields: [
      textField('Title', 'title'),
      stackField('Links', 'links', ['nav_link']),
    ],
  },
];

// -- Collection models ------------------------------------------------------

const collectionModels: ModelDef[] = [
  {
    name: 'Author',
    alias: 'author',
    type: 'content',
    repeatable: true,
    fields: [
      textField('Name', 'name', true),
      assetField('Avatar', 'avatar'),
      textField('Email', 'email'),
    ],
  },
  {
    name: 'Category',
    alias: 'category',
    type: 'content',
    repeatable: true,
    fields: [
      textField('Name', 'name', true),
      textField('Slug', 'slug', true),
    ],
  },
  {
    name: 'Page',
    alias: 'page',
    type: 'content',
    repeatable: true,
    fields: [
      textField('Title', 'title', true),
      textField('Slug', 'slug', true),
      textField('Description', 'description'),
      enumField('Template', 'template', ['default', 'landing-page', 'editorial']),
      stackField('Blocks', 'blocks', ALL_BLOCK_ALIASES),
    ],
  },
  {
    name: 'Article',
    alias: 'article',
    type: 'content',
    repeatable: true,
    fields: [
      textField('Title', 'title', true),
      textField('Slug', 'slug', true),
      textField('Description', 'description'),
      assetField('Cover', 'cover'),
      stackField('Blocks', 'blocks', ALL_BLOCK_ALIASES),
    ],
  },
  {
    name: 'Category Banner',
    alias: 'category_banner',
    type: 'content',
    repeatable: true,
    fields: [
      textField('Category ID', 'category_id', true),
      textField('Title', 'title'),
      textField('Subtitle', 'subtitle'),
      assetField('Image', 'image'),
      textField('CTA Text', 'cta_text'),
      textField('CTA URL', 'cta_url'),
    ],
  },
];

// -- Singleton model --------------------------------------------------------

const singletonModels: ModelDef[] = [
  {
    name: 'Global',
    alias: 'global',
    type: 'content',
    repeatable: false,
    fields: [
      textField('Site Name', 'site_name'),
      textField('Site Description', 'site_description'),
      assetField('Favicon', 'favicon'),
      assetField('Logo', 'logo'),
      textField('Logo Alt', 'logo_alt'),
      boolField('Top Bar Enabled', 'top_bar_enabled', true),
      textField('Top Bar Phone', 'top_bar_phone'),
      textField('Top Bar Announcement', 'top_bar_announcement'),
      boolField('Top Bar Announcement Enabled', 'top_bar_announcement_enabled'),
      boolField('Show VAT Toggle', 'show_vat_toggle', true),
      boolField('Show Language Switcher', 'show_language_switcher', true),
      textField('Available Languages', 'available_languages'),
      boolField('Show Search', 'show_search', true),
      boolField('Show Account', 'show_account', true),
      boolField('Show Cart', 'show_cart', true),
      boolField('Show Categories Menu', 'show_categories_menu', true),
      textField('Categories Menu Label', 'categories_menu_label'),
      stackField('Nav Links', 'nav_links', ['nav_link']),
      textField('Footer Description', 'footer_description'),
      stackField('Footer Columns', 'footer_columns', ['footer_column']),
      textField('Footer Email', 'footer_email'),
      textField('Footer Phone', 'footer_phone'),
      textField('Copyright Text', 'copyright_text'),
    ],
  },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchExistingModels(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const res = await fetch(`${API_BASE}/content_types`, { headers });

  if (!res.ok) {
    throw new Error(`Failed to fetch content types: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const items = data.items ?? data;

  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.alias) {
        map.set(item.alias, item.id);
      }
    }
  }

  return map;
}

async function createModel(
  model: ModelDef,
  existing: Map<string, string>,
): Promise<void> {
  if (existing.has(model.alias)) {
    console.log(`  [SKIP] "${model.name}" (alias: ${model.alias}) already exists`);
    return;
  }

  const body: Record<string, unknown> = {
    name: model.name,
    alias: model.alias,
    type: model.type,
    fields: model.fields,
  };

  if (model.type === 'content' && model.repeatable !== undefined) {
    body.repeatable = model.repeatable;
  }

  const res = await fetch(`${API_BASE}/content_types`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`  [FAIL] "${model.name}": ${res.status} ${res.statusText}`);
    console.error(`         ${errorBody}`);
    return;
  }

  const created = await res.json();
  existing.set(model.alias, created.id ?? model.alias);
  console.log(`  [OK]   "${model.name}" created`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Fetching existing content types...');
  const existing = await fetchExistingModels();
  console.log(`Found ${existing.size} existing model(s)\n`);

  console.log('--- Stack Components ---');
  for (const model of stackComponents) {
    await createModel(model, existing);
  }

  console.log('\n--- Collection Models ---');
  for (const model of collectionModels) {
    await createModel(model, existing);
  }

  console.log('\n--- Singleton Models ---');
  for (const model of singletonModels) {
    await createModel(model, existing);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
