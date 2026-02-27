/**
 * fix-mitosis-callbacks.mjs
 *
 * Post-compilation patcher for Mitosis-generated React and Vue output.
 *
 * PROBLEM
 * -------
 * Mitosis wraps every `on*`-prefixed prop that is passed to a child *component*
 * (not a DOM element) in a no-arg event handler:
 *
 *   React source:   onCartCreated={props.onCartCreated}
 *   React compiled: onCartCreated={(event) => props.onCartCreated()}   ← WRONG
 *
 *   Vue source:     :onCartCreated="onCartCreated"
 *   Vue compiled:   :onCartCreated="(event) => onCartCreated()"        ← WRONG
 *
 * This creates two bugs:
 *   1. The wrapper is always a real function → defeats the child's `if (prop)` guard.
 *   2. All arguments are dropped → the child receives nothing.
 *
 * SOLUTION
 * --------
 * Replace the bad wrappers with direct prop pass-throughs:
 *
 *   React: onCartCreated={(event) => props.onCartCreated()}
 *          → onCartCreated={props.onCartCreated}
 *
 *   Vue:   :onCartCreated="(event) => onCartCreated()"
 *          → :onCartCreated="onCartCreated"
 *
 * The fix is idempotent — running it multiple times is safe.
 *
 * USAGE
 *   node scripts/fix-mitosis-callbacks.mjs
 *
 * npm scripts (package.json):
 *   "mitosis:fix":   "node scripts/fix-mitosis-callbacks.mjs"
 *   "mitosis:build": "mitosis build && npm run mitosis:fix"
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

// Resolve output dirs relative to this script's location.
function resolve(rel) {
    return new URL(rel, import.meta.url).pathname
        // On Windows, url.pathname starts with /D:/... — strip the leading slash.
        .replace(/^\/([A-Z]:)/, '$1');
}

// ── patterns ─────────────────────────────────────────────────────────────────

const TARGETS = [
    {
        dir: resolve('../output/react/ui-components'),
        ext: '.tsx',
        // onFoo={(event) => props.onFoo()}  →  onFoo={props.onFoo}
        // Also handles multiline formatted output (event on one line, call on next)
        pattern: /\b(on[A-Z]\w+)=\{\s*\(event\)\s*=>\s*props\.\1\(\)\s*\}/g,
        replace: '$1={props.$1}',
        label: 'React',
    },
    {
        dir: resolve('../output/vue/ui-components'),
        ext: '.vue',
        // :onFoo="(event) => onFoo()"  →  :onFoo="onFoo"
        pattern: /:(on[A-Z]\w+)="\(event\) => \1\(\)"/g,
        replace: ':$1="$1"',
        label: 'Vue',
    },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function collectFiles(dir, ext) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return []; // directory doesn't exist yet — skip silently
    }
    const files = [];
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(full, ext));
        } else if (entry.isFile() && extname(entry.name) === ext) {
            files.push(full);
        }
    }
    return files;
}

function patchFile(filePath, pattern, replace) {
    const original = readFileSync(filePath, 'utf8');
    // Count before replacing (global regex resets lastIndex on each call)
    const fixes = (original.match(pattern) || []).length;
    if (fixes === 0) return 0;
    writeFileSync(filePath, original.replace(pattern, replace), 'utf8');
    return fixes;
}

// ── per-file targeted patches ─────────────────────────────────────────────────
//
// Use these for fixes that can't be expressed as a simple global regex across
// all files — e.g. when the correct replacement depends on local context or
// when Mitosis emits a known-bad pattern in a specific file only.
//
// Each entry:
//   file  – absolute path of the compiled file
//   from  – exact string Mitosis emits (search is a plain string.includes check)
//   to    – replacement string
//   label – description shown in console output
//
const FILE_PATCHES = [
    {
        // Mitosis compiles `state.expandedFilters = nextExp` + reads
        // `state.expandedFilters` in the same onUpdate block, which produces a
        // stale-closure bug: the captured `expandedFilters` value is from the
        // render in which the effect was last set up, not the latest render.
        //
        // If the user opens an accordion between two ProductGrid re-fetches, the
        // stale closure would overwrite the user's opened accordion back to closed.
        //
        // Fix: use the functional form  setExpandedFilters(prev => ...)  so React
        // always provides the latest state regardless of when the effect runs.
        file: resolve('../output/react/ui-components/GridFilters.tsx'),
        label: 'React → GridFilters: functional setState for accordion init (prevents stale closure)',
        from: [
            '  useEffect(() => {',
            '    const currentExp = expandedFilters as Record<string, boolean>;',
            '    const open = props.collapsed === false;',
            '    const nextExp: Record<string, boolean> = {',
            '      ...currentExp,',
            '    };',
            '    let changed = false;',
            '    ((props.filters as AttributeFilter[]) || []).forEach(',
            '      (f: AttributeFilter) => {',
            '        const n = f?.attributeDescription?.name;',
            '        if (n && nextExp[n] === undefined) {',
            '          nextExp[n] = open;',
            '          changed = true;',
            '        }',
            '      }',
            '    );',
            '    if (changed) setExpandedFilters(nextExp);',
            '  }, [props.filters]);',
        ].join('\n'),
        to: [
            '  useEffect(() => {',
            '    setExpandedFilters((prev) => {',
            '      const nextExp = { ...prev };',
            '      let changed = false;',
            '      ((props.filters as AttributeFilter[]) || []).forEach(',
            '        (f: AttributeFilter) => {',
            '          const n = f?.attributeDescription?.name;',
            '          if (n && nextExp[n] === undefined) {',
            '            nextExp[n] = props.collapsed === false;',
            '            changed = true;',
            '          }',
            '        }',
            '      );',
            '      return changed ? nextExp : prev;',
            '    });',
            '  }, [props.filters]);',
        ].join('\n'),
    },
    {
        // Mitosis emits a useEffect(fn, []) from every onMount block.
        // ProductGrid previously had an onMount that fetched products, but the
        // onUpdate([...filterDeps]) already fires on initial mount, making the
        // onMount fetch redundant — causing two API calls on every page load.
        //
        // The onMount has been removed from the source, but this patch acts as a
        // safety net in case the source is ever reverted.
        file: resolve('../output/react/ui-components/ProductGrid.tsx'),
        label: 'React → ProductGrid: remove duplicate onMount fetch (onUpdate already fires on mount)',
        from: [
            '  useEffect(() => {',
            '    // Only fetch internally when no products are provided by the parent.',
            '    if (props.products === undefined) {',
            '      fetchProducts();',
            '    }',
            '  }, []);',
            '  useEffect(() => {',
        ].join('\n'),
        to: '  useEffect(() => {',
    },
    {
        // Mitosis compiles isExpanded as `return !!(expandedFilters)[filterName]`
        // which returns `false` for any key not yet in expandedFilters (undefined).
        // This is technically correct but relies on `!!undefined === false`.
        //
        // The explicit check makes the collapsed-by-default behaviour robust:
        // if `expandedFilters[key]` is undefined (not yet initialised), defer
        // to the `collapsed` prop rather than the implicit falsy coercion.
        file: resolve('../output/react/ui-components/GridFilters.tsx'),
        label: 'React → GridFilters: isExpanded falls back to collapsed prop for uninitialised keys',
        from: [
            '  function isExpanded(',
            '    filterName: string',
            '  ): ReturnType<GridFiltersState["isExpanded"]> {',
            '    return !!(expandedFilters as Record<string, boolean>)[filterName];',
            '  }',
        ].join('\n'),
        to: [
            '  function isExpanded(',
            '    filterName: string',
            '  ): ReturnType<GridFiltersState["isExpanded"]> {',
            '    const stored = (expandedFilters as Record<string, boolean>)[filterName];',
            '    if (stored === undefined) return props.collapsed === false;',
            '    return !!stored;',
            '  }',
        ].join('\n'),
    },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function applyFilePatch(file, from, to, label) {
    let content;
    try {
        content = readFileSync(file, 'utf8');
    } catch {
        // File doesn't exist yet (first build) — skip silently.
        return 0;
    }
    if (!content.includes(from)) return 0; // already patched or pattern changed
    writeFileSync(file, content.replaceAll(from, to), 'utf8');
    console.log(`  [Patch] ✓ ${label}`);
    return 1;
}

// ── main ──────────────────────────────────────────────────────────────────────

let totalFixes = 0;

for (const { dir, ext, pattern, replace, label } of TARGETS) {
    const files = collectFiles(dir, ext);
    let targetFixes = 0;

    for (const file of files) {
        const fixes = patchFile(file, pattern, replace);
        if (fixes > 0) {
            const rel = file.replace(dir, `output/${label.toLowerCase()}/ui-components`);
            console.log(`  [${label}] ✓ ${rel} — fixed ${fixes} callback${fixes > 1 ? 's' : ''}`);
            targetFixes += fixes;
        }
    }

    if (targetFixes === 0) {
        console.log(`  [${label}] ✓ nothing to patch`);
    }

    totalFixes += targetFixes;
}

let patchFixes = 0;
for (const { file, from, to, label } of FILE_PATCHES) {
    patchFixes += applyFilePatch(file, from, to, label);
}

if (patchFixes === 0) {
    console.log('  [Patch] ✓ nothing to patch');
}

totalFixes += patchFixes;

if (totalFixes > 0) {
    console.log(`\n  fix-mitosis-callbacks: ${totalFixes} total fix${totalFixes > 1 ? 'es' : ''} applied`);
}
