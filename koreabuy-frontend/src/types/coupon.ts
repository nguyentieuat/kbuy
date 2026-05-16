// types/coupon.ts
export type AppliedCoupon = {
  id: number;
  code: string;
  discountType: "percent" | "fixed" | "freeship";
  discountValue: number;
};