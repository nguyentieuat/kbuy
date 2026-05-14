// hooks/useValidateCoupon.ts

import { useState } from "react";

type ValidatePayload = {
  code: string;

  userId?: number;

  email?: string;
  phone?: string;

  orderAmount: number;
  shippingFee: number;
};

export function useValidateCoupon() {
  const [loading, setLoading] = useState(false);

  const validateCoupon = async (
    payload: ValidatePayload,
  ) => {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/coupons/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Validate coupon failed",
        );
      }

      return data.data;
    } finally {
      setLoading(false);
    }
  };

  return {
    validateCoupon,
    loading,
  };
}
