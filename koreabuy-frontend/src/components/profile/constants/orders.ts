// components/profile/constants/orders.ts

export const ORDER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "waiting_payment", label: "Chờ TT" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "processing", label: "Đang xử lý" },
  { key: "shipped", label: "Đang giao" },
  { key: "delivered", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã huỷ" },
];

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  waiting_payment: { label: "Chờ thanh toán", color: "#7b3fe4", bg: "#f3eeff" },
  pending: { label: "Chờ xác nhận", color: "#e59335", bg: "#fff8e1" },
  confirmed: { label: "Đã xác nhận", color: "#007bff", bg: "#e8f4ff" },
  processing: { label: "Đang xử lý", color: "#ff6b00", bg: "#fff3e8" },
  shipped: { label: "Đang giao", color: "#ff6b00", bg: "#fff3e8" },
  delivered: { label: "Hoàn thành", color: "#27ae60", bg: "#f0fff4" },
  cancelled: { label: "Đã huỷ", color:"#e53935", bg: "#fff0f0" },
};