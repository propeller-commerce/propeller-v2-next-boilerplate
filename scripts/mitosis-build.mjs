/**
 * mitosis-build.mjs
 *
 * Wrapper for `mitosis build` that temporarily includes `ui-components`
 * in tsconfig.json so Mitosis (ts-morph) can parse source files.
 *
 * Restores tsconfig.json to its original state after the build.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const tsconfigPath = new URL('../tsconfig.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const original = readFileSync(tsconfigPath, 'utf8');

// Remove ui-components from exclude so ts-morph can find source files
const modified = original.replace(
    /"ui-components",?\s*/g,
    ''
);

try {
    writeFileSync(tsconfigPath, modified, 'utf8');
    execSync('npx mitosis build', { stdio: 'inherit' });
} finally {
    // Always restore the original tsconfig
    writeFileSync(tsconfigPath, original, 'utf8');
}
