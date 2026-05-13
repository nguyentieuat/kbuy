// hooks/useSubmitOrder.ts

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import type { ShippingMethod, Region } from "../utils/shipping";

// ── Types ─────────────────────────────────────────────────────────────────────

type CustomerInfo = {
  gender: string;
  full_name: string;
  phone: string;
  email?: string;
  address: string;
  detailAddress?: string;
  ward?: string;
  wardCode?: number;
  province?: string;
  provinceCode?: number;
  region?: string
};

type OrderItem = {
  productId: number;
  variantId: number | null;
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  image?: string | null;
  originalPrice: number;
  price: number;
  quantity: number;
};

export type SubmitOrderPayload = {
  userId?: number;
  customer: CustomerInfo;
  items: OrderItem[];
  shipping: ShippingMethod;
  shippingFee: number;
  shippingRegion: Region;
  paymentMethod: "cod" | "qrpay";
  couponCode?: string | null;
  couponDiscount?: number;
  serviceFee?: number;
  totalFinal: number;
  grandTotal: number;
  note?: string;
  verifyToken?: string | null;
};

type OrderResult = {
  orderId: number;
  orderCode: string;
  finalPrice: number;
  payment?: {
    txnRef: string;
    qrUrl: string;
    bankInfo: Record<string, any>;
  };
};

type UseSubmitOrderReturn = {
  submitOrder: (payload: SubmitOrderPayload) => Promise<OrderResult | null>;
  submitting: boolean;
  error: string | null;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSubmitOrder(
  onQrSuccess?: (result: OrderResult) => void,
): UseSubmitOrderReturn {
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOrder = async (
    payload: SubmitOrderPayload,
  ): Promise<OrderResult | null> => {
    setSubmitting(true);
    setError(null);
    debugger
    try {
      const token = localStorage.getItem("token");
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Đặt hàng thất bại");
      }

      // ── QR → callback để hiện QR modal ───────────
      if (payload.paymentMethod === "qrpay" && data.payment) {
        onQrSuccess?.(data);

        return data;
      }

      // ── COD → navigate to order detail ───────────────
      clearCart();
      navigate(`/order/${data.orderCode}`, {
        state: {
          fromCheckout: true,
        },
      });
      return data;
    } catch (err: any) {
      const msg = err.message || "Có lỗi xảy ra, vui lòng thử lại";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitOrder, submitting, error };
}
