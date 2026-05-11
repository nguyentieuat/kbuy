// utils/cartTotals.ts

import type { CartItem } from "../types/cart";

export function calculateCartTotals(items: CartItem[]) {
  const totalChargeableWeight = items.reduce((sum, item) => {
    const weight = item.product.shipping?.chargeableWeightGrams ?? 0;
    return sum + weight * item.quantity;
  }, 0);

  const totalOriginal = items.reduce((sum, item) => {
    const original = Number(
      item.variant?.original_price ??
      item.product.originalPrice ??
      item.variant?.price ??
      item.product.price ??
      0,
    );
    return sum + original * item.quantity;
  }, 0);

  const totalFinal = items.reduce((sum, item) => {
    const price = Number(
      item.variant?.price ?? item.product.price ?? 0,
    );
    return sum + price * item.quantity;
  }, 0);

  const totalDiscount = totalOriginal - totalFinal;

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  return {
    totalChargeableWeight,
    totalOriginal,
    totalFinal,
    totalDiscount,
    totalQuantity,
  };
}
