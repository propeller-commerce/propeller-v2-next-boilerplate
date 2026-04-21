export function getStockStatus(quantity: number): { label: string; className: string } {
  if (quantity <= 0) return { label: 'Out of stock', className: 'text-red-600 bg-red-50' };
  if (quantity <= 5) return { label: 'Low stock', className: 'text-amber-600 bg-amber-50' };
  return { label: 'In stock', className: 'text-green-600 bg-green-50' };
}
