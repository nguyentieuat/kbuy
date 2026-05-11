// hooks/useCartSummary.ts

import type { CartItem } from "../types/cart";

import { calculateCartTotals } from "../utils/cartTotals";
import { calculateOrderTotal } from "../utils/order";

export function useCartSummary(items: CartItem[]) {
  const totals = calculateCartTotals(items);

  const order = calculateOrderTotal({
    totalFinal: totals.totalFinal,
    totalChargeableWeight:
      totals.totalChargeableWeight,
  });

  return {
    ...totals,
    ...order,
  };
}
