/**
 * Pass 4: Fix special-case components
 *
 * 1. GridPagination, GridToolbar, PriceToggle — have local getLabel with different signature.
 *    Remove the unused import from labelHelpers.
 *
 * 2. AddToFavorite, FavoriteLists, ProductBulkPrices, ProductBundles, ProductSlider —
 *    have 2-arg local getLabel with different body. Remove the local definition, calls
 *    already updated to 3-arg form by pass 2.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.resolve(__dirname, '../components/propeller');

function processFile(file, processor) {
  const filePath = path.join(COMPONENTS_DIR, file);
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const hasCRLF = rawContent.includes('\r\n');
  let src = rawContent.replace(/\r\n/g, '\n');
  const original = src;
  src = processor(src);
  if (src !== original) {
    const output = hasCRLF ? src.replace(/\n/g, '\r\n') : src;
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✓ ${file}`);
    return true;
  }
  return false;
}

// Group 1: Remove unused labelHelpers import (local getLabel shadows it)
for (const file of ['GridPagination.tsx', 'GridToolbar.tsx', 'PriceToggle.tsx']) {
  processFile(file, src =>
    src.replace(/import \{ getLabel \} from '@\/lib\/helpers\/labelHelpers';\n/g, '')
  );
}

// Group 2: Remove local getLabel with different body patterns
// These components have: val !== undefined ? val : fallback  or  labels?.[key] || fallback
const group2 = [
  'AddToFavorite.tsx',
  'FavoriteLists.tsx',
  'ProductBulkPrices.tsx',
  'ProductBundles.tsx',
  'ProductSlider.tsx',
];

for (const file of group2) {
  processFile(file, src => {
    // Remove variants like:
    //   function getLabel(key: string, fallback: string): string {\n    const labels = ...\n    return ...;\n  }
    //   function getLabel(key: string, fallback: string): ReturnType<...> {\n    const val = ...\n    return ...\n  }
    src = src.replace(
      /\n  function getLabel\(key: string, fallback: string\): (?:string|ReturnType<[^>]+>) \{\n(?:[^\n]*\n){1,3}\s*\}/g,
      ''
    );
    return src;
  });
}

console.log('Done.');
