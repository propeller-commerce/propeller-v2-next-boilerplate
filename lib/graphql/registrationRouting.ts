import { createHash } from 'node:crypto';
import { print, type DocumentNode } from 'graphql';
import { signCookieValue, verifyCookieValue, type SignOptions } from '../http/signedCookie.ts';

// Public self-registration (package RegisterForm → useAuth.registerContact) creates a company and
// its addresses from the browser. A storefront key limited to its role may not, so the proxy sends
// exactly these SDK documents with the order-editor key and without the Bearer: companyCreate for
// anonymous callers (rate-limited in the route, input reduced to registration fields), and
// companyAddressCreate only for the company this browser just created (signed cookie), once per type.

// sha256 of print(parse(document)) of the installed SDK's documents; registrationRouting.test.ts checks them.
export const REGISTRATION_DOCUMENT_HASHES = {
  companyCreate: 'f63fd68ed60135a104ba16755c22692403334038292e6861d9a0eaedd17d89ae',
  companyAddressCreate: 'b4dd23230e005aaa5ebd462f6f59b89cbb06ed4a8b1b1cad870ab27f2687fe1b',
} as const;

export const REGISTRATION_COOKIE = 'propeller_registration';
export const REGISTRATION_MAX_AGE = 15 * 60;
const REGISTRATION_PURPOSE = 'registration';

const ADDRESS_FLAG: Record<string, string> = { invoice: 'i', delivery: 'd' };

export interface Registration {
  companyId: number;
  used: string;
}

export interface RegistrationContext {
  // No session cookie and no Authorization header.
  isAnonymous: boolean;
  // From a verified registration cookie.
  registration: Registration | null;
}

export type RegistrationStep = { kind: 'company' } | { kind: 'address'; companyId: number; flag: string };

/** sha256 of the normalized (printed) document. */
export function documentHash(doc: DocumentNode): string {
  return createHash('sha256').update(print(doc)).digest('hex');
}

export function registrationStep(
  doc: DocumentNode,
  variables: unknown,
  ctx: RegistrationContext,
): RegistrationStep | null {
  const hash = documentHash(doc);
  if (hash === REGISTRATION_DOCUMENT_HASHES.companyCreate) {
    return ctx.isAnonymous ? { kind: 'company' } : null;
  }
  if (hash === REGISTRATION_DOCUMENT_HASHES.companyAddressCreate && ctx.registration) {
    const input = (variables as { input?: { companyId?: unknown; type?: unknown } } | null)?.input;
    const flag = typeof input?.type === 'string' ? ADDRESS_FLAG[input.type] : undefined;
    if (!flag || input?.companyId !== ctx.registration.companyId) return null;
    if (ctx.registration.used.includes(flag)) return null;
    return { kind: 'address', companyId: ctx.registration.companyId, flag };
  }
  return null;
}

/** The new company id from a companyCreate response, else null. */
export function createdCompanyId(response: unknown): number | null {
  const id = (response as { data?: { companyCreate?: { companyId?: unknown } | null } } | null)?.data?.companyCreate
    ?.companyId;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

/** Cookie value for the company this browser just created and the address types already added. */
export function signRegistration(companyId: number, used = '', opts?: SignOptions): string | null {
  return signCookieValue(REGISTRATION_PURPOSE, used ? `${companyId}.${used}` : String(companyId), REGISTRATION_MAX_AGE, opts);
}

export function verifyRegistration(value: string | undefined | null, opts?: SignOptions): Registration | null {
  const match = /^(\d{1,15})(?:\.([idc]{1,3}))?$/.exec(verifyCookieValue(REGISTRATION_PURPOSE, value, opts) ?? '');
  return match ? { companyId: Number(match[1]), used: match[2] ?? '' } : null;
}

/** Only self-registration creates a company; any other document selecting this is refused. */
export const COMPANY_CREATE_FIELD = 'companyCreate';

/** An hourly limit from the environment: a whole number, 0 for none; anything else keeps `fallback`. */
export function hourlyLimit(value: string | undefined, fallback: number): { limit: number; windowMs: number } {
  const raw = (value ?? '').trim();
  const n = /^\d{1,6}$/.test(raw) ? Number(raw) : fallback;
  return { limit: n === 0 ? Number.MAX_SAFE_INTEGER : n, windowMs: 60 * 60_000 };
}

/** Cookie flag for the contact registered into the new company. */
export const CONTACT_FLAG = 'c';

/** Whether a contactRegister response created a contact (an anonymous one also carries partial errors). */
export function registeredContact(response: unknown): boolean {
  return !!(response as { data?: { contactRegister?: unknown } } | null)?.data?.contactRegister;
}

/**
 * Whether an anonymous contactRegister is this browser's own self-registration: into the company it
 * just created (signed cookie), once. The storefront key accepts any existing `parentId`.
 */
export function mayRegisterContact(parentId: number | null, ctx: RegistrationContext): boolean {
  const reg = ctx.registration;
  return ctx.isAnonymous && !!reg && parentId === reg.companyId && !reg.used.includes(CONTACT_FLAG);
}

// The fields RegisterForm sends; anything else (debtorId, parentId, …) could tie the new company to an existing one.
const COMPANY_INPUT_FIELDS = new Set(['name', 'taxNumber', 'cocNumber', 'email', 'phone']);

/** Variables for an elevated companyCreate, with `input` reduced to the registration fields. */
export function companyCreateVariables(variables: unknown): Record<string, unknown> {
  const vars = variables && typeof variables === 'object' ? (variables as Record<string, unknown>) : {};
  const input = vars.input && typeof vars.input === 'object' ? (vars.input as Record<string, unknown>) : {};
  return { ...vars, input: Object.fromEntries(Object.entries(input).filter(([k]) => COMPANY_INPUT_FIELDS.has(k))) };
}
