type Prices = { price: number | null; specialPrice: number | null };
export function effectivePrice(product: Prices): number | null {
  for (const value of [product.specialPrice, product.price]) if (value !== null && Number.isFinite(value) && value >= 0) return value;
  return null;
}
export function comparePrice(a: Prices, b: Prices, descending = false): number {
  const left = effectivePrice(a), right = effectivePrice(b);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return descending ? right - left : left - right;
}
