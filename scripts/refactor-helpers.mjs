/**
 * Refactors all components/propeller/*.tsx files to use shared helper utilities.
 *
 * Replaces:
 * - inline getLabel definitions → import from lib/helpers/labelHelpers
 * - inline formatPrice / euro template literals → import from lib/helpers/priceHelpers + config
 * - inline getProductImageUrl / getClusterImageUrl → import from lib/helpers/productHelpers
 * - inline getProductSku / getClusterSku → import from lib/helpers/productHelpers
 * - inline getLocalizedValue / getProductName → import from lib/helpers/productHelpers
 * - inline isContentHidden → import from lib/helpers/visibilityHelpers
 * - inline getStockStatus (only if using hardcoded Tailwind colors) → import from lib/helpers/inventoryHelpers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = path.resolve(__dirname, '../components/propeller');
const files = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.tsx'));

let totalModified = 0;

for (const file of files) {
  const filePath = path.join(COMPONENTS_DIR, file);
  // Normalize CRLF → LF for processing, restore at end
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const hasCRLF = rawContent.includes('\r\n');
  let src = rawContent.replace(/\r\n/g, '\n');
  const original = src;

  // Track what helpers are actually used after replacement
  let needsLabelHelper = false;
  let needsPriceHelper = false;
  let needsConfigImport = false;
  let needsProductHelpers = new Set();
  let needsVisibilityHelper = false;
  let needsInventoryHelper = false;

  // -------------------------------------------------------------------------
  // 1. getLabel inline definition → wrapper that calls shared helper
  // -------------------------------------------------------------------------
  // Pattern: function getLabel(key: string, fallback: string): string {
  //   return (props.labels as Record<string, string>)?.[key] || fallback;
  // }
  // OR simpler variants
  const getLabelPattern = /function getLabel\(key: string,\s*fallback: string\): string \{\s*return \(props\.labels as Record<string,\s*string>\)\?\.\[key\] \|\| fallback;\s*\}/g;
  if (getLabelPattern.test(src)) {
    src = src.replace(
      /function getLabel\(key: string,\s*fallback: string\): string \{\s*return \(props\.labels as Record<string,\s*string>\)\?\.\[key\] \|\| fallback;\s*\}/g,
      ''
    );
    needsLabelHelper = true;
  }

  // Also replace: return (props.labels as Record<string, string>)?.[key] || fallback;
  // inside a getLabel function that may have slightly different whitespace
  const getLabelAlt = /function getLabel\(key: string, fallback: string\): string \{[^}]*return[^}]*props\.labels[^}]*\}/gs;
  if (getLabelAlt.test(src)) {
    src = src.replace(getLabelAlt, '');
    needsLabelHelper = true;
  }

  // If getLabel is called in the file, we need the helper
  if (src.includes('getLabel(') && !src.includes('import { getLabel') && !src.includes("from '@/lib/helpers/labelHelpers'")) {
    needsLabelHelper = true;
  }

  // -------------------------------------------------------------------------
  // 2. formatPrice inline / euro template literals
  // -------------------------------------------------------------------------
  // Pattern: `€${Number(x).toFixed(2)}` or `€${Number(x).toFixed(2)}`
  // Replace with formatPrice(x, config.currency)
  const euroPricePattern = /`[€€]\$\{Number\(([^)]+)\)\.toFixed\(2\)\}`/g;
  if (euroPricePattern.test(src)) {
    src = src.replace(
      /`[€€]\$\{Number\(([^)]+)\)\.toFixed\(2\)\}`/g,
      'formatPrice($1, config.currency)'
    );
    needsPriceHelper = true;
    needsConfigImport = true;
  }

  // Pattern: '€' + Number(x).toFixed(2)  or  '€' + Number(x).toFixed(2)
  const euroStringConcat = /'[€€]'\s*\+\s*Number\(([^)]+)\)\.toFixed\(2\)/g;
  if (euroStringConcat.test(src)) {
    src = src.replace(
      /'[€€]'\s*\+\s*Number\(([^)]+)\)\.toFixed\(2\)/g,
      'formatPrice($1, config.currency)'
    );
    needsPriceHelper = true;
    needsConfigImport = true;
  }

  // Pattern: '€' + ((...).toFixed(2) || '0.00')  used in child items
  const euroChildPattern = /'[€€]'\s*\+\s*\(\(([^)]+)\)(\?\.toFixed\(2\)|\s*\?\s*[^:]+:\s*['"]\d+\.\d+['"])\)/g;
  if (euroChildPattern.test(src)) {
    // Leave these complex patterns for manual handling – too risky to auto-replace
  }

  // -------------------------------------------------------------------------
  // 3. getProductImageUrl / getClusterImageUrl inline
  // -------------------------------------------------------------------------
  // Pattern: product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || ''
  if (src.includes("?.media?.images?.items?.[0]?.imageVariants?.[0]?.url")) {
    // Replace direct inline usage (not inside existing helper functions)
    // We'll add imports; actual function calls remain since we're adding the shared ones
  }

  // If already using _getProductImageUrl wrapper, we can clean up
  // (AddToCart already has this from previous session)

  // -------------------------------------------------------------------------
  // 4. isContentHidden inline
  // -------------------------------------------------------------------------
  // Pattern: (props.portalMode as string) === 'semi-closed' && !props.user
  //       or: portalMode === 'semi-closed' && !user
  const isHiddenInline = /\(props\.portalMode(?:\s+as\s+string)?\)\s*===\s*['"]semi-closed['"]\s*&&\s*!props\.user/g;
  if (isHiddenInline.test(src)) {
    src = src.replace(
      /\(props\.portalMode(?:\s+as\s+string)?\)\s*===\s*['"]semi-closed['"]\s*&&\s*!props\.user/g,
      'isContentHidden(props.portalMode as string | undefined, props.user)'
    );
    needsVisibilityHelper = true;
  }

  // Pattern without cast:  props.portalMode === 'semi-closed' && !props.user
  const isHiddenNoCast = /props\.portalMode\s*===\s*['"]semi-closed['"]\s*&&\s*!props\.user/g;
  if (isHiddenNoCast.test(src)) {
    src = src.replace(
      /props\.portalMode\s*===\s*['"]semi-closed['"]\s*&&\s*!props\.user/g,
      'isContentHidden(props.portalMode as string | undefined, props.user)'
    );
    needsVisibilityHelper = true;
  }

  // -------------------------------------------------------------------------
  // 5. getStockStatus inline (only the hardcoded-color variant)
  // -------------------------------------------------------------------------
  // Pattern: function getStockStatus(quantity: number) with text-red-600 etc.
  const stockStatusPattern = /function getStockStatus\([^)]*\)[^{]*\{[^}]*text-red-600[^}]*\}/gs;
  if (stockStatusPattern.test(src)) {
    src = src.replace(stockStatusPattern, '');
    needsInventoryHelper = true;
  }

  // -------------------------------------------------------------------------
  // 6. Inject missing imports
  // -------------------------------------------------------------------------
  // Find the last existing import line to insert after
  const importLines = src.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].startsWith('import ')) lastImportIdx = i;
  }

  const importsToAdd = [];

  if (needsLabelHelper && !src.includes("from '@/lib/helpers/labelHelpers'")) {
    importsToAdd.push("import { getLabel } from '@/lib/helpers/labelHelpers';");
  }
  if (needsPriceHelper && !src.includes("from '@/lib/helpers/priceHelpers'")) {
    importsToAdd.push("import { formatPrice } from '@/lib/helpers/priceHelpers';");
  }
  if (needsConfigImport && !src.includes("from '@/data/config'")) {
    importsToAdd.push("import { config } from '@/data/config';");
  }
  if (needsVisibilityHelper && !src.includes("from '@/lib/helpers/visibilityHelpers'")) {
    importsToAdd.push("import { isContentHidden } from '@/lib/helpers/visibilityHelpers';");
  }
  if (needsInventoryHelper && !src.includes("from '@/lib/helpers/inventoryHelpers'")) {
    importsToAdd.push("import { getStockStatus } from '@/lib/helpers/inventoryHelpers';");
  }

  if (importsToAdd.length > 0 && lastImportIdx >= 0) {
    importLines.splice(lastImportIdx + 1, 0, ...importsToAdd);
    src = importLines.join('\n');
  }

  // -------------------------------------------------------------------------
  // 7. Clean up the partial AddToCart state from previous session
  //    (it has _getLabel, _getProductImageUrl etc. as aliases)
  // -------------------------------------------------------------------------
  if (file === 'AddToCart.tsx') {
    // Remove the aliased import lines added in previous session
    src = src.replace(/import \{ getLabel as _getLabel,\s*\} from '@\/lib\/helpers\/labelHelpers';\n/g, '');
    src = src.replace(/import \{ getProductImageUrl as _getProductImageUrl, getProductSku as _getProductSku, getLocalizedValue \} from '@\/lib\/helpers\/productHelpers';\n/g, '');
    src = src.replace(/import \{ formatPrice \} from '@\/lib\/helpers\/priceHelpers';\n/g, '');

    // Remove the wrapper functions that used _getLabel / _getProductImageUrl etc.
    src = src.replace(
      /  function getLabel\(key: string, fallback: string\): string \{\n    return _getLabel\(props\.labels as Record<string, string>, key, fallback\);\n  \}\n/g,
      ''
    );
    src = src.replace(
      /  function getProductName\(\): string \{\n    return getLocalizedValue\(\(props\.product as Product\)\?\.names, props\.language as string, 'Product'\);\n  \}\n/g,
      ''
    );
    src = src.replace(
      /  function getProductImageUrl\(\): string \{\n    return _getProductImageUrl\(props\.product as Product\);\n  \}\n/g,
      ''
    );
    src = src.replace(
      /  function getProductSku\(\): string \{\n    return _getProductSku\(props\.product as Product\);\n  \}\n/g,
      ''
    );
    src = src.replace(
      /  function getProductPrice\(\): string \{\n    const price =\n      props\.price !== undefined \? props\.price : \(props\.product as Product\)\?\.price\?\.gross;\n    if \(!price && price !== 0\) return '';\n    return `\\u20AC\$\{Number\(price\)\.toFixed\(2\)\}`;\n  \}\n/g,
      ''
    );

    // Now add the canonical imports
    if (!src.includes("from '@/lib/helpers/labelHelpers'")) {
      src = src.replace(
        /import \{ useCart \} from '@\/composables\/react\/useCart';\n/,
        "import { useCart } from '@/composables/react/useCart';\nimport { getLabel } from '@/lib/helpers/labelHelpers';\nimport { getProductImageUrl, getProductSku, getLocalizedValue } from '@/lib/helpers/productHelpers';\nimport { formatPrice } from '@/lib/helpers/priceHelpers';\nimport { config } from '@/data/config';\n"
      );
    }

    // Replace getLabel('key', 'fallback') → getLabel(props.labels, 'key', 'fallback')
    src = src.replace(
      /\bgetLabel\((['"][^'"]+['"]),\s*(['"][^'"]+['"]\))/g,
      'getLabel(props.labels, $1, $2'
    );

    // Replace getProductName() → getLocalizedValue(props.product?.names, props.language, 'Product')
    src = src.replace(/\bgetProductName\(\)/g, "getLocalizedValue((props.product as Product)?.names, props.language as string, 'Product')");

    // Replace getProductImageUrl() → getProductImageUrl(props.product as Product)
    // but avoid replacing the import line
    src = src.replace(/(?<!['"@/])(?<!\w)getProductImageUrl\(\)/g, 'getProductImageUrl(props.product as Product)');

    // Replace getProductSku() → getProductSku(props.product as Product)
    src = src.replace(/(?<!\w)getProductSku\(\)/g, 'getProductSku(props.product as Product)');

    // Replace getProductPrice() → formatPrice(props.price ?? (props.product as Product)?.price?.gross, config.currency)
    src = src.replace(
      /\bgetProductPrice\(\)/g,
      'formatPrice(props.price !== undefined ? props.price : (props.product as Product)?.price?.gross, config.currency)'
    );

    // Replace getModalPrice() internal: '€' + Number(price).toFixed(2)
    src = src.replace(
      /return '\\u20AC' \+ Number\(price\)\.toFixed\(2\);/g,
      'return formatPrice(price, config.currency);'
    );

    // Replace child item price in modal
    src = src.replace(
      /'€' \+\s*\(\(\(props\.includeTax !== undefined \? !!props\.includeTax : includeTax\)\s*\? child\.totalSumNet\s*: child\.totalSum\s*\)\?\.\btoFixed\(2\) \|\| '0\.00'\)/g,
      "formatPrice((props.includeTax !== undefined ? !!props.includeTax : includeTax) ? child.totalSumNet : child.totalSum, config.currency)"
    );
  }

  // -------------------------------------------------------------------------
  // Write back if changed
  // -------------------------------------------------------------------------
  if (src !== original) {
    // Restore line endings
    const output = hasCRLF ? src.replace(/\n/g, '\r\n') : src;
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✓ ${file}`);
    totalModified++;
  }
}

console.log(`\nDone. Modified ${totalModified}/${files.length} files.`);
