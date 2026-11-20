// Refresh the schema snapshot the hand-written query test validates against.
// Usage: node scripts/update-propeller-schema.mjs <path-to-sdl.gql>
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, print, visit } from 'graphql';

const OUT = 'lib/graphql/__fixtures__/propeller-schema.graphql';
const [input] = process.argv.slice(2);
if (!input) {
  console.error('Usage: node scripts/update-propeller-schema.mjs <path-to-sdl.gql>');
  process.exit(1);
}
const doc = visit(parse(readFileSync(input, 'utf8')), {
  enter: (node) => ('description' in node && node.description ? { ...node, description: undefined } : undefined),
});
writeFileSync(OUT, print(doc) + '\n');
console.log(`Wrote ${OUT}`);
