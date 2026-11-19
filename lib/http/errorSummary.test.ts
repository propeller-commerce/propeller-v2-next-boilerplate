import test from 'node:test';
import assert from 'node:assert/strict';
import { errorSummary } from './errorSummary.ts';

test('keeps the error type and codes, never the message (it can hold an email address)', () => {
  const smtp = Object.assign(new Error('Recipient address rejected: ada@example.com'), {
    code: 'EENVELOPE',
    responseCode: 550,
    command: 'RCPT TO',
    response: '550 5.1.1 <ada@example.com>: unknown',
  });
  const out = errorSummary(smtp);
  assert.deepEqual(out, { name: 'Error', code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' });
  assert.ok(!JSON.stringify(out).includes('ada@example.com'));
});

test('non-errors and status codes', () => {
  assert.deepEqual(errorSummary(Object.assign(new Error('x'), { status: 502 })), { name: 'Error', status: 502 });
  assert.deepEqual(errorSummary('boom'), { name: 'string' });
  assert.deepEqual(errorSummary(null), { name: 'null' });
});
