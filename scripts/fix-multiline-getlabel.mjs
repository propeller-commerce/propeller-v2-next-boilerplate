/**
 * Pass 5: Fix multi-line getLabel('key',\n'fallback') calls → getLabel(props.labels, 'key', 'fallback')
 * These span 3+ lines so were missed by single-line regex in pass 2.
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

  // Multi-line: getLabel(\n  whitespace 'key',\n  whitespace 'fallback'\n  whitespace)
  // Replace with single-line: getLabel(props.labels, 'key', 'fallback')
  src = src.replace(
    /\bgetLabel\(\s*\n\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),\s*\n\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\n\s*\)/g,
    'getLabel(props.labels, $1, $2)'
  );

  if (src !== original) {
    const output = hasCRLF ? src.replace(/\n/g, '\r\n') : src;
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✓ ${file}`);
    totalModified++;
  }
}

console.log(`\nDone. Modified ${totalModified}/${files.length} files.`);
