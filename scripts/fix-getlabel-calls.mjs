/**
 * Pass 2: Fix all getLabel(key, fallback) call sites → getLabel(props.labels, key, fallback)
 * in components that now import from labelHelpers.
 *
 * Also fixes bad import injection: if an import was inserted inside a multi-line import { block,
 * move it to after the closing } from '...'; line.
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
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const hasCRLF = rawContent.includes('\r\n');
  let src = rawContent.replace(/\r\n/g, '\n');
  const original = src;

  // Only process files that import getLabel from labelHelpers
  if (!src.includes("from '@/lib/helpers/labelHelpers'")) continue;

  // -----------------------------------------------------------------------
  // Fix 1: Bad import injection inside multi-line import { block
  // Pattern: import {\nimport { getLabel } from '...';\n  SomeType,
  // -----------------------------------------------------------------------
  if (src.match(/^import \{\nimport \{ getLabel \} from '@\/lib\/helpers\/labelHelpers';\n/m)) {
    src = src.replace(
      /^(import \{)\nimport \{ getLabel \} from '@\/lib\/helpers\/labelHelpers';\n/m,
      '$1\n'
    );
    // Now ensure the labelHelpers import is somewhere after the block
    // It should already be present from the original injection — just misplaced
    // Find the closing of the propeller-sdk-v2 import and ensure our import is after it
    if (!src.match(/\} from 'propeller-sdk-v2';\nimport \{ getLabel \}/)) {
      // Move the import to right after the } from 'propeller-sdk-v2'; line
      // Remove any existing placement
      src = src.replace(/\nimport \{ getLabel \} from '@\/lib\/helpers\/labelHelpers';/g, '');
      src = src.replace(
        /(\} from 'propeller-sdk-v2';)/,
        "$1\nimport { getLabel } from '@/lib/helpers/labelHelpers';"
      );
    }
  }

  // -----------------------------------------------------------------------
  // Fix 2: Update getLabel('key', 'fallback') → getLabel(props.labels, 'key', 'fallback')
  // Must only match 2-arg calls (not calls that already have props.labels as first arg)
  // Pattern: getLabel followed by ( then a string literal as first arg (not props.)
  // -----------------------------------------------------------------------
  // Replace: getLabel('...', '...')  →  getLabel(props.labels, '...', '...')
  // Use a regex that matches getLabel( followed by a quote (not 'props.')
  src = src.replace(
    /\bgetLabel\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\)/g,
    'getLabel(props.labels, $1, $2)'
  );

  // Also handle template literals as second arg (rare but possible):
  // getLabel('key', `fallback`)
  src = src.replace(
    /\bgetLabel\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),\s*(`[^`]*`)\)/g,
    'getLabel(props.labels, $1, $2)'
  );

  // -----------------------------------------------------------------------
  // Write back if changed
  // -----------------------------------------------------------------------
  if (src !== original) {
    const output = hasCRLF ? src.replace(/\n/g, '\r\n') : src;
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✓ ${file}`);
    totalModified++;
  }
}

console.log(`\nDone. Modified ${totalModified}/${files.length} files.`);
