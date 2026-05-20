// components/checkout/constants.ts

import type {
  ShippingMethod,
  PaymentMethod,
} from "./types";

export const SHIPPING_OPTIONS: {
  id: ShippingMethod;
  icon: string;
  name: string;
  desc: string;
  baseFee: number;
}[] = [
  {
    id: "fast",
    icon: "⚡",
    name: "Giao hàng nhanh",
    desc: "Xuất kho ngay sau khi nhận hàng từ Hàn Quốc",
    baseFee: 300000,
  },
  {
    id: "standard",
    icon: "📦",
    name: "Giao hàng tiết kiệm",
    desc: "Gom đơn và xuất kho định kỳ mỗi tuần",
    baseFee: 150000,
  },
];

export const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  icon: string;
  name: string;
  desc: string;
}[] = [
  {
    id: "cod",
    icon: "💵",
    name: "Thanh toán khi nhận hàng (COD)",
    desc: "Trả tiền mặt khi nhận hàng",
  },
  {
    id: "qrpay",
    icon: "💳",
    name: "Thanh toán qua QR",
    desc: "Thanh toán bằng mã QR",
  },
];