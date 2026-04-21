/**
 * Pass 3: Remove local `function getLabel(...)` definitions from components
 * that already import getLabel from labelHelpers.
 *
 * Handles all variants:
 * 1. Single-line: function getLabel(key: string, fallback: string): string { return ...; }
 * 2. Multi-line with ReturnType annotation spanning 4-6 lines
 * 3. Variants that reference getLabel in the State interface (leave those — just a type sig)
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
  // Remove local function getLabel definitions (all variants)
  // Matches:
  //   function getLabel(\n    key: string,\n    fallback: string\n  ): ReturnType<...> {\n    return ...;\n  }
  //   function getLabel(key: string, fallback: string): string {\n    return ...;\n  }
  //   function getLabel(key: string, fallback: string): ReturnType<...> {\n    return ...;\n  }
  // -----------------------------------------------------------------------

  // Multi-line variant with ReturnType
  src = src.replace(
    /\n  function getLabel\(\s*\n?\s*key: string,\s*\n?\s*fallback: string\s*\n?\s*\): ReturnType<[^>]+>\s*\{\s*\n\s*return [^\n]+;\s*\n\s*\}/g,
    ''
  );

  // Single-line variant
  src = src.replace(
    /\n  function getLabel\(key: string,\s*fallback: string\): string \{\s*\n\s*return [^\n]+;\s*\n\s*\}/g,
    ''
  );

  // Compact single-line
  src = src.replace(
    /\n  function getLabel\(key: string, fallback: string\): string \{ return [^\n]+; \}/g,
    ''
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
