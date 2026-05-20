// utils/cartTotals.ts

import type { CartItem } from "../types/cart";

export function calculateCartTotals(items: CartItem[]) {
  const totalChargeableWeight = items.reduce((sum, item) => {
    const variantWeight = item.variant?.shipping?.chargeableWeightGrams;

    const productWeight = item.product?.shipping?.chargeableWeightGrams;

    const weight = variantWeight ?? productWeight ?? 0;

    return sum + weight * item.quantity;
  }, 0);

  const totalOriginal = items.reduce((sum, item) => {
    const originalPrice =
      item.variant?.pricing.originalPrice || item.product.pricing.originalPrice;

    // nếu không có originalPrice thì dùng price
    const original =
      originalPrice ||
      item.variant?.pricing.price ||
      item.product.pricing.price ||
      0;

    return sum + Number(original) * item.quantity;
  }, 0);

  const totalFinal = items.reduce((sum, item) => {
    const price = Number(
      item.variant?.pricing.price ?? item.product.pricing.price ?? 0,
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
