import * as React from 'react';
import { ProductPrice, Product, ClusterOption, Contact, Customer, Enums } from 'propeller-sdk-v2';
import { getLabel } from '@/lib/helpers/labelHelpers';
import { isContentHidden } from '@/lib/helpers/visibilityHelpers';

export interface ProductPriceProps {
  /**
   * ProductPrice object from the product.
   * Obtain from `product.price`.
   */
  price: ProductPrice;

  /** Currency symbol to display. Defaults to '€'. */
  currency?: string;

  /**
   * Controls portal visibility mode.
   * 'open'        — full e-commerce; price is always visible.
   * 'semi-closed' — catalog-only; price is hidden for anonymous users.
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user — used for semi-closed visibility. */
  user?: Contact | Customer | null;

  /**
   * When true, net price (incl. tax) is the leading price.
   * When false (default), gross price (excl. tax) is the leading price.
   * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
   */
  includeTax?: boolean;

  /** Tax zone code. Defaults to 'NL'. */
  taxZone?: string;

  /** Cluster options (cluster.options). Required option default prices are added even without an active selection. */
  options?: ClusterOption[];

  /** Active option product selections — pass Object.values(selectedOptionProducts). Price updates on every change. */
  selectedOptionProducts?: Product[];

  /**
   * Override any UI string.
   * Available keys: inclTax, exclTax, loginToSeePrices
   */
  labels?: Record<string, string>;

  /** Tailwind text-size class for the leading price. Defaults to 'text-3xl'. */
  priceSize?: string;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface ProductPriceState {
  isHidden: () => boolean;
  getOptionsTotal: (useNet: boolean) => number;
  getLeadingPrice: () => string;
  getSecondaryPrice: () => string;
  getTaxLabel: () => string;
  getSecondaryTaxLabel: () => string;
  getLabel: (key: string, fallback: string) => string;
  formatPrice: (value: number | null | undefined) => string;
}
function ProductPriceDisplay(props: ProductPriceProps) {
  function isHidden(): ReturnType<ProductPriceState['isHidden']> {
    return isContentHidden(props.portalMode as string | undefined, props.user);
  }
  function formatPrice(
    value: number | null | undefined
  ): ReturnType<ProductPriceState['formatPrice']> {
    if (value === null || value === undefined) return '';
    const currency = (props.currency as string) || '\u20AC';
    return `${currency}${Number(value).toFixed(2)}`;
  }
  function getOptionsTotal(useNet: boolean): ReturnType<ProductPriceState['getOptionsTotal']> {
    const options = (props.options as ClusterOption[]) || [];
    const selected = (props.selectedOptionProducts as Product[]) || [];
    let total = 0;
    options.forEach((option: ClusterOption) => {
      if (option.hidden === Enums.YesNo.Y) return;

      // Find whether the user has selected a product in this option
      const selectedProduct = selected.find((p: Product) =>
        (option.products || []).some((op: Product) => op.productId === p.productId)
      );
      if (selectedProduct) {
        total += useNet ? selectedProduct.price?.net || 0 : selectedProduct.price?.gross || 0;
      } else if (option.isRequired === Enums.YesNo.Y && option.defaultProduct) {
        // option.defaultProduct may lack price data; look up the full
        // product record from option.products (which always has prices).
        const defaultId = (option.defaultProduct as Product).productId;
        const fullDefault =
          (option.products || []).find((p: Product) => p.productId === defaultId) ||
          option.defaultProduct;
        total += useNet
          ? (fullDefault as Product).price?.net || 0
          : (fullDefault as Product).price?.gross || 0;
      }
    });
    return total;
  }
  function getLeadingPrice(): ReturnType<ProductPriceState['getLeadingPrice']> {
    const price = props.price as ProductPrice;
    if (!price) return '';
    const useNet = !!props.includeTax;
    const base = useNet ? price.net : price.gross;
    if (base === null || base === undefined) return '';
    return formatPrice(base + getOptionsTotal(useNet));
  }
  function getSecondaryPrice(): ReturnType<ProductPriceState['getSecondaryPrice']> {
    const price = props.price as ProductPrice;
    if (!price) return '';
    const useNet = !props.includeTax; // opposite of leading
    const base = useNet ? price.net : price.gross;
    if (base === null || base === undefined) return '';
    return formatPrice(base + getOptionsTotal(useNet));
  }
  function getTaxLabel(): ReturnType<ProductPriceState['getTaxLabel']> {
    return props.includeTax ? getLabel(props.labels, 'inclTax', 'incl. VAT') : getLabel(props.labels, 'exclTax', 'excl. VAT');
  }
  function getSecondaryTaxLabel(): ReturnType<ProductPriceState['getSecondaryTaxLabel']> {
    return props.includeTax ? getLabel(props.labels, 'exclTax', 'excl. VAT') : getLabel(props.labels, 'inclTax', 'incl. VAT');
  }
  return (
    <div className={`propeller-product-price ${(props.className as string) || ''}`} data-hidden={isHidden() ? 'true' : 'false'}>
      {isHidden() ? (
        <p className="propeller-product-price__login-prompt text-sm text-muted-foreground italic">
          {getLabel(props.labels, 'loginToSeePrices', 'Log in to see prices')}
        </p>
      ) : null}
      {!isHidden() && !!getLeadingPrice() ? (
        <div className="propeller-product-price__content flex flex-col gap-0.5">
          <div className="propeller-product-price__primary flex items-baseline gap-2">
            <span
              className={`propeller-product-price__amount ${(props.priceSize as string) || 'text-3xl'} font-bold text-foreground`}
            >
              {getLeadingPrice()}
            </span>
            <span className="propeller-product-price__tax-label text-sm text-muted-foreground">{getTaxLabel()}</span>
          </div>
          {!!getSecondaryPrice() ? (
            <div className="propeller-product-price__secondary text-sm text-muted-foreground">
              {getSecondaryPrice()}
              {getSecondaryTaxLabel()}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ProductPriceDisplay;
