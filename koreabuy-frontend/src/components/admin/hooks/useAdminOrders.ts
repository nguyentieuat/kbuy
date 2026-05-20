// hooks/useAdminOrders.ts

import { useCallback, useEffect, useState } from "react";
import { AdminOrderAPI } from "../../../api/adminOrder.api";
import type { Order, Pagination } from "../types/adminOrder";

type Filters = {
  page: number;
  status: string;
  search: string;
  payment: string;
};

export function useAdminOrders(filters: {
  page: number;
  status: string;
  search: string;
  payment: string;
  shipping_method: string,
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: "20",
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.payment && { payment: filters.payment }),
        ...(filters.shipping_method && { shipping_method: filters.shipping_method }),
      });
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.data ?? []);
      setPagination(
        data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.status, filters.search, filters.payment, filters.shipping_method]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);
  return { orders, pagination, loading, refetch: fetch_ };
}
