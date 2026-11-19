import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewerLookup, toVerifiedViewer } from './viewer.ts';

// Run with:  npm test

const contact = {
  __typename: 'Contact',
  contactId: 73,
  company: { companyId: 37 },
  companies: { items: [{ companyId: 36 }, { companyId: 39 }] },
  purchaseAuthorizationConfigs: {
    items: [
      { purchaseRole: 'AUTHORIZATION_MANAGER', company: { companyId: 37 } },
      { purchaseRole: 'PURCHASER', company: { companyId: 39 } },
    ],
  },
};

test('contacts and customers are verified viewers; anyone else is not', () => {
  assert.deepEqual(toVerifiedViewer(contact), {
    type: 'Contact',
    userId: 73,
    companyId: 37,
    companyIds: [36, 39, 37],
    managerCompanyIds: [37],
  });
  assert.deepEqual(toVerifiedViewer({ __typename: 'Customer', customerId: 210 }), { type: 'Customer', userId: 210 });
  // The anonymous viewer, a missing id, a string id, nothing.
  assert.equal(toVerifiedViewer({ __typename: 'User' }), null);
  assert.equal(toVerifiedViewer({ __typename: 'Contact' }), null);
  assert.equal(toVerifiedViewer({ __typename: 'Contact', contactId: '73' }), null);
  assert.equal(toVerifiedViewer({ contactId: 73 }), null);
  assert.equal(toVerifiedViewer(null), null);
  // Lists that failed upstream come back empty, not as a crash.
  assert.deepEqual(toVerifiedViewer({ __typename: 'Contact', contactId: 1, companies: null }), {
    type: 'Contact',
    userId: 1,
    companyId: null,
    companyIds: [],
    managerCompanyIds: [],
  });
});

test('no token is anonymous and costs no lookup', async () => {
  let calls = 0;
  const viewer = createViewerLookup(async () => (calls++, contact));
  assert.equal(await viewer(undefined), null);
  assert.equal(await viewer(''), null);
  assert.equal(await viewer(null), null);
  // A blank cookie (`access_token=%09`) or header is no token either.
  for (const blank of ['\t', ' ', '\n\t ']) assert.equal(await viewer(blank), null);
  assert.equal(calls, 0);
});

test('the answer is cached per token until the ttl passes, anonymous answers too', async () => {
  let now = 0;
  const calls: string[] = [];
  const viewer = createViewerLookup(async (token) => (calls.push(token), token === 'c' ? contact : null), {
    ttlMs: 1000,
    now: () => now,
  });
  assert.equal((await viewer('c'))?.userId, 73);
  assert.equal(await viewer('forged'), null);
  await viewer('c');
  await viewer('forged');
  assert.deepEqual(calls, ['c', 'forged']);
  now = 1001;
  await viewer('c');
  assert.deepEqual(calls, ['c', 'forged', 'c']);
});

test('a failed lookup is anonymous (fail closed) and not cached', async () => {
  let fail = true;
  let calls = 0;
  const viewer = createViewerLookup(async () => {
    calls++;
    if (fail) throw new Error('upstream down');
    return contact;
  });
  assert.equal(await viewer('t'), null);
  fail = false;
  assert.equal((await viewer('t'))?.type, 'Contact');
  assert.equal(calls, 2);
});

test('the cache stays bounded', async () => {
  const viewer = createViewerLookup(async () => contact, { maxEntries: 2 });
  await viewer('a');
  await viewer('b');
  await viewer('c');
  assert.equal(viewer.size(), 2);
});

test('parallel requests for one token share a single lookup', async () => {
  let calls = 0;
  let release: () => void = () => {};
  const viewer = createViewerLookup(() => {
    calls++;
    return new Promise((resolve) => {
      release = () => resolve(contact);
    });
  });
  const pending = Array.from({ length: 8 }, () => viewer('t'));
  release();
  const results = await Promise.all(pending);
  assert.ok(results.every((v) => v?.userId === 73));
  assert.equal(calls, 1);
});
