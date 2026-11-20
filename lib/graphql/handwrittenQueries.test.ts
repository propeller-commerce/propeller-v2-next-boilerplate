import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSchema, parse, validate } from 'graphql';
import { VIEWER_QUERY } from '../auth/viewer.ts';
import { PSP_ORDER_QUERY } from '../psp/orderAccess.ts';
import { ORDER_OWNER_QUERY } from './orderEditorRouting.ts';

// Refresh with scripts/update-propeller-schema.mjs when the API schema changes.
const schema = buildSchema(readFileSync(new URL('./__fixtures__/propeller-schema.graphql', import.meta.url), 'utf8'));
const errors = (query: string) => validate(schema, parse(query)).map((e) => e.message);

test('hand-written queries are valid against the Propeller schema', () => {
  for (const [name, query] of Object.entries({ VIEWER_QUERY, PSP_ORDER_QUERY, ORDER_OWNER_QUERY })) {
    assert.deepEqual(errors(query), [], name);
  }
});

test('the schema check catches a field the API does not have', () => {
  assert.notDeepEqual(errors('query q($orderId: Int) { order(orderId: $orderId) { orderId } }'), []);
});
