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

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StatusCounts = Record<string, number>;

export function useOrders(
  authHeaders: Record<string, string>,
  status: string,
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);

  const fetchOrders = async (p = page) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: "10",
      });

      // chỉ append nếu không phải all
      if (status !== "all") {
        params.append("status", status);
      }

      const res = await fetch(`/api/orders/my?${params.toString()}`, {
        headers: authHeaders,
      });

      const data = await res.json();

      setOrders(data.data ?? []);

      setPagination(
        data.pagination ?? {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      );

      setStatusCounts(data.statusCounts ?? {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // reset page khi đổi tab
  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    fetchOrders(page);
  }, [page, status]);

  return {
    orders,
    loading,
    pagination,
    statusCounts,
    page,
    setPage,
    refetch: fetchOrders,
  };
}
