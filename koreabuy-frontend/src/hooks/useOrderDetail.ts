// hooks/useOrderDetail.ts

import { useEffect, useState } from "react";

export type OrderDetail = {
  id: number;
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  shipping_method: string;
  final_price: number;
  created_at: string;
  items: {
    id: number;
    product_name: string;
    variant_name: string | null;
    image: string | null;
    price: number;
    quantity: number;
    total_price: number;
  }[];
};

export function useOrderDetail(orderCode?: string) {
  const [order, setOrder] =
    useState<OrderDetail | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!orderCode) return;

    let cancelled = false;

    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/orders/${orderCode}`
        );

        if (!res.ok) {
          throw new Error("Không tải được đơn hàng");
        }

        const data = await res.json();

        if (!cancelled) {
          setOrder(data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Đã có lỗi xảy ra"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [orderCode]);

  return {
    order,
    loading,
    error,
  };
}