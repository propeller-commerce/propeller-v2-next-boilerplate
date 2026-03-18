import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

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

const dir = 'd:/laragon/www/propeller-next/ui-components';
const files = collectFiles(dir).filter(f => f.endsWith('.lite.tsx'));
let totalFixed = 0;

for (const file of files) {
    let content = readFileSync(file, 'utf8');
    const getterNames = new Set();
    for (const m of content.matchAll(/^\s+get (\w+)\s*\([^)]*\)\s*(?::\s*[^{;]+)?\s*\{/gm)) {
        getterNames.add(m[1]);
    }
    if (getterNames.size === 0) continue;

    let updated = content;
    let fileFixed = 0;

    for (const name of getterNames) {
        // Match: `    name: () => SomeType;` → `    name: SomeType;`
        const before = updated;
        updated = updated.replace(
            new RegExp(`^([ \\t]+)(${name})([ \\t]*:[ \\t]*)\\(\\)[ \\t]*=>[ \\t]*([^;\\r\\n]+);`, 'gm'),
            (_, indent, n, colon, type) => `${indent}${n}${colon}${type.trim()};`
        );
        if (updated !== before) fileFixed++;
    }

    if (fileFixed > 0) {
        writeFileSync(file, updated, 'utf8');
        const rel = file.replace('d:/laragon/www/propeller-next/ui-components/', 'ui-components/');
        console.log(`  Reverted ${fileFixed} getter type(s) in ${rel}`);
        totalFixed += fileFixed;
    }
}
console.log(`\nTotal: ${totalFixed} interface properties reverted to plain types`);
