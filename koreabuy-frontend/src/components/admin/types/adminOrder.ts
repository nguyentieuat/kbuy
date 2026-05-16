// export types/adminOrder.ts

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type OrderLog = {
  id: number;
  status: string;
  note: string | null;
  location: string | null;
  handler_name: string | null;
  created_at: string;
};

export type OrderItem = {
  id: number;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  image: string | null;
  price: number;
  quantity: number;
  total_price: number;
};

export type IntShipment = {
  id: number;
  tracking_code: string;
  carrier: string | null;
  status: string;
  from_warehouse: string | null;
  to_warehouse: string | null;
  note: string | null;
  shipped_at: string | null;
  arrived_at: string | null;
};

export type DomShipment = {
  id: number;
  tracking_code: string;
  carrier: string | null;
  status: string;
  tracking_url: string | null;
  shipping_fee: number;
  note: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export type Order = {
  id: number;
  order_code: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_email: string | null;
  receiver_address: string;
  receiver_province: string | null;
  receiver_ward: string | null;
  shipping_method: string | null;
  shipping_region: string | null;
  total_price: number;
  service_fee: number;
  shipping_fee: number;
  discount_amount: number;
  final_price: number;
  coupon_code: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  logs?: OrderLog[];
  intShipment?: IntShipment | null;
  domShipment?: DomShipment | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
