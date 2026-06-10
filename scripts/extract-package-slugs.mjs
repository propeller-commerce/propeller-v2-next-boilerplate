#!/usr/bin/env node
// Extract translatable slugs from both Propeller UI packages.
// Usage: node scripts/extract-package-slugs.mjs <output-dir>
//   e.g. node scripts/extract-package-slugs.mjs ./locales/en

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseArgs } from 'node:util';

const REACT_PKG = 'c:/workspace/propeller-v2-react-ui-gitlab/src/components';
const VUE_PKG = 'c:/workspace/propeller-v2-vue-ui-gitlab/src/components';

const { positionals } = parseArgs({ allowPositionals: true });
const outDir = positionals[0];
if (!outDir) {
  console.error('Usage: node extract-package-slugs.mjs <output-dir>');
  process.exit(1);
}

// Match getLabel(anything, 'key', 'fallback') — captures key + fallback.
// Tolerant of whitespace, single vs double quotes. Allows escaped quotes in the fallback.
const RE_GETLABEL = /getLabel\s*\([^,]+,\s*['"]([^'"]+)['"]\s*,\s*['"]((?:[^'"\\]|\\.)*)['"]\s*\)/g;
// Match props.labels?.key || 'fallback' — React variant pattern.
const RE_FALLBACK = /(?:props\.)?labels\?\.(\w+)\s*\|\|\s*['"]((?:[^'"\\]|\\.)*)['"]/g;

function extractFromFile(path) {
  const src = readFileSync(path, 'utf8');
  // Regex is single-line — line-wrapped getLabel(...) calls slip through.
  // In practice this misses ~0–2 slugs per package; subagents add any gap
  // to the JSON when they migrate the call site. Don't try to be clever.
  const slugs = {};
  for (const re of [RE_GETLABEL, RE_FALLBACK]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const [, key, fallback] = m;
      // Un-escape backslash sequences (mainly \' inside single-quoted strings)
      const value = fallback.replace(/\\(.)/g, '$1');
      // If a slug appears multiple times with different fallbacks, keep the first.
      if (!(key in slugs)) slugs[key] = value;
    }
  }
  return slugs;
}

function namespaceFromFile(path) {
  return basename(path).replace(/\.(tsx|vue)$/, '');
}

function listComponentFiles(dir, ext) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => join(dir, f));
}

const allSlugs = {}; // namespace → { key → value }

for (const path of listComponentFiles(REACT_PKG, '.tsx')) {
  const ns = namespaceFromFile(path);
  const slugs = extractFromFile(path);
  if (Object.keys(slugs).length > 0) allSlugs[ns] = { ...(allSlugs[ns] || {}), ...slugs };
}

for (const path of listComponentFiles(VUE_PKG, '.vue')) {
  const ns = namespaceFromFile(path);
  const slugs = extractFromFile(path);
  if (Object.keys(slugs).length > 0) allSlugs[ns] = { ...(allSlugs[ns] || {}), ...slugs };
}

mkdirSync(outDir, { recursive: true });

let totalNamespaces = 0;
let totalSlugs = 0;
for (const [ns, slugs] of Object.entries(allSlugs).sort()) {
  const sorted = Object.fromEntries(Object.entries(slugs).sort());
  const outPath = join(outDir, `${ns}.json`);
  writeFileSync(outPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  totalNamespaces++;
  totalSlugs += Object.keys(sorted).length;
}

console.log(`Wrote ${totalNamespaces} namespaces / ${totalSlugs} slugs to ${outDir}`);
