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
        // On Windows, url.pathname starts with /C:/... — strip the leading slash.
        .replace(/^\/([A-Za-z]:)/, '$1');
}

// ── mid-file import hoisting ─────────────────────────────────────────────────
//
// Mitosis places `import` statements in the middle of compiled files — after
// interface/type declarations. Turbopack (Next.js bundler) requires all imports
// at the top of the module, otherwise it errors with:
//   "Expected export to be in eval context 'default'"
//
// This fix scans every compiled React file, extracts any import statements that
// appear after the first non-import code, and moves them to the top (right after
// the existing top-level imports).

function hoistImports(dir) {
    const files = collectFiles(dir, '.tsx');
    let totalFixed = 0;

    for (const file of files) {
        let content = readFileSync(file, 'utf8');

        // Pre-process: Mitosis sometimes places import statements mid-line
        // (e.g. `} import { Foo } from 'bar'; function Baz(`).
        // Split these onto their own lines so the line-by-line hoist logic
        // can detect them.
        content = content.replace(
            /(?<=\S[;\s}])\s*(import\s+(?:\{[^}]*\}|[^\s]+)\s+from\s+['"][^'"]+['"]\s*;)/g,
            '\n$1\n'
        );

        const lines = content.split('\n');

        // Find where the top import block ends (first line that is not an import,
        // empty line, 'use client', or comment after we've seen at least one import)
        let lastTopImportIdx = -1;
        let seenImport = false;
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('import ') || trimmed.startsWith('import\t')) {
                seenImport = true;
                lastTopImportIdx = i;
            } else if (seenImport && trimmed !== '' && !trimmed.startsWith("'use client'") && !trimmed.startsWith('"use client"') && !trimmed.startsWith('//')) {
                break;
            }
        }

        // Now find any import statements below lastTopImportIdx
        const midImports = [];
        const cleanedLines = [];
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (i > lastTopImportIdx && (trimmed.startsWith('import ') || trimmed.startsWith('import\t'))) {
                midImports.push(lines[i]);
            } else {
                cleanedLines.push(lines[i]);
            }
        }

        if (midImports.length === 0) continue;

        // Insert mid-file imports right after lastTopImportIdx
        const result = [];
        for (let i = 0; i < cleanedLines.length; i++) {
            result.push(cleanedLines[i]);
            // After the last top-level import, insert the hoisted imports
            if (i === lastTopImportIdx) {
                for (const imp of midImports) {
                    result.push(imp);
                }
            }
        }

        writeFileSync(file, result.join('\n'), 'utf8');
        const rel = file.replace(/.*[/\\]output[/\\]/, 'output/');
        console.log(`  [Import hoist] ✓ ${rel} — moved ${midImports.length} import${midImports.length > 1 ? 's' : ''} to top`);
        totalFixed += midImports.length;
    }

    return totalFixed;
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
        dir: resolve('../output/react/ui-components'),
        ext: '.tsx',
        // Mitosis strips grouping parens from `(expr || []).map(...)` producing
        // `expr || []?.map(...)`. Due to operator precedence, when expr is truthy
        // it returns the array itself rather than the mapped result, causing React
        // to throw "Objects are not valid as a React child".
        // Fix: restore the grouping parens.
        // Use [\w.]+ (identifier + dots) to avoid greedily matching JSX text.
        pattern: /([\w.]+) \|\| \[\]\?\.map\(/g,
        replace: '($1 || []).map(',
        label: 'React || []?.map fix',
    },
    {
        dir: resolve('../output/react/ui-components'),
        ext: '.tsx',
        // Mitosis bug: dangerouslySetInnerHTML={{ __html: value; }} emits a
        // trailing semicolon inside the object literal, which is invalid syntax.
        // Strip it: `__html: value;` → `__html: value`
        pattern: /(__html:\s*[^}]+?);(\s*\}\})/g,
        replace: '$1$2',
        label: 'React __html fix',
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
        // Also add `selectedFilters` to the dep array so the collapse-with-no-
        // selections logic always sees the latest selection state.
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
            '    const sel = selectedFilters as Record<string, string[]>;',
            '    Object.keys(nextExp).forEach((k: string) => {',
            '      if (nextExp[k] && !(sel[k] || []).length) {',
            '        nextExp[k] = false;',
            '        changed = true;',
            '      }',
            '    });',
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
            '      // Collapse any filter section that has no active selections.',
            '      const sel = selectedFilters as Record<string, string[]>;',
            '      Object.keys(nextExp).forEach((k: string) => {',
            '        if (nextExp[k] && !(sel[k] || []).length) {',
            '          nextExp[k] = false;',
            '          changed = true;',
            '        }',
            '      });',
            '      return changed ? nextExp : prev;',
            '    });',
            '    // eslint-disable-next-line react-hooks/exhaustive-deps',
            '  }, [props.filters, selectedFilters]);',
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
        // Mitosis compiles onUpdate() to useEffect() but has no concept of a
        // ref-based fetch dedup guard.  Without this patch the effect can fire
        // more than once with identical dep values (e.g. when the parent
        // re-renders after a searchParams object-reference change that carries
        // the same URL content, or after any context update that doesn't
        // actually change a query-relevant prop).
        //
        // Fix: add `lastFetchDepsRef` and serialise all query deps to a JSON
        // key; skip the fetch when the key matches the previous call.
        file: resolve('../output/react/ui-components/ProductGrid.tsx'),
        label: 'React → ProductGrid: add useRef import for lastFetchDepsRef dedup guard',
        from: "import { useState, useEffect } from 'react';",
        to: "import { useState, useEffect, useRef } from 'react';",
    },
    {
        file: resolve('../output/react/ui-components/ProductGrid.tsx'),
        label: 'React → ProductGrid: add lastFetchDepsRef dedup guard to prevent duplicate fetches',
        from: [
            '  useEffect(() => {',
            '    if (props.products === undefined) {',
            '      if (props.page !== undefined) {',
            '        setCurrentPage(props.page as number);',
            '      }',
            '      fetchProducts();',
            '    }',
            '  }, [',
            '    props.textFilters,',
            '    props.priceFilterMin,',
            '    props.priceFilterMax,',
            '    props.categoryId,',
            '    props.term,',
            '    props.brand,',
            '    props.sortField,',
            '    props.sortOrder,',
            '    props.pageSize,',
            '    props.language,',
            '    props.page,',
            '  ]);',
        ].join('\n'),
        to: [
            '  // Tracks the serialised dep values of the last fetch that was actually started.',
            '  // Prevents duplicate API calls when React fires this effect more than once with',
            '  // identical prop values (e.g. after a parent re-render with an unchanged URL).',
            "  const lastFetchDepsRef = useRef<string>('');",
            '',
            '  useEffect(() => {',
            '    if (props.products === undefined) {',
            '      if (props.page !== undefined) {',
            '        setCurrentPage(props.page as number);',
            '      }',
            '      const depsKey = JSON.stringify({',
            '        textFilters: props.textFilters,',
            '        priceFilterMin: props.priceFilterMin,',
            '        priceFilterMax: props.priceFilterMax,',
            '        categoryId: props.categoryId,',
            '        term: props.term,',
            '        brand: props.brand,',
            '        sortField: props.sortField,',
            '        sortOrder: props.sortOrder,',
            '        pageSize: props.pageSize,',
            '        language: props.language,',
            '        page: props.page,',
            '      });',
            '      if (lastFetchDepsRef.current === depsKey) return;',
            '      lastFetchDepsRef.current = depsKey;',
            '      fetchProducts();',
            '    }',
            '  }, [',
            '    props.textFilters,',
            '    props.priceFilterMin,',
            '    props.priceFilterMax,',
            '    props.categoryId,',
            '    props.term,',
            '    props.brand,',
            '    props.sortField,',
            '    props.sortOrder,',
            '    props.pageSize,',
            '    props.language,',
            '    props.page,',
            '  ]);',
        ].join('\n'),
    },
    {
        // Mitosis strips grouping parentheses from `(props.cartItem.childItems || []).map(...)`
        // producing `props.cartItem.childItems || []?.map(...)`.
        // Due to operator precedence this returns the array itself when childItems is truthy,
        // causing React to throw "Objects are not valid as a React child".
        file: resolve('../output/react/ui-components/CartItem.tsx'),
        label: 'React → CartItem: fix childItems || []?.map precedence bug',
        from: '{props.cartItem.childItems || []?.map((child, idx) => (',
        to: '{(props.cartItem.childItems || []).map((child, idx) => (',
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
    {
        // Mitosis compiles `state.clickOutsideListener = listener` to
        // `setClickOutsideListener(listener)`. React treats the function argument
        // as an updater and calls it with null (the previous state), crashing with
        // "Cannot read properties of null (reading 'target')".
        //
        // Fix: remove the unused clickOutsideListener useState, merge the listener
        // creation and cleanup into a single useEffect with a return cleanup.
        file: resolve('../output/react/ui-components/SearchBar.tsx'),
        label: 'React → SearchBar: fix click-outside listener useState setter bug',
        from: [
            '  useEffect(() => {',
            '    const listener = (e: MouseEvent) => {',
            '      const target = e.target as HTMLElement;',
            '      if (target && !target.closest(\'[data-search-bar]\')) {',
            '        setShowDropdown(false);',
            '      }',
            '    };',
            '    setClickOutsideListener(listener);',
            '    document.addEventListener(\'mousedown\', listener);',
            '  }, []);',
            '',
            '  useEffect(() => {',
            '    return () => {',
            '      if (clickOutsideListener) {',
            '        document.removeEventListener(\'mousedown\', clickOutsideListener);',
            '      }',
            '      if (debounceTimer) {',
            '        clearTimeout(debounceTimer);',
            '      }',
            '    };',
            '  }, []);',
        ].join('\n'),
        to: [
            '  useEffect(() => {',
            '    const listener = (e: MouseEvent) => {',
            '      const target = e.target as HTMLElement;',
            '      if (target && !target.closest(\'[data-search-bar]\')) {',
            '        setShowDropdown(false);',
            '      }',
            '    };',
            '    document.addEventListener(\'mousedown\', listener);',
            '    return () => {',
            '      document.removeEventListener(\'mousedown\', listener);',
            '      if (debounceTimer) {',
            '        clearTimeout(debounceTimer);',
            '      }',
            '    };',
            '  }, []);',
        ].join('\n'),
    },
    {
        // Mitosis compiles `state._priceListener = (e) => {...}` to
        // `set_priceListener((e) => {...})`. React treats the function argument
        // as an updater, calling it with prevState instead of storing it.
        //
        // Fix: create the listener inline in useEffect with return cleanup.
        file: resolve('../output/react/ui-components/FavoriteListItem.tsx'),
        label: 'React → FavoriteListItem: fix price listener useState setter bug',
        from: [
            '  useEffect(() => {',
            '    const stored = localStorage.getItem(\'price_include_tax\');',
            '    if (stored !== null) {',
            '      set_includeTax(stored === \'true\');',
            '    }',
            '    set_priceListener(((e: any) => {',
            '      set_includeTax(!!(e as CustomEvent).detail);',
            '    }) as any);',
            '    window.addEventListener(\'priceToggleChanged\', _priceListener as any);',
            '  }, []);',
        ].join('\n'),
        to: [
            '  useEffect(() => {',
            '    const stored = localStorage.getItem(\'price_include_tax\');',
            '    if (stored !== null) {',
            '      set_includeTax(stored === \'true\');',
            '    }',
            '    const listener = (e: Event) => {',
            '      set_includeTax(!!(e as CustomEvent).detail);',
            '    };',
            '    window.addEventListener(\'priceToggleChanged\', listener);',
            '    return () => {',
            '      window.removeEventListener(\'priceToggleChanged\', listener);',
            '    };',
            '  }, []);',
        ].join('\n'),
    },
];

// ── post-patch: remove unused useState declarations ─────────────────────────
//
// After the file patches above remove references to certain useState variables
// (e.g. clickOutsideListener), we also need to strip the now-unused useState
// declarations to avoid lint warnings.

const UNUSED_STATE_REMOVALS = [
    {
        file: resolve('../output/react/ui-components/SearchBar.tsx'),
        // Remove the clickOutsideListener useState (4 lines including blank line after)
        pattern: /\s*const \[clickOutsideListener, setClickOutsideListener\] = useState<[^>]+>\(\(\) => null\);\n/g,
        label: 'React → SearchBar: remove unused clickOutsideListener useState',
    },
    {
        file: resolve('../output/react/ui-components/FavoriteListItem.tsx'),
        pattern: /\s*const \[_priceListener, set_priceListener\] = useState<[^>]+>\(\s*\(\) => null\s*\);\n/g,
        label: 'React → FavoriteListItem: remove unused _priceListener useState',
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

// ── compiled interface getter fixer ──────────────────────────────────────────
//
// Mitosis generates `function xxx(): ReturnType<XxxState["xxx"]>` for every
// `get xxx()` in useStore(). This requires `XxxState["xxx"]` to be a function
// type (i.e. `xxx: () => T`), but the source interface has `xxx: T` (plain type)
// because TypeScript getter syntax requires that.
//
// After compilation, this function patches the interface in each compiled file:
//   `xxx: T;`  →  `xxx: () => T;`
// for every getter-derived property, so ReturnType<> resolves correctly.

function fixCompiledInterfacesForGetters(dir) {
    const files = collectFiles(dir, '.tsx');
    let totalFixed = 0;

    for (const file of files) {
        let content = readFileSync(file, 'utf8');

        // Find all getter-derived function patterns in compiled output:
        //   function xxx(): ReturnType<XxxState["xxx"]>
        // Captures: [getterName, interfaceName]
        const gettersByInterface = new Map();
        for (const m of content.matchAll(/function (\w+)\(\): ReturnType<(\w+)\["\1"\]>/g)) {
            const [, getterName, interfaceName] = m;
            if (!gettersByInterface.has(interfaceName)) gettersByInterface.set(interfaceName, new Set());
            gettersByInterface.get(interfaceName).add(getterName);
        }

        if (gettersByInterface.size === 0) continue;

        let updated = content;
        let fileFixed = 0;

        for (const [, getterNames] of gettersByInterface) {
            for (const name of getterNames) {
                // Match `name: T;` preceded by `{` or `;` (property separator in both
                // multiline and single-line interfaces). Does NOT match already-function types.
                const propRe = new RegExp(
                    `(?<=[{;][ \\t\\r\\n]*)(${name})(\\s*:\\s*)(?!\\(\\)\\s*=>)([^;({]+?);`,
                    'g'
                );
                const before = updated;
                updated = updated.replace(propRe, (_, n, colon, type) => {
                    return `${n}${colon}() => ${type.trim()};`;
                });
                if (updated !== before) fileFixed++;
            }
        }

        if (fileFixed > 0) {
            writeFileSync(file, updated, 'utf8');
            const rel = file.replace(/.*[/\\]output[/\\]/, 'output/');
            console.log(`  [Getter interfaces] ✓ ${rel} — fixed ${fileFixed} interface type(s)`);
            totalFixed += fileFixed;
        }
    }

    return totalFixed;
}

// ── main ──────────────────────────────────────────────────────────────────────
//
// When invoked with `--patches-only`, skip the pre-Prettier fixes (import
// hoisting, getter interfaces, global regexes) and only apply the exact-string
// FILE_PATCHES and unused-state removals.  This is used in the build pipeline
// where the script runs twice: once before Prettier (full) and once after
// Prettier (patches-only), because FILE_PATCHES match Prettier-formatted code.

const patchesOnly = process.argv.includes('--patches-only');

let totalFixes = 0;

if (!patchesOnly) {
    // Hoist mid-file imports to the top (must run before other patches)
    totalFixes += hoistImports(resolve('../output/react/ui-components'));

    // Fix compiled interface types for getter-derived properties
    totalFixes += fixCompiledInterfacesForGetters(resolve('../output/react/ui-components'));

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
}

let patchFixes = 0;
for (const { file, from, to, label } of FILE_PATCHES) {
    patchFixes += applyFilePatch(file, from, to, label);
}

if (patchFixes === 0) {
    console.log('  [Patch] ✓ nothing to patch');
}

totalFixes += patchFixes;

// Remove unused useState declarations left behind by file patches
for (const { file, pattern, label } of UNUSED_STATE_REMOVALS) {
    try {
        const content = readFileSync(file, 'utf8');
        const matches = (content.match(pattern) || []).length;
        if (matches > 0) {
            writeFileSync(file, content.replace(pattern, '\n'), 'utf8');
            console.log(`  [Cleanup] ✓ ${label}`);
            totalFixes += matches;
        }
    } catch {
        // File doesn't exist — skip
    }
}

if (totalFixes > 0) {
    console.log(`\n  fix-mitosis-callbacks: ${totalFixes} total fix${totalFixes > 1 ? 'es' : ''} applied`);
}
