// components/admin/order-detail/OrderSummarySection.tsx

import Section from "./Section";
import SumRow from "./SumRow";

import { fmt } from "../../../utils/format";

type Props = {
  total_price: number;
  product_discount: number;
  discount_amount: number;

  coupon_code?: string | null;

  international_shipping_fee: number;
  local_shipping_fee: number;
  shipping_discount: number;

  service_fee: number;
  final_price: number;
};

export default function OrderSummarySection({
  total_price,
  product_discount,
  discount_amount,

  coupon_code,

  international_shipping_fee,
  local_shipping_fee,
  shipping_discount,

  service_fee,
  final_price,
}: Props) {
  const couponDiscount = Math.max(
    (discount_amount ?? 0) - (shipping_discount ?? 0),
    0,
  );

  return (
    <Section title="💰 Tổng tiền">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <SumRow
          label="Tổng giá gốc"
          value={fmt(total_price)}
        />

        {(product_discount ?? 0) > 0 && (
          <SumRow
            label="Giảm giá sản phẩm"
            value={`-${fmt(product_discount)}`}
            green
          />
        )}

        {coupon_code && couponDiscount > 0 && (
          <SumRow
            label={`Coupon (${coupon_code})`}
            value={`-${fmt(couponDiscount)}`}
            green
          />
        )}

        <div style={{ marginTop: 8 }}>
          <SumRow
            label="🚢 Phí vận chuyển quốc tế"
            value={fmt(international_shipping_fee)}
          />

          <SumRow
            label="🚚 Phí giao nội địa"
            value={fmt(local_shipping_fee)}
          />
        </div>

        {(shipping_discount ?? 0) > 0 && (
          <SumRow
            label="Giảm phí vận chuyển"
            value={`-${fmt(shipping_discount)}`}
            green
          />
        )}

        <SumRow
          label="Phí dịch vụ"
          value={fmt(service_fee)}
        />

        <div
          style={{
            borderTop: "1px dashed #eee",
            paddingTop: 8,
            marginTop: 4,
          }}
        >
          <SumRow
            label="Thành tiền"
            value={fmt(final_price)}
            bold
            red
          />
        </div>
      </div>
    </Section>
  );
}
