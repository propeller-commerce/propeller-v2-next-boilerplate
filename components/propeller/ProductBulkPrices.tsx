import * as React from 'react';
import { ProductPrice, Contact, Customer } from 'propeller-sdk-v2';
import type { IDiscount } from 'propeller-sdk-v2';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { isContentHidden } from '@/composables/shared/utils/visibilityHelpers';

export interface ProductBulkPricesProps {
  /**
   * Bulk price tiers from the product.
   * Obtain from `product.bulkPrices`.
   */
  bulkPrices: ProductPrice[];

  /**
   * When true, net price (incl. tax) is the leading price.
   * Defaults to false — gross (excl. VAT) is shown.
   * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
   */
  includeTax?: boolean;

  /**
   * Controls portal visibility mode.
   * 'semi-closed' — component is hidden for anonymous users.
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user — used for semi-closed visibility. */
  user?: Contact | Customer | null;

  /** Tax zone code. Defaults to 'NL'. */
  taxZone?: string;

  /**
   * Override any UI string.
   * Available keys: title, quantityFrom, price, inclTax, exclTax
   */
  labels?: Record<string, string>;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface ProductBulkPricesState {
  isHidden: () => boolean;
  hasItems: () => boolean;
  getIncludeTax: () => boolean;
  getTierQuantity: (tier: ProductPrice) => number | null;
  getBulkPrices: () => ProductPrice[];
  getPrice: (tier: ProductPrice) => string;
  getQuantityLabel: (tier: ProductPrice, index: number) => string;
  getLabel: (key: string, fallback: string) => string;
}
function ProductBulkPrices(props: ProductBulkPricesProps) {
  function isHidden(): ReturnType<ProductBulkPricesState['isHidden']> {
    return isContentHidden(props.portalMode as string | undefined, props.user);
  }
  function getIncludeTax(): ReturnType<ProductBulkPricesState['getIncludeTax']> {
    return props.includeTax !== undefined ? !!props.includeTax : false;
  }
  function getTierQuantity(
    tier: ProductPrice
  ): ReturnType<ProductBulkPricesState['getTierQuantity']> {
    const discount = tier.discount as
      | (IDiscount & {
          quantityFrom?: number;
        })
      | undefined;
    return discount?.quantityFrom ?? tier.quantity ?? null;
  }
  function getBulkPrices(): ReturnType<ProductBulkPricesState['getBulkPrices']> {
    const rawAll = (props.bulkPrices as ProductPrice[]) || [];
    const all = rawAll.filter((tier) => {
      const t = tier as ProductPrice & {
        type?: string;
        discountType?: string;
      };
      const priceType =
        t.type ??
        (
          t.discount as
            | {
                type?: string;
              }
            | undefined
        )?.type;
      const discountType =
        t.discountType ??
        (
          t.discount as
            | {
                discountType?: string;
              }
            | undefined
        )?.discountType;
      return !(priceType === 'PRICESHEET' && discountType === 'LIST_PRICE_MIN');
    });
    if (all.length === 0) return [];
    const now = new Date();
    const groups = new Map<number, ProductPrice[]>();
    for (const tier of all) {
      const qty = getTierQuantity(tier);
      if (qty === null) continue;
      const list = groups.get(qty) || [];
      list.push(tier);
      groups.set(qty, list);
    }
    const filtered: ProductPrice[] = [];
    for (const [, prices] of groups) {
      const validDated: ProductPrice[] = [];
      const nullDated: ProductPrice[] = [];
      for (const tier of prices) {
        const discount = tier.discount as
          | (IDiscount & {
              validFrom?: string;
              validTo?: string;
            })
          | undefined;
        if (!discount) {
          filtered.push(tier);
          continue;
        }
        const validFrom = discount.validFrom ?? null;
        const validTo = discount.validTo ?? null;
        if (validFrom === null && validTo === null) {
          nullDated.push(tier);
          continue;
        }
        let isValid = true;
        if (validFrom !== null && now < new Date(validFrom)) isValid = false;
        if (isValid && validTo !== null && now > new Date(validTo)) isValid = false;
        if (isValid) validDated.push(tier);
      }
      if (validDated.length > 0) filtered.push(validDated[0]);
      else if (nullDated.length > 0) filtered.push(nullDated[0]);
    }
    filtered.sort((a, b) => (getTierQuantity(a) ?? 0) - (getTierQuantity(b) ?? 0));
    if (filtered.length === 1 && getTierQuantity(filtered[0]) === 1) return [];
    return filtered;
  }
  function hasItems(): ReturnType<ProductBulkPricesState['hasItems']> {
    return getBulkPrices().length > 0;
  }
  function getPrice(tier: ProductPrice): ReturnType<ProductBulkPricesState['getPrice']> {
    const useTax: boolean = getIncludeTax();
    const value: number | undefined = useTax ? tier.net : tier.gross;
    if (value === null || value === undefined) return '';
    return `\u20AC${Number(value).toFixed(2)}`;
  }
  function getQuantityLabel(
    tier: ProductPrice,
    index: number
  ): ReturnType<ProductBulkPricesState['getQuantityLabel']> {
    const prices = getBulkPrices();
    const discount = tier.discount as
      | (IDiscount & {
          quantityFrom?: number;
        })
      | undefined;
    const qty = discount?.quantityFrom || tier.quantity || 1;
    const nextTier = prices[index + 1];
    const nextDiscount = nextTier?.discount as
      | (IDiscount & {
          quantityFrom?: number;
        })
      | undefined;
    const nextQty = nextDiscount?.quantityFrom || nextTier?.quantity;
    if (nextQty) {
      return `${qty}\u2013${nextQty - 1}`;
    }
    return `${qty}+`;
  }
  return (
    <>
      {!isHidden() && hasItems() ? (
        <>
          <div
            className={`propeller-product-bulk-prices ${(props.className as string) || ''}`}
            data-include-tax={getIncludeTax() ? 'true' : 'false'}
          >
            {getLabel(props.labels, 'title', 'Volume pricing') ? (
              <h3 className="propeller-product-bulk-prices__title text-base font-semibold text-foreground mb-3">
                {getLabel(props.labels, 'title', 'Volume pricing')}
              </h3>
            ) : null}
            <div className="propeller-product-bulk-prices__table-wrapper overflow-hidden rounded-container border border-border">
              <table className="propeller-product-bulk-prices__table w-full text-sm">
                <thead className="propeller-product-bulk-prices__thead bg-muted/50">
                  <tr>
                    <th className="propeller-product-bulk-prices__th propeller-product-bulk-prices__th--quantity px-4 py-2 text-left font-medium text-muted-foreground">
                      {getLabel(props.labels, 'quantityFrom', 'Qty from')}
                    </th>
                    <th className="propeller-product-bulk-prices__th propeller-product-bulk-prices__th--price px-4 py-2 text-right font-medium text-muted-foreground">
                      {getLabel(props.labels, 'price', 'Price')}
                      <span className="propeller-product-bulk-prices__tax-label font-normal text-xs">
                        (
                        {getIncludeTax() ? (
                          <>{getLabel(props.labels, 'inclTax', 'incl. VAT')}</>
                        ) : (
                          <>{getLabel(props.labels, 'exclTax', 'excl. VAT')}</>
                        )}
                        )
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="propeller-product-bulk-prices__tbody divide-y divide-border">
                  {getBulkPrices()?.map((tier, index) => (
                    <tr className="propeller-product-bulk-prices__row bg-card hover:bg-muted/20 transition-colors" key={index}>
                      <td className="propeller-product-bulk-prices__cell propeller-product-bulk-prices__cell--quantity px-4 py-2 text-foreground font-medium">
                        {getQuantityLabel(tier, index)}
                      </td>
                      <td className="propeller-product-bulk-prices__cell propeller-product-bulk-prices__cell--price px-4 py-2 text-right text-foreground font-semibold">
                        {getPrice(tier)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default ProductBulkPrices;
