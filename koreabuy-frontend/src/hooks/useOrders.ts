// hooks/useOrders.ts

import { useEffect, useState } from "react";

export type Order = {
  id: number;
  orderCode: string;
  status: string;
  paymentStatus: string;
  finalPrice: number;
  createdAt: string;

  items: {
    product_name: string;
    image: string | null;
    quantity: number;
  }[];
};

export function useOrders(authHeaders: Record<string, string>) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders/my", {
        headers: authHeaders,
      });

      const data = await res.json();
      setOrders(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    refetch: fetchOrders,
  };
}
