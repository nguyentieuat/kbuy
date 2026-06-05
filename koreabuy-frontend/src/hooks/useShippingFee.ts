// hooks/useShippingFee.ts

import { useState, useEffect } from "react";
import { fetchShippingFee, type ShippingCalcResult } from "../api/shipping.api";
import type { ShippingMethod } from "../utils/shipping";
import type { CartItem } from "../types/cart";

export function useShippingFee({
  items,
  provinceCode,
  wardCode,
  method,
  orderTotal,
}: {
  items: CartItem[];
  provinceCode: number | null;
  wardCode: number | null;
  method: ShippingMethod;
  orderTotal: number;
}) {
  const [result, setResult] = useState<ShippingCalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chỉ dùng để trigger effect khi items thay đổi
  const itemsKey = items
    .map((i) => `${i.variant?.id ?? i.product.id}:${i.quantity}`)
    .join(",");

  useEffect(() => {
    if (!items.length) {
      setResult(null);
      return;
    }

    let cancelled = false;

    async function calc() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchShippingFee({
          // gửi items để BE tự tính weight, bulky từ DB
          items: items.map((i) => ({
            productId: i.product.id,
            variantId: i.variant?.id ?? null,
            quantity: i.quantity,
          })),
          provinceCode,
          wardCode,
          method,
          orderTotal,
        });

        debugger

        if (!cancelled) setResult(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    calc();

    return () => { cancelled = true; };
  }, [itemsKey, provinceCode, wardCode, method, orderTotal]);

  return { result, loading, error };
}