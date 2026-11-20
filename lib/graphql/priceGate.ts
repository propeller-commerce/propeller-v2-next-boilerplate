import { Kind, visit, type DocumentNode } from 'graphql';
import { COST_PRICE_KEYS } from '../catalog/hidePrices.ts';

/**
 * The only aliases the shop's own documents use: the SDK's `urlId: categoryId` (checked against
 * every installed SDK document by sdkDocuments.test.ts) and react-ui's root-machines query
 * (`machine_0: machine`, …).
 */
const ALLOWED_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^urlId$/, 'categoryId'],
  [/^machine_\d{1,3}$/, 'machine'],
];

export function isAllowedAlias(alias: string, field: string): boolean {
  return ALLOWED_ALIASES.some(([pattern, name]) => name === field && pattern.test(alias));
}

export interface DocumentGuards {
  /** Every field name selected anywhere in the document, fragments included. */
  fields: ReadonlySet<string>;
  /**
   * An alias the shop's own documents never use. Refused for viewers who may not see prices:
   * hidePrices works on response keys, so an alias can rename a price field (`p: price`) or put
   * any field under a key it keeps (`priceData { per: list }`, `priceData: products { … }`).
   */
  foreignAlias: boolean;
  /**
   * A price filter or PRICE sort written into the document instead of the variables: `price: {…}`
   * or `price: $v` inside an input object, a `PRICE` enum literal, or a sort `field: $v`. Counting
   * results per price range reveals exact prices. The SDK passes whole inputs as one variable,
   * which withoutPriceFilters cleans instead.
   */
  inlinePriceFilter: boolean;
  /**
   * An alias that could carry a cost past withoutCostPrices, which works by response key: on a cost
   * field or `discount`, or on any field inside a discount record. Refused for every viewer.
   */
  costPriceAlias: boolean;
}

const DISCOUNT_TYPES = new Set(['IDiscount', 'BulkCostPrice', 'BulkPrice', 'Discount']);

/**
 * One walk of a parsed browser document for the proxy's guards: the field names it selects
 * (introspection, never-forwarded and order-editor fields), aliases outside the shop's own and
 * inline price filters / PRICE sorts.
 */
export function inspectDocument(doc: DocumentNode): DocumentGuards {
  const fields = new Set<string>();
  const result = { fields, foreignAlias: false, inlinePriceFilter: false, costPriceAlias: false };
  let inDiscount = 0;
  let discountFragment = false;
  visit(doc, {
    [Kind.FIELD]: {
      enter(node) {
        const name = node.name.value;
        fields.add(name);
        if (node.alias && !isAllowedAlias(node.alias.value, name)) result.foreignAlias = true;
        if (node.alias && (COST_PRICE_KEYS.has(name) || name === 'discount' || inDiscount || discountFragment)) {
          result.costPriceAlias = true;
        }
        if (name === 'discount') inDiscount++;
      },
      leave(node) {
        if (node.name.value === 'discount') inDiscount--;
      },
    },
    [Kind.FRAGMENT_DEFINITION]: {
      enter(node) {
        discountFragment = DISCOUNT_TYPES.has(node.typeCondition.name.value);
      },
      leave() {
        discountFragment = false;
      },
    },
    [Kind.OBJECT_FIELD](node) {
      const name = node.name.value;
      const kind = node.value.kind;
      if (name === 'price' && (kind === Kind.OBJECT || kind === Kind.VARIABLE)) result.inlinePriceFilter = true;
      if (name === 'field' && kind === Kind.VARIABLE) result.inlinePriceFilter = true;
    },
    [Kind.ENUM](node) {
      if (node.value === 'PRICE') result.inlinePriceFilter = true;
    },
  });
  return result;
}

const isPriceFilter = (key: string, value: unknown) =>
  key === 'price' && !!value && typeof value === 'object' && !Array.isArray(value);
// A sort object on PRICE, in a list or on its own (GraphQL coerces one object into a list).
const isPriceSort = (value: unknown) =>
  !!value && typeof value === 'object' && !Array.isArray(value) && (value as { field?: unknown }).field === 'PRICE';

/** Whether variables carry a price filter (`price: {from, to}`) or a sort on PRICE, at any depth. */
export function hasPriceFilter(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((v) => isPriceSort(v) || hasPriceFilter(v));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([k, v]) => isPriceFilter(k, v) || isPriceSort(v) || hasPriceFilter(v));
}

/** A copy of variables without price filters and PRICE sorts, for viewers who may not see prices. */
export function withoutPriceFilters(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => !isPriceSort(v)).map(withoutPriceFilters);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k, v]) => !isPriceFilter(k, v) && !isPriceSort(v))
      .map(([k, v]) => [k, withoutPriceFilters(v)]),
  );
}
