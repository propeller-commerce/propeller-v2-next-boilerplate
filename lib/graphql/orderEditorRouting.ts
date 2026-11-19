import {
  Kind,
  parse,
  type DocumentNode,
  type FieldNode,
  type OperationDefinitionNode,
  type ValueNode,
} from 'graphql';
import { signCookieValue, verifyCookieValue, type SignOptions } from '../http/signedCookie.ts';
import { documentHash } from './registrationRouting.ts';

// Order-editor key routing from the parsed document, never from operationName.

// Checkout mutations the backend authorizes only under the order-editor key. Elevated only for
// the order this browser just placed (signed last-order cookie), once each. passwordResetLink is
// never elevated: it returns the reset URL to the caller, which would hand out any account.
export const ORDER_EDITOR_MUTATION_FIELDS: ReadonlySet<string> = new Set([
  'orderSetStatus',
  'triggerQuoteSendRequest',
  'triggerOrderSendConfirm',
]);
// Each runs at most once per order: its flag goes into the signed cookie and the server's spent log.
const MUTATION_FLAG: Record<string, string> = {
  orderSetStatus: 's',
  triggerQuoteSendRequest: 'q',
  triggerOrderSendConfirm: 'c',
};
// Elevated only for the order-editor client of an authorization manager of input.parentId's company.
export const CONTACT_REGISTER_FIELD = 'contactRegister';

// sha256 of print(parse(document)) of the installed SDK's documents the shop sends for the elevated
// mutations (react-ui placeOrder and QuoteActions, authorization settings' registerContact);
// sdkDocuments.test.ts checks them. Only these get the order-editor key: it would resolve any
// selection on the returned object (`orderSetStatus(…) { company { contacts { … } } }`).
export const ELEVATED_MUTATION_DOCUMENT_HASHES: Readonly<Record<string, string>> = {
  orderSetStatus: '7c84383485efcd2ea7f81d4965794ebee5284decfec084f22034b2ee0d8f4ec4',
  triggerQuoteSendRequest: '34f4860120011946647baa8b540dbc95e7cd08468523bc6aa15efae54d3189f4',
  triggerOrderSendConfirm: '379c5f6817ecd10f6bd1cd0fc6b8cae0a4730e677e5821a9406433f867a5fcd7',
  contactRegister: '7abc947729c6e1d20cb1049c380569402add63473ad54a6cb84e0fbfc2413137',
};
const ELEVATED_HASHES = new Set(Object.values(ELEVATED_MUTATION_DOCUMENT_HASHES));

/** Whether the document is exactly one of the shop's own elevated mutation documents. */
export function isKnownElevatedMutation(doc: DocumentNode): boolean {
  return ELEVATED_HASHES.has(documentHash(doc));
}

export const LAST_ORDER_COOKIE = 'propeller_last_order';
export const LAST_ORDER_MAX_AGE = 60 * 60;
const LAST_ORDER_PURPOSE = 'last-order';

export interface SingleField {
  operation: 'query' | 'mutation' | 'subscription';
  definition: OperationDefinitionNode;
  field: FieldNode;
}

export interface LastOrder {
  orderId: number;
  // Flags of the elevated mutations already run for that order.
  used: string;
}

export interface RoutingContext {
  single: SingleField | null;
  variables: unknown;
  // From a verified last-order cookie, its flags merged with the server's spent log.
  lastOrder: LastOrder | null;
}

/** The parsed document, or null when `query` isn't a string or doesn't parse. Parse once, share the AST. */
export function parseDocument(query: unknown): DocumentNode | null {
  if (typeof query !== 'string') return null;
  try {
    return parse(query, { noLocation: true });
  } catch {
    return null;
  }
}

/** The one operation's one top-level field (ignoring __typename), or null. */
export function readSingleField(doc: DocumentNode | null): SingleField | null {
  if (!doc) return null;
  const operations = doc.definitions.filter(
    (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION,
  );
  if (operations.length !== 1) return null;
  const definition = operations[0];
  const selections = definition.selectionSet.selections.filter(
    (s) => !(s.kind === Kind.FIELD && s.name.value === '__typename'),
  );
  if (selections.length !== 1 || selections[0].kind !== Kind.FIELD) return null;
  return { operation: definition.operation, definition, field: selections[0] };
}

/** The value of the single field's argument `name`, variables and defaults resolved. */
export function resolveArgument(single: SingleField, name: string, variables: unknown): unknown {
  const arg = single.field.arguments?.find((a) => a.name.value === name);
  if (!arg) return undefined;
  return resolveValue(arg.value, single.definition, variables);
}

function resolveValue(node: ValueNode, definition: OperationDefinitionNode, variables: unknown): unknown {
  switch (node.kind) {
    case Kind.VARIABLE: {
      const vars = variables && typeof variables === 'object' ? (variables as Record<string, unknown>) : {};
      const varName = node.name.value;
      if (Object.prototype.hasOwnProperty.call(vars, varName)) return vars[varName];
      const fallback = definition.variableDefinitions?.find((v) => v.variable.name.value === varName)?.defaultValue;
      return fallback ? resolveValue(fallback, definition, {}) : undefined;
    }
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value);
    case Kind.STRING:
    case Kind.ENUM:
      return node.value;
    case Kind.BOOLEAN:
      return node.value;
    case Kind.NULL:
      return null;
    case Kind.OBJECT:
      return Object.fromEntries(node.fields.map((f) => [f.name.value, resolveValue(f.value, definition, variables)]));
    default:
      // Lists: a non-null value that never matches an id.
      return node.kind;
  }
}

/** The `input` argument of the single field as a plain object; null when absent or not an object. */
export function inputArgument(single: SingleField, variables: unknown): Record<string, unknown> | null {
  const input = resolveArgument(single, 'input', variables);
  return input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : null;
}

/** A positive integer id from a number or a digits-only string, else null. */
export function toId(raw: unknown): number | null {
  const id = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

// The checkout sets a new order to NEW (order), REQUEST (quote request) or UNFINISHED (PSP
// payment pending), payment OPEN; nothing else is elevated.
const CHECKOUT_STATUSES = new Set(['NEW', 'REQUEST', 'UNFINISHED']);
const CHECKOUT_PAY_STATUSES = new Set([undefined, null, 'OPEN']);

function isCheckoutStatus(input: Record<string, unknown>): boolean {
  return CHECKOUT_STATUSES.has(input.status as string) && CHECKOUT_PAY_STATUSES.has(input.payStatus as string);
}

/** The single field asks for `lastOrderId` by id, not by UUID. */
export function isRequestedLastOrder(single: SingleField, variables: unknown, lastOrderId: number): boolean {
  if (toId(resolveArgument(single, 'orderId', variables)) !== lastOrderId) return false;
  // A UUID lookup could resolve a different order.
  const uuid = resolveArgument(single, 'orderUUID', variables);
  return uuid === undefined || uuid === null;
}

/** Cookie-bound elevation of the checkout mutations. Order reads are decided in orderReadRouting.ts. */
export function shouldUseOrderEditorKey(ctx: RoutingContext): boolean {
  const { single, lastOrder } = ctx;
  if (!single || !lastOrder) return false;
  const name = single.field.name.value;
  if (single.operation === 'mutation' && ORDER_EDITOR_MUTATION_FIELDS.has(name)) {
    if (lastOrder.used.includes(MUTATION_FLAG[name])) return false;
    const input = inputArgument(single, ctx.variables);
    if (!input || toId(input.orderId) !== lastOrder.orderId) return false;
    return name !== 'orderSetStatus' || isCheckoutStatus(input);
  }
  return false;
}

/** The flag to spend once this document ran with the editor key for the last order, else null. */
export function elevatedMutationFlag(single: SingleField | null): string | null {
  if (!single || single.operation !== 'mutation') return null;
  return MUTATION_FLAG[single.field.name.value] ?? null;
}

/** `input.parentId` of a single contactRegister mutation, else null. */
export function contactRegisterParentId(single: SingleField | null, variables: unknown): number | null {
  if (!single || single.operation !== 'mutation' || single.field.name.value !== CONTACT_REGISTER_FIELD) return null;
  const input = inputArgument(single, variables);
  return input ? toId(input.parentId) : null;
}

/**
 * The order id when the document is the quote acceptance (QuoteActions: orderSetStatus with
 * exactly `{ orderId, status: 'NEW' }`), else null. The route still checks that the verified
 * viewer owns that order and that it is a quotation.
 */
export function quoteAcceptOrderId(single: SingleField | null, variables: unknown): number | null {
  if (!single || single.operation !== 'mutation' || single.field.name.value !== 'orderSetStatus') return null;
  const input = inputArgument(single, variables);
  if (!input || input.status !== 'NEW') return null;
  if (Object.keys(input).some((k) => k !== 'orderId' && k !== 'status')) return null;
  return toId(input.orderId);
}

/**
 * Whether `quoteOwnerResponse` (the order-editor key's answer to ORDER_OWNER_QUERY for the
 * order being accepted) shows a quotation the verified viewer placed. Anything else, an
 * error or a missing order included, is no.
 */
export function isOwnQuotation(quoteOwnerResponse: unknown, viewer: { userId: number } | null): boolean {
  if (!viewer) return false;
  const order = (quoteOwnerResponse as { data?: { order?: { status?: unknown; userId?: unknown } | null } | null } | null)
    ?.data?.order;
  return order?.status === 'QUOTATION' && order.userId === viewer.userId;
}

/** Who placed an order and its status, read with the order-editor key (quote acceptance, order reads). */
export const ORDER_OWNER_QUERY = 'query orderOwner($orderId: Int) { order(orderId: $orderId) { status userId } }';

/** The new order id when the document is a cartProcess mutation, else null. */
export function placedOrderId(single: SingleField | null, response: unknown): number | null {
  if (!single || single.operation !== 'mutation' || single.field.name.value !== 'cartProcess') return null;
  const key = single.field.alias?.value ?? 'cartProcess';
  const data = (response as { data?: Record<string, { cartOrderId?: unknown } | null> } | null)?.data;
  const id = data?.[key]?.cartOrderId;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

/** Cookie value for the last order and the flags already used; null when no signing key is configured. */
export function signLastOrder(orderId: number, used = '', opts?: SignOptions): string | null {
  return signCookieValue(LAST_ORDER_PURPOSE, used ? `${orderId}.${used}` : String(orderId), LAST_ORDER_MAX_AGE, opts);
}

/** The order id and the flags already used when the cookie verifies, else null. */
export function verifyLastOrderState(value: string | undefined | null, opts?: SignOptions): LastOrder | null {
  const match = /^(\d{1,15})(?:\.([sqc]{1,3}))?$/.exec(verifyCookieValue(LAST_ORDER_PURPOSE, value, opts) ?? '');
  return match ? { orderId: Number(match[1]), used: match[2] ?? '' } : null;
}

/**
 * Server-side record of the elevated mutations run per order. The cookie's flags alone can be
 * undone by replaying an older cookie; this can't. A flag is reserved before the upstream call
 * (so parallel replays can't both pass) and released when the call fails.
 * ponytail: per instance, kept as long as the cookie lives; behind N instances use a shared store.
 */
export function createSpentLog({ ttlMs = LAST_ORDER_MAX_AGE * 1000, maxEntries = 10_000, now = Date.now } = {}) {
  const entries = new Map<number, { flags: string; at: number }>();
  const flags = (orderId: number): string => {
    const entry = entries.get(orderId);
    return !entry || now() - entry.at > ttlMs ? '' : entry.flags;
  };
  const set = (orderId: number, value: string) => {
    entries.delete(orderId);
    if (entries.size >= maxEntries) entries.delete(entries.keys().next().value as number);
    entries.set(orderId, { flags: value, at: now() });
  };
  return {
    flags,
    add(orderId: number, flag: string): void {
      const current = flags(orderId);
      set(orderId, current.includes(flag) ? current : current + flag);
    },
    /**
     * Spend `flag` unless it is spent already, in one synchronous step: false when
     * another request got there first. Call it after the request's last await,
     * right before the upstream call, so parallel requests can't all pass.
     */
    reserve(orderId: number, flag: string): boolean {
      const current = flags(orderId);
      if (current.includes(flag)) return false;
      set(orderId, current + flag);
      return true;
    },
    remove(orderId: number, flag: string): void {
      set(orderId, flags(orderId).replace(flag, ''));
    },
  };
}

/**
 * Run the upstream call for a checkout flag reserve() just spent, and release the flag when the
 * call throws (network error, unreadable body) or `failed(result)`: the mutation didn't run, so
 * the shopper can retry it. Without a reservation it only runs `call`.
 */
export async function settleReserved<T>(
  log: Pick<ReturnType<typeof createSpentLog>, 'remove'>,
  reserved: { orderId: number; flag: string } | null,
  call: () => Promise<T>,
  failed: (result: T) => boolean,
): Promise<T> {
  let result: T;
  try {
    result = await call();
  } catch (e) {
    if (reserved) log.remove(reserved.orderId, reserved.flag);
    throw e;
  }
  if (reserved && failed(result)) log.remove(reserved.orderId, reserved.flag);
  return result;
}
