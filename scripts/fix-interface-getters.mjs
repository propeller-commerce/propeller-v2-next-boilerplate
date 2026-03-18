import { readFileSync, writeFileSync } from 'fs';

const files = [
  'ui-components/CartCarriers.lite.tsx',
  'ui-components/CartOverview.lite.tsx',
  'ui-components/CartPaymethods.lite.tsx',
  'ui-components/CartSummary.lite.tsx',
  'ui-components/CategoryShortDescription.lite.tsx',
  'ui-components/DeliveryDate.lite.tsx',
  'ui-components/FavoriteLists.lite.tsx',
  'ui-components/ForgotPassword.lite.tsx',
  'ui-components/LoginForm.lite.tsx',
  'ui-components/OrderItemCard.lite.tsx',
  'ui-components/RegisterForm.lite.tsx',
  'ui-components/SearchBar.lite.tsx',
];

// Match interface getter declarations only (end with semicolon, not opening brace)
const re = /^(\s*)get (\w+)\(\): ([^;{]+);/gm;

let total = 0;
for (const f of files) {
  const orig = readFileSync(f, 'utf8');
  const updated = orig.replace(re, (_, indent, name, type) => `${indent}${name}: () => ${type};`);
  if (orig !== updated) {
    const count = (orig.match(re) || []).length;
    writeFileSync(f, updated, 'utf8');
    console.log(`Fixed ${count} in ${f}`);
    total += count;
  }
}
console.log(`Total: ${total} fixes`);
