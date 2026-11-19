import { Kind, type DocumentNode } from 'graphql';
import type { VerifiedViewer } from '../auth/viewer.ts';
import { inputArgument, isRequestedLastOrder, resolveArgument, toId, type SingleField } from './orderEditorRouting.ts';
import { documentHash } from './registrationRouting.ts';

// Order reads only for their owner. The storefront key may answer `order` / `orders` for anyone, so
// the proxy decides: the verified viewer's own orders, or this browser's last order for a guest, are
// read with the order-editor key and without the Bearer; every other order read is refused.

// Every Query field that returns an order, its addresses, revisions, tender, shipments, payments or PDF
// (live schema, 2026-11-19). Only the first four are ever served (as the SDK's documents, below); the
// rest the shop never sends, and the storefront key answers some of them for anyone.
export const ORDER_READ_FIELDS: ReadonlySet<string> = new Set([
  'order',
  'orders',
  'orderGetPDF',
  'quoteGetPDF',
  'orderAddress',
  'orderAddresses',
  'addressesByOrderId',
  'orderRevision',
  'orderRevisions',
  'tender',
  'shipment',
  'shipments',
  'shipmentItem',
  'shipmentItems',
  'payment',
  'payments',
]);

// sha256 of print(parse(document)) of the installed SDK's documents; orderReadRouting.test.ts checks
// them. Only these run with the order-editor key: it would run any other selection as well
// (Order.company → its contacts, a product's price for any company, cost prices).
export const ORDER_READ_DOCUMENT_HASHES: Readonly<Record<string, string>> = {
  order: '77fa18953b2fb00d852f3590b6f37f52e0fbe1b5fda3769666ab8bf818fa8d67',
  orders: '6d98254c16406c4bcf45c843ff50d0acf17e8205d221c52c50b75041cc387bbd',
  orderGetPDF: '0ba45ae37e76772ee44907fbcf5bc75ec0367053f5ad3859a58d65c5e27fdd2b',
  quoteGetPDF: 'b668082802f84663e95c1beab0d3d3246b52cbcac88d3b389d84ebfeb803d1e3',
};

// The statuses the shop's order lists ask for: react-ui useOrders' default (orders page, dashboard),
// QUOTATION (quotes page, dashboard) and REQUEST (quote requests). Never a draft: the order-editor key
// skips Propeller's own visibility rules (public orders, no DRAFT_*, the public revision).
export const LISTED_ORDER_STATUSES: ReadonlySet<string> = new Set(['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER', 'QUOTATION', 'REQUEST']);

export interface OrderReadContext {
  /** null: no token, or one upstream did not accept. */
  viewer: VerifiedViewer | null;
  /** From the verified last-order cookie. */
  lastOrderId: number | null;
  variables: unknown;
  /** The order-editor key's answer to ORDER_OWNER_QUERY for `orderId`; may throw. */
  lookupOwner: (orderId: number) => Promise<unknown>;
}

/** Whether the document reads orders anywhere. A lone mutation (cartProcess's placed order) does not. */
export function isOrderRead(doc: DocumentNode, fields: ReadonlySet<string>): boolean {
  const operations = doc.definitions.filter((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (operations.length === 1 && operations[0].operation === 'mutation') return false;
  return [...ORDER_READ_FIELDS].some((f) => fields.has(f));
}

/**
 * Whether `ownerResponse` (ORDER_OWNER_QUERY's answer) shows an order the viewer placed that isn't a
 * draft (DRAFT_ORDER, DRAFT_QUOTATION, …). Errors, null and a missing status are no.
 */
export function isOwnOrder(ownerResponse: unknown, viewer: { userId: number }): boolean {
  const order = (ownerResponse as { data?: { order?: { userId?: unknown; status?: unknown } | null } | null } | null)
    ?.data?.order;
  return order?.userId === viewer.userId && typeof order.status === 'string' && !order.status.startsWith('DRAFT');
}

/**
 * `orders(input)` pinned to the viewer: userId exactly theirs, status only the listed ones, companyIds
 * (if any) only a contact's own companies.
 */
function isOwnSearch(input: Record<string, unknown> | null, viewer: VerifiedViewer): boolean {
  if (!input) return false;
  const statuses = Array.isArray(input.status) ? input.status : [input.status];
  if (!statuses.length || !statuses.every((s) => typeof s === 'string' && LISTED_ORDER_STATUSES.has(s))) return false;
  const userIds = Array.isArray(input.userId) ? input.userId : [input.userId];
  if (userIds.length !== 1 || userIds[0] !== viewer.userId) return false;
  if (input.companyIds === undefined || input.companyIds === null) return true;
  if (viewer.type !== 'Contact') return false;
  const companyIds = Array.isArray(input.companyIds) ? input.companyIds : [input.companyIds];
  return companyIds.every((id) => viewer.companyIds.includes(id as number));
}

/**
 * Whether an order-read document (isOrderRead) may run, with the order-editor key and without the
 * Bearer. Only the SDK's own order, orders, orderGetPDF and quoteGetPDF documents qualify:
 * - guest (no verified viewer): `order` of the signed last order, by id;
 * - verified viewer: `orders` pinned to them and the listed statuses, or one order (by id) whose
 *   owner, read with the order-editor key, is them and which isn't a draft. A failed or empty lookup is a no.
 */
export async function mayReadOrder(doc: DocumentNode, single: SingleField | null, ctx: OrderReadContext): Promise<boolean> {
  const hash = documentHash(doc);
  const name = Object.keys(ORDER_READ_DOCUMENT_HASHES).find((k) => ORDER_READ_DOCUMENT_HASHES[k] === hash);
  if (!name || !single) return false;
  const { viewer, variables } = ctx;
  if (!viewer) return name === 'order' && ctx.lastOrderId !== null && isRequestedLastOrder(single, variables, ctx.lastOrderId);
  if (name === 'orders') return isOwnSearch(inputArgument(single, variables), viewer);
  const orderId = toId(resolveArgument(single, 'orderId', variables));
  // ponytail: no lookup by UUID; the shop reads orders by id only.
  const uuid = resolveArgument(single, 'orderUUID', variables);
  if (!orderId || (uuid !== undefined && uuid !== null)) return false;
  try {
    return isOwnOrder(await ctx.lookupOwner(orderId), viewer);
  } catch {
    return false;
  }
}
