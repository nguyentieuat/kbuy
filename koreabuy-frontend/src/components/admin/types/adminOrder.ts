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
  product_id: number;
  variant_id: number;
  product_name: string;
  product_name_kr: string;
  variant_name: string | null;
  variant_name_kr: string | null;
  sku: string | null;
  image: string | null;
  price: number;
  quantity: number;
  total_price: number;
  product_link: string | null;
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

  // 💰 Pricing
  total_price: number;
  product_discount: number;
  discount_amount: number;

  service_fee: number;

  // Shipping
  shipping_fee: number;
  international_shipping_fee: number;
  local_shipping_fee: number;
  shipping_discount: number;

  // Weight
  actual_weight_grams: number;
  chargeable_weight_grams?: number;
  weight_surplus_grams?: number;

  // Coupon
  coupon_code: string | null;

  // Final
  final_price: number;

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
