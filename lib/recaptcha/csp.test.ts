import test from 'node:test';
import assert from 'node:assert/strict';
import { recaptchaCspSources } from './csp.ts';

test('disabled adds nothing', () => {
  assert.deepEqual(recaptchaCspSources(false), { script: '', frame: '' });
});

test('enabled allows Google scripts and the challenge frame', () => {
  assert.deepEqual(recaptchaCspSources(true), {
    script: ' https://www.google.com https://www.gstatic.com',
    frame: ' https://www.google.com',
  });
});
