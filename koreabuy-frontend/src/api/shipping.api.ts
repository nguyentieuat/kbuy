// api/shipping.api.ts

// api/shipping.api.ts

export interface ShippingCalcParams {
  items: {
    productId: string | number;
    variantId: string | number | null;
    quantity: number;
  }[];
  provinceCode: number | null;
  wardCode?: number | string | null;
  method: "fast" | "standard";
  orderTotal?: number;
}

export interface ShippingCalcResult {
  method: string;
  weightGrams: number;
  weightUsed: number;
  region: string;
  internationalFee: number;
  localFee: number;
  localBaseFee: number;
  isFreeShipping: boolean;
  total: number;
  hasBulky: number;
  bulkyCount: number;
  bulkyFee: number;
  localDiscount: number;
  discountRule: string;
}

export async function fetchShippingFee(
  params: ShippingCalcParams,
): Promise<ShippingCalcResult> {
  const res = await fetch("/api/shipping/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Không thể tính phí vận chuyển");

  return res.json();
}
