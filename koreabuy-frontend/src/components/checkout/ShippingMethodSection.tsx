// components/checkout/ShippingMethodSection.tsx

import SectionCard from "./SectionCard";
import RadioCard from "./RadioCard";

import { SHIPPING_OPTIONS } from "./constants";

import { calculateShippingTotal } from "../../utils/shipping";
import type { AppliedCoupon } from "../../types/coupon";

type Props = {
  items: any[];
  shipping: string;
  region: any;

  couponApplied: AppliedCoupon | null;

  setShipping: (v: any) => void;
  fmt: (n: number) => string;
};

export default function ShippingMethodSection({
  items,
  shipping,
  region,
  couponApplied,
  setShipping,
  fmt,
}: Props) {
  return (
    <SectionCard title="Phương thức vận chuyển">
      <div className="d-flex flex-column gap-3">
        {SHIPPING_OPTIONS.map((opt) => (
          <RadioCard
            key={opt.id}
            selected={shipping === opt.id}
            onClick={() => {
              setShipping(opt.id);
            }}
            icon={opt.icon}
            name={opt.name}
            desc={opt.desc}
            right={fmt(
              calculateShippingTotal({
                items,
                method: opt.id,
                region,
              }).total,
            )}
          />
        ))}
      </div>
    </SectionCard>
  );
}
