/**
 * revert-source-interfaces.mjs
 *
 * Reverts getter interface types in Mitosis .lite.tsx source files.
 *
 * PROBLEM
 * -------
 * When we run fix-state-getters.mjs, it changes:
 *   `xxx: T;`  →  `xxx: () => T;`
 * in state interfaces to make the compiled React output type-check.
 *
 * But this creates TypeScript errors IN the source .lite.tsx files because:
 *   1. `get xxx() { return val; }` returns T, not () => T
 *   2. `state.xxx` in JSX is used as T, not as a function call
 *
 * SOLUTION
 * --------
 * Revert getter interface types back to plain types in source files.
 * The compiled output interface is fixed separately by fix-mitosis-callbacks.mjs.
 *
 * Only reverts properties that have corresponding `get xxx()` getter implementations.
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

    // Find all getter names in useStore({ ... }) implementation blocks
    // Match: `get name()` or `get name(): T` ending with `{` (not `;`)
    const getterNames = new Set();
    for (const m of content.matchAll(/^\s+get (\w+)\s*\([^)]*\)\s*(?::\s*[^{;]+)?\s*\{/gm)) {
        getterNames.add(m[1]);
    }

    if (getterNames.size === 0) continue;

    let updated = content;
    let fileFixed = 0;

    for (const name of getterNames) {
        // Match interface property: `    name: () => T;` (function type)
        // Revert to: `    name: T;`
        const propRe = new RegExp(
            `^(\\s+)(${name})(\\s*:\\s*)\\(\\)\\s*=>\\s*([^;\\n]+);`,
            'gm'
        );
        const before = updated;
        updated = updated.replace(propRe, (_, indent, n, colon, type) => {
            return `${indent}${n}${colon}${type.trim()};`;
        });
        if (updated !== before) fileFixed++;
    }

    if (fileFixed > 0) {
        writeFileSync(file, updated, 'utf8');
        const rel = file.replace(/.*ui-components[/\\]/, 'ui-components/');
        console.log(`  Reverted ${fileFixed} getter type(s) in ${rel}`);
        totalFixed += fileFixed;
    }
}

console.log(`\nTotal: ${totalFixed} interface properties reverted to plain types`);
