// utils/order.ts

import { calculateKoreaShipping } from "./shipping";

export function calculateOrderTotal({
  totalFinal,
  totalChargeableWeight,
}: {
  totalFinal: number;
  totalChargeableWeight: number;
}) {
  const serviceFee = Math.round(totalFinal * 0.08);
  const shippingFee = calculateKoreaShipping(totalChargeableWeight);

  return {
    serviceFee,
    shippingFee,
    estimatedTotal: totalFinal + serviceFee + shippingFee,
  };
}
