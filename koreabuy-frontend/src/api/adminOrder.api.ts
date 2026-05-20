// api/adminOrder.api.ts

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const handleResponse = async (res: Response) => {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

export const AdminOrderAPI = {
  // ─────────────────────────────────────
  // Orders
  // ─────────────────────────────────────

  async getOrders(params: URLSearchParams) {
    const res = await fetch(`/api/admin/orders?${params.toString()}`, {
      headers: getAuthHeaders(),
    });

    return handleResponse(res);
  },

  async getOrderDetail(orderId: number) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      headers: getAuthHeaders(),
    });

    return handleResponse(res);
  },

  async updateStatus(
    orderId: number,
    body: {
      status: string;
      note?: string;
      location?: string;
    },
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse(res);
  },

  async updatePayment(
    orderId: number,
    body: {
      payment_status: string;
    },
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/payment`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse(res);
  },

  // ─────────────────────────────────────
  // International shipment
  // ─────────────────────────────────────

  async createShipment(
    orderId: number,
    body: {
      tracking_code: string;
      carrier?: string;
      from_warehouse?: string;
      to_warehouse?: string;
      actual_cost_krw?: number;
      actual_weight_grams?: number;
      note?: string;
    },
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse(res);
  },

  // api/adminOrder.api.ts

  async createBulkShipment(payload: {
    order_ids: number[];
    tracking_code: string;
    carrier?: string;
    from_warehouse?: string;
    to_warehouse?: string;
    actual_cost_krw?: number;
    actual_weight_grams?: number;
    total_collected_fee: number;
    note?: string;
  }) {
    const res = await fetch(`/api/admin/shipments/international`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Tạo kiện thất bại");
    }

    return res.json();
  },

  async updateInternationalShipmentStatus(
    shipmentId: number,
    body: {
      status: string;
      additional_fee_krw?: number;
    },
  ) {
    const res = await fetch(
      `/api/admin/shipments/international/${shipmentId}/status`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      },
    );

    return handleResponse(res);
  },

  // ─────────────────────────────────────
  // Domestic shipment
  // ─────────────────────────────────────

  async createDomesticShipment(
    orderId: number,
    body: {
      tracking_code: string;
      carrier?: string;
      tracking_url?: string;
      shipping_fee?: number;
      note?: string;
    },
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/dom-shipment`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse(res);
  },
};
