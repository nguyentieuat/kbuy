// hooks/useOtpCheck.ts

import { useState } from "react";
import { check } from "../api/otp.api";

export function useOtpCheck() {
  const [loading, setLoading] = useState(false);

  const checkOtp = async ({
    phone,
    paymentMethod,
    grandTotal,
  }: {
    phone: string;
    paymentMethod: string;
    grandTotal: number;
  }) => {
    try {
      setLoading(true);

      const data = await check({
        phone,
        paymentMethod,
        grandTotal,
      });

      if (!data || typeof data.requireOtp !== "boolean") {
        throw new Error("Invalid OTP response");
      }

      return data.requireOtp;
    } finally {
      setLoading(false);
    }
  };

  return { checkOtp, loading };
}
