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

  province: Province | null;
  ward: Ward | null;

  detail: string;
};

export type FormErrors = Partial<
  Record<keyof FormData | "address", string>
>;

export type SelectedAddress = {
  receiver_gender: "male" | "female" | "other";

  receiver_name?: string;
  receiver_phone?: string;

  province: Province;
  ward: Ward;
  detail: string;
};
