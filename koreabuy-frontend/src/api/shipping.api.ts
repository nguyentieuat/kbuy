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

export interface MinOrderFeeDetail {
  source: string;
  applied: boolean;
  name: string;
  fee_krw: number;
  fee_vnd: number;
  threshold_krw: number;
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
  totalMinOrderFeeVnd: number;
  minOrderFeeDetails: MinOrderFeeDetail[];
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
