/**
 * fix-state-getters.mjs
 *
 * For Mitosis .lite.tsx files, the compiled React output generates:
 *   function xxx(): ReturnType<XxxState["xxx"]> { ... }
 * for every `get xxx()` in the useStore() implementation.
 *
 * This requires `XxxState["xxx"]` to be a function type (e.g. `() => string`).
 * But interface declarations often use plain property types (e.g. `xxx: string`),
 * causing `ReturnType<string>` to fail at build time.
 *
 * This script:
 * 1. Finds every getter name in the useStore({}) block
 * 2. Looks up that name in the interface declaration
 * 3. If the interface has `name: T` (not `name: () => T`), converts it to `name: () => T`
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

function resolve(rel) {
    return new URL(rel, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
}

function collectFiles(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
    const files = [];
    for (const e of entries) {
        const full = join(dir, e.name);
        if (e.isDirectory()) files.push(...collectFiles(full));
        else if (e.isFile() && extname(e.name) === '.tsx') files.push(full);
    }
    return files;
}

const dir = resolve('../ui-components');
const files = collectFiles(dir).filter(f => f.endsWith('.lite.tsx'));

let totalFixed = 0;

for (const file of files) {
    let content = readFileSync(file, 'utf8');

    // Find all getter names in useStore({ ... })
    // Match: `get name()` or `get name(): T`  (implementation, ends with `{`)
    const getterNames = new Set();
    for (const m of content.matchAll(/^\s+get (\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/gm)) {
        getterNames.add(m[1]);
    }

    if (getterNames.size === 0) continue;

    let updated = content;
    let fileFixed = 0;

    for (const name of getterNames) {
        // Match interface property: `    name: SomeType;` (NOT already `name: () =>`)
        // Must NOT already be a function type
        const propRe = new RegExp(
            `^(\\s+)(${name})(\\s*:\\s*)(?!\\(\\)\\s*=>)([^;({\\n]+);`,
            'gm'
        );
        const before = updated;
        updated = updated.replace(propRe, (_, indent, n, colon, type) => {
            return `${indent}${n}${colon}() => ${type.trim()};`;
        });
        if (updated !== before) fileFixed++;
    }

    if (fileFixed > 0) {
        writeFileSync(file, updated, 'utf8');
        const rel = file.replace(/.*ui-components[/\\]/, 'ui-components/');
        console.log(`  Fixed ${fileFixed} getter(s) in ${rel}`);
        totalFixed += fileFixed;
    }
}

console.log(`\nTotal: ${totalFixed} interface properties updated to () => T`);
