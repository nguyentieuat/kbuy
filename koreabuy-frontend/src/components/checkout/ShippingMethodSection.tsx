// components/checkout/ShippingMethodSection.tsx

import SectionCard from "./SectionCard";
import RadioCard from "./RadioCard";

import { SHIPPING_OPTIONS } from "./constants";

import { calculateShippingTotal, type Region } from "../../utils/shipping";

import type { CartItem } from "../../types/cart";

import type { ShippingMethod } from "./types";

type Props = {
  items: CartItem[];

  shipping: ShippingMethod;

  region: Region;

  couponApplied: {
    code: string;
    couponId: number;
  } | null;

  setShipping: (value: ShippingMethod) => void;

  setCouponDiscount: (value: number) => void;

  fmt: (n: number) => string;
};

export default function ShippingMethodSection({
  items,
  shipping,
  region,
  couponApplied,
  setShipping,
  setCouponDiscount,
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

              if (couponApplied?.code === "FREESHIP") {
                const shippingResult = calculateShippingTotal({
                  items,
                  method: opt.id,
                  region,
                });

                setCouponDiscount(shippingResult.total);
              }
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
