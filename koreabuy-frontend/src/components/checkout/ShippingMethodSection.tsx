// components/checkout/ShippingMethodSection.tsx

import SectionCard from "./SectionCard";
import RadioCard from "./RadioCard";
import { SHIPPING_OPTIONS } from "./constants";
import type { ShippingMethod } from "../../utils/shipping";

type Props = {
  shipping: ShippingMethod;
  setShipping: (v: ShippingMethod) => void;
  fastResult: any;
  fastLoading: boolean;
  standardResult: any;
  standardLoading: boolean;
  shippingDiscount: number | null;
  provinceCode: number | null;
  wardCode: number | null;
  fmt: (n: number) => string;
};
export default function ShippingMethodSection({
  shipping,
  setShipping,
  provinceCode,
  wardCode,
  fastResult,
  fastLoading,
  standardResult,
  standardLoading,
  shippingDiscount,
  fmt,
}: Props) {
  const feeMap: Record<ShippingMethod, number> = {
    fast: Math.max((fastResult?.result?.total ?? 0) - (shippingDiscount ?? 0), 0),
    standard: Math.max(
      (standardResult?.result?.total ?? 0) - (shippingDiscount ?? 0),
      0,
    ),
  };

  const loadingMap: Record<ShippingMethod, boolean> = {
    fast: fastLoading,
    standard: standardLoading,
  };

  return (
    <SectionCard title="Phương thức vận chuyển">
      <div className="d-flex flex-column gap-3">
        {SHIPPING_OPTIONS.map((opt) => (
          <RadioCard
            key={opt.id}
            selected={shipping === opt.id}
            onClick={() => setShipping(opt.id as ShippingMethod)}
            icon={opt.icon}
            name={opt.name}
            desc={opt.desc}
            right={
              !provinceCode
                ? "Chọn địa chỉ để xem phí"
                : loadingMap[opt.id as ShippingMethod]
                  ? "Đang tính..."
                  : fmt(feeMap[opt.id as ShippingMethod])
            }
          />
        ))}
      </div>
    </SectionCard>
  );
}
