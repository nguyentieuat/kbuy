// types/cart.ts

import type { Product, ProductVariant } from "./product";

export type CartItem = {
  id: string; // `${productId}-${variantId ?? "base"}`
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  estimatedWeightGrams?: number | null;
  packagingWeightGrams?: number | null;
  chargeableWeightGrams?: number | null;
};
