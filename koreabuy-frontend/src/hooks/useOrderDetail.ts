// hooks/useOrderDetail.ts

import { useEffect, useState } from "react";

export type OrderLog = {
  id: number;
  status: string;
  note: string | null;
  location: string | null;
  handler: string;
  createdAt: string;
};

export type OrderItem = {
  id: number;
  productId: number;
  variantId: string | null;

  productName: string | null;
  variantName: string | null;

  image: string | null;
  sku: string | null;

  price: number;
  originalPrice: number;

  quantity: number;
  totalPrice: number;

  productLink: string | null;
};

export type OrderDetail = {
  id: number;

  orderCode: string;

  status: string;
  paymentStatus: string;
  paymentMethod: string;

  totalPrice: number;
  shippingFee: number;
  serviceFee: number;
  discountAmount: number;
  finalPrice: number;

  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;

  receiverAddress: string;
  receiverWard?: string;
  receiverProvince?: string;

  shippingMethod: string;
  shippingRegion?: string;

  note?: string;

  createdAt: string;
  confirmedAt?: string;

  items: OrderItem[];

  logs: OrderLog[];
};

export function useOrderDetail(orderCode?: string) {
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderCode) return;

    let cancelled = false;

    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/orders/${orderCode}`);

        if (!res.ok) {
          throw new Error("Không tải được đơn hàng");
        }

        const data = await res.json();

        if (!cancelled) {
          setOrder(data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
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
