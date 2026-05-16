// components/admin/export constants/adminOrder.ts

import type { OrderStatus } from "../types/adminOrder";


export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    color: "#92400e",
    bg: "#fef3c7",
    dot: "#f59e0b",
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "#1e40af",
    bg: "#dbeafe",
    dot: "#3b82f6",
  },
  processing: {
    label: "Đang xử lý",
    color: "#6b21a8",
    bg: "#f3e8ff",
    dot: "#9333ea",
  },
  shipped: {
    label: "Đang giao",
    color: "#9a3412",
    bg: "#ffedd5",
    dot: "#f97316",
  },
  delivered: {
    label: "Hoàn thành",
    color: "#166534",
    bg: "#dcfce7",
    dot: "#22c55e",
  },
  cancelled: {
    label: "Đã huỷ",
    color: "#991b1b",
    bg: "#fee2e2",
    dot: "#ef4444",
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  unpaid: { label: "Chưa TT", color: "#991b1b", bg: "#fee2e2" },
  paid: { label: "Đã TT", color: "#166534", bg: "#dcfce7" },
  refunded: { label: "Hoàn tiền", color: "#1e40af", bg: "#dbeafe" },
};

export const INT_SHIPMENT_STATUS: Record<string, string> = {
  preparing: "Đang chuẩn bị",
  shipped: "Đã gửi từ HQ",
  arrived_kr: "Đến kho KR",
  customs: "Đang thông quan",
  arrived_vn: "Đến kho VN",
  completed: "Hoàn tất",
};

export const DOM_SHIPMENT_STATUS: Record<string, string> = {
  pending_pickup: "Chờ lấy hàng",
  picked_up: "Đã lấy hàng",
  shipping: "Đang vận chuyển",
  delivered: "Đã giao",
  failed: "Giao thất bại",
};

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};