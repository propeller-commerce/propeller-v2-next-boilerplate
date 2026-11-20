import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { parse } from 'graphql';
import {
  registrationStep,
  createdCompanyId,
  signRegistration,
  verifyRegistration,
  REGISTRATION_DOCUMENT_HASHES,
  documentHash,
  companyCreateVariables,
  mayRegisterContact,
  registeredContact,
  CONTACT_FLAG,
  type RegistrationContext,
} from './registrationRouting.ts';
import { verifyLastOrderState } from './orderEditorRouting.ts';

// Run with:  npm test

const SIGN = { key: 'cookie-signing-test-key', now: 1_000_000_000_000 };
const OPS = 'node_modules/@propeller-commerce/propeller-sdk-v2/dist/esm/generated/operations/';
const sdkDocument = async (name: string): Promise<string> =>
  (await import(pathToFileURL(`${process.cwd()}/${OPS}${name}.js`).href)).document;

const COMPANY_CREATE = await sdkDocument('companyCreate');
const ADDRESS_CREATE = await sdkDocument('companyAddressCreate');

const ctx = (extra: Partial<RegistrationContext> = {}): RegistrationContext => ({
  isAnonymous: true,
  registration: null,
  ...extra,
});
const step = (query: string, variables: unknown, c: RegistrationContext) => registrationStep(parse(query), variables, c);

test('the allowlisted hashes match the installed SDK documents (update them after an SDK upgrade)', () => {
  assert.equal(documentHash(parse(COMPANY_CREATE)), REGISTRATION_DOCUMENT_HASHES.companyCreate);
  assert.equal(documentHash(parse(ADDRESS_CREATE)), REGISTRATION_DOCUMENT_HASHES.companyAddressCreate);
  // Whitespace does not matter, content does.
  assert.equal(documentHash(parse(`  ${COMPANY_CREATE.replace(/\n/g, '\n\n')}`)), REGISTRATION_DOCUMENT_HASHES.companyCreate);
  assert.notEqual(
    documentHash(parse(COMPANY_CREATE.replace('companyId\n', 'companyId\n  debtorId\n'))),
    REGISTRATION_DOCUMENT_HASHES.companyCreate,
  );
});

test('companyCreate is elevated only for an anonymous caller sending the SDK document', () => {
  assert.deepEqual(step(COMPANY_CREATE, {}, ctx()), { kind: 'company' });
  assert.equal(step(COMPANY_CREATE, {}, ctx({ isAnonymous: false })), null);
  // Any other selection, even of the same field, is not elevated.
  assert.equal(
    step('mutation m($input: CreateCompanyInput!) { companyCreate(input: $input) { companyId contacts { items { email } } } }', {}, ctx()),
    null,
  );
});

test('companyAddressCreate is elevated only for the company this browser just created, once per type', () => {
  const registration = { companyId: 77, used: '' };
  const vars = (companyId: unknown, type: unknown) => ({ input: { companyId, type, street: 'x' } });
  assert.deepEqual(step(ADDRESS_CREATE, vars(77, 'invoice'), ctx({ registration })), { kind: 'address', companyId: 77, flag: 'i' });
  assert.deepEqual(step(ADDRESS_CREATE, vars(77, 'delivery'), ctx({ registration })), { kind: 'address', companyId: 77, flag: 'd' });
  // The register response's session makes the caller non-anonymous; that is fine for addresses.
  assert.ok(step(ADDRESS_CREATE, vars(77, 'invoice'), ctx({ registration, isAnonymous: false })));
  assert.equal(step(ADDRESS_CREATE, vars(78, 'invoice'), ctx({ registration })), null);
  assert.equal(step(ADDRESS_CREATE, vars('77', 'invoice'), ctx({ registration })), null);
  assert.equal(step(ADDRESS_CREATE, vars(77, 'other'), ctx({ registration })), null);
  assert.equal(step(ADDRESS_CREATE, vars(77, 'invoice'), ctx()), null);
  assert.equal(step(ADDRESS_CREATE, vars(77, 'invoice'), ctx({ registration: { companyId: 77, used: 'i' } })), null);
  assert.ok(step(ADDRESS_CREATE, vars(77, 'delivery'), ctx({ registration: { companyId: 77, used: 'i' } })));
});

test('other documents never elevate', () => {
  assert.equal(step('mutation { contactDelete(id: 1) }', {}, ctx()), null);
});

test('createdCompanyId reads the new id from a companyCreate response only', () => {
  assert.equal(createdCompanyId({ data: { companyCreate: { companyId: 77 } } }), 77);
  assert.equal(createdCompanyId({ data: { companyCreate: { companyId: '77' } } }), null);
  assert.equal(createdCompanyId({ data: { companyCreate: null } }), null);
  assert.equal(createdCompanyId(null), null);
});

test('the registration cookie round-trips and rejects tampering', () => {
  const fresh = signRegistration(77, '', SIGN)!;
  assert.deepEqual(verifyRegistration(fresh, SIGN), { companyId: 77, used: '' });
  const after = signRegistration(77, 'i', SIGN)!;
  assert.deepEqual(verifyRegistration(after, SIGN), { companyId: 77, used: 'i' });
  assert.equal(verifyRegistration(after.replace('77.i.', '77.'), SIGN), null);
  assert.equal(verifyRegistration(fresh.replace('77', '78'), SIGN), null);
  assert.equal(verifyRegistration(fresh, { ...SIGN, key: 'other-key' }), null);
  assert.equal(verifyRegistration(undefined, SIGN), null);
  assert.equal(verifyRegistration(fresh, { ...SIGN, now: SIGN.now + 15 * 60_000 + 1000 }), null);
  // Not interchangeable with the last-order cookie (different purpose).
  assert.equal(verifyLastOrderState(fresh, SIGN), null);
});

test('an elevated companyCreate keeps only the registration fields', () => {
  const vars = {
    input: { name: 'A', email: 'a@x.test', taxNumber: 'NL1', cocNumber: '1', phone: '0', debtorId: 'D1', parentId: 5 },
    contactSearchArguments: { page: 1 },
  };
  assert.deepEqual(companyCreateVariables(vars), {
    input: { name: 'A', email: 'a@x.test', taxNumber: 'NL1', cocNumber: '1', phone: '0' },
    contactSearchArguments: { page: 1 },
  });
  assert.deepEqual(companyCreateVariables(null), { input: {} });
});

test('an anonymous contactRegister is allowed only into the company this browser just created, once', () => {
  const reg = (used = '') => ({ companyId: 77, used });
  assert.equal(mayRegisterContact(77, { isAnonymous: true, registration: reg() }), true);
  assert.equal(mayRegisterContact(77, { isAnonymous: true, registration: reg('id') }), true);
  // Another company, no cookie, already registered, or a logged-in caller.
  assert.equal(mayRegisterContact(78, { isAnonymous: true, registration: reg() }), false);
  assert.equal(mayRegisterContact(77, { isAnonymous: true, registration: null }), false);
  assert.equal(mayRegisterContact(null, { isAnonymous: true, registration: reg() }), false);
  assert.equal(mayRegisterContact(77, { isAnonymous: true, registration: reg(CONTACT_FLAG) }), false);
  assert.equal(mayRegisterContact(77, { isAnonymous: false, registration: reg() }), false);
});

test('the registration cookie carries the contact flag next to the address flags', () => {
  const value = signRegistration(77, 'c' + 'id', SIGN);
  assert.deepEqual(verifyRegistration(value, SIGN), { companyId: 77, used: 'cid' });
});

test('a contact counts as registered when the response carries it, even with partial errors', () => {
  assert.equal(registeredContact({ data: { contactRegister: { contact: { contactId: 1 } } }, errors: [{ message: 'Unauthorized' }] }), true);
  assert.equal(registeredContact({ data: { contactRegister: null }, errors: [{ message: 'Email exists' }] }), false);
  assert.equal(registeredContact(null), false);
});
