import { createHmac, timingSafeEqual } from 'node:crypto';
import { Kind, parse, type FieldNode, type OperationDefinitionNode, type ValueNode } from 'graphql';

// Order-editor key routing from the parsed document, never from operationName.

// Top-level mutation fields the backend authorizes only under the order-editor key.
export const ORDER_EDITOR_MUTATION_FIELDS: ReadonlySet<string> = new Set([
  'orderSetStatus',
  'passwordResetLink',
  'triggerQuoteSendRequest',
  'triggerOrderSendConfirm',
]);
// Elevated only for the order-editor client with a logged-in session.
export const ORDER_EDITOR_OPT_IN_MUTATION_FIELDS: ReadonlySet<string> = new Set(['contactRegister']);
// Elevated only for a guest reading the order this browser just placed.
export const LAST_ORDER_QUERY_FIELD = 'order';

export const LAST_ORDER_COOKIE = 'propeller_last_order';
export const LAST_ORDER_MAX_AGE = 60 * 60;

export interface SingleField {
  operation: 'query' | 'mutation' | 'subscription';
  definition: OperationDefinitionNode;
  field: FieldNode;
}

export interface RoutingContext {
  query: unknown;
  variables: unknown;
  // X-Client-ID: order-editor was sent.
  orderEditorClient: boolean;
  // The auth cookie holds a structurally valid, unexpired token.
  hasSession: boolean;
  // No auth cookie at all.
  isAnonymous: boolean;
  // Order id from a verified last-order cookie.
  lastOrderId: number | null;
}

/** The one operation's one top-level field (ignoring __typename), or null. */
export function readSingleField(query: unknown): SingleField | null {
  if (typeof query !== 'string') return null;
  let doc;
  try {
    doc = parse(query, { noLocation: true });
  } catch {
    return null;
  }
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

function resolveArgument(single: SingleField, name: string, variables: unknown): unknown {
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
    default:
      // Lists / objects: a non-null value that never matches an id.
      return node.kind;
  }
}

function isRequestedLastOrder(single: SingleField, variables: unknown, lastOrderId: number): boolean {
  const orderId = resolveArgument(single, 'orderId', variables);
  if (orderId === undefined || orderId === null || orderId === '') return false;
  if (Number(orderId) !== lastOrderId) return false;
  // A UUID lookup could resolve a different order.
  const uuid = resolveArgument(single, 'orderUUID', variables);
  return uuid === undefined || uuid === null;
}

export function shouldUseOrderEditorKey(ctx: RoutingContext): boolean {
  const single = readSingleField(ctx.query);
  if (!single) return false;
  const name = single.field.name.value;
  if (single.operation === 'mutation') {
    if (ORDER_EDITOR_MUTATION_FIELDS.has(name)) return true;
    return ORDER_EDITOR_OPT_IN_MUTATION_FIELDS.has(name) && ctx.orderEditorClient && ctx.hasSession;
  }
  if (single.operation === 'query' && name === LAST_ORDER_QUERY_FIELD) {
    return ctx.isAnonymous && ctx.lastOrderId !== null && isRequestedLastOrder(single, ctx.variables, ctx.lastOrderId);
  }
  return false;
}

/** The new order id when the document is a cartProcess mutation, else null. */
export function placedOrderId(query: unknown, response: unknown): number | null {
  const single = readSingleField(query);
  if (!single || single.operation !== 'mutation' || single.field.name.value !== 'cartProcess') return null;
  const key = single.field.alias?.value ?? 'cartProcess';
  const data = (response as { data?: Record<string, { cartOrderId?: unknown } | null> } | null)?.data;
  const id = data?.[key]?.cartOrderId;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

function hmac(orderId: number, key: string): string {
  return createHmac('sha256', key).update(String(orderId)).digest('hex');
}

/** Cookie value `orderId.hmac`. */
export function signLastOrder(orderId: number, key: string): string {
  return `${orderId}.${hmac(orderId, key)}`;
}

/** The order id when the value's HMAC checks out, else null. */
export function verifyLastOrder(value: string | undefined | null, key: string): number | null {
  if (!value || !key) return null;
  const match = value.match(/^(\d{1,15})\.([0-9a-f]{64})$/);
  if (!match) return null;
  const orderId = Number(match[1]);
  const expected = Buffer.from(hmac(orderId, key), 'hex');
  const given = Buffer.from(match[2], 'hex');
  return timingSafeEqual(expected, given) ? orderId : null;
}
