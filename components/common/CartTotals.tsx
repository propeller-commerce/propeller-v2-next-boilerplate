'use client';

import { Cart } from 'propeller-sdk-v2';

interface CartTotalsProps {
  cart: Cart;
  showCalculations?: boolean;
}

const formatPrice = (price: number) => {
  return `€${price.toFixed(2)}`;
};

export default function CartTotals({ cart, showCalculations = true }: CartTotalsProps) {
  if (!cart?.total) {
    return null;
  }

  const total = cart.total;
  const postageData = cart.postageData;
  const taxLevels = cart.taxLevels;
  const totalVAT = total.totalNet - total.totalGross;

  return (
    <div className="space-y-2">
      {showCalculations && (
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>{formatPrice(total.subTotal || 0)}</span>
        </div>
      )}

      {total.discount > 0 && showCalculations && (
        <div className="flex justify-between text-red-600">
          <span>Discount</span>
          <span>- {formatPrice(total.discount)}</span>
        </div>
      )}

      {showCalculations && (
        <div className="flex justify-between text-gray-700">
          <span>Shipping costs</span>
          <span>{formatPrice(postageData?.price || 0)}</span>
        </div>
      )}

      {showCalculations && (
        <div className="flex justify-between text-gray-700">
          <span>Total excl. VAT</span>
          <span>{formatPrice(total.totalGross)}</span>
        </div>
      )}

      {showCalculations && taxLevels?.map((taxLevel: any) =>
        taxLevel.price > 0 && taxLevel.taxPercentage > 0 ? (
          <div key={taxLevel.taxPercentage} className="flex justify-between text-gray-700">
            <span>{taxLevel.taxPercentage}% VAT</span>
            <span>{formatPrice(taxLevel.price)}</span>
          </div>
        ) : null
      )}

      {showCalculations && totalVAT > 0 && (
        <div className="flex justify-between text-gray-700">
          <span>Total VAT</span>
          <span>{formatPrice(totalVAT)}</span>
        </div>
      )}

      {showCalculations && (
        <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 mt-2">
          <span>Total</span>
          <span>{formatPrice(total.totalNet)}</span>
        </div>
      )}

      {!showCalculations && (
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>{formatPrice(total.totalNet)}</span>
        </div>
      )}
    </div>
  );
}
