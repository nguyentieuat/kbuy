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
    }
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
    }
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
      note?: string;
    }
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse(res);
  },

  async updateInternationalShipmentStatus(
    shipmentId: number,
    body: {
      status: string;
    }
  ) {
    const res = await fetch(
      `/api/admin/shipments/international/${shipmentId}/status`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      }
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
    }
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/dom-shipment`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    return handleResponse(res);
  },
};
