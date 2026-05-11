// components/checkout/types.ts

import type { Province, Ward } from "../../hooks/useAddress";

export type ShippingMethod = "fast" | "standard";

export type PaymentMethod = "cod" | "qrpay";

export type FormData = {
  gender: "male" | "female";
  full_name: string;
  phone: string;
  email: string;
  note: string;
};

export type FormErrors = Partial<
  Record<keyof FormData | "address", string>
>;

export type SelectedAddress = {
  province: Province;
  ward: Ward;
  detail: string;
};
