// components/admin/order-detail/OrderSummarySection.tsx

import Section from "./Section";
import SumRow from "./SumRow";

import { fmt } from "../../../utils/format";

type Props = {
  total_price: number;
  discount_amount: number;
  coupon_code?: string | null;
  shipping_fee: number;
  service_fee: number;
  final_price: number;
};

export default function OrderSummarySection({
  total_price,
  discount_amount,
  coupon_code,
  shipping_fee,
  service_fee,
  final_price,
}: Props) {
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

        {discount_amount > 0 && (
          <SumRow
            label="Giảm giá"
            value={`-${fmt(discount_amount)}`}
            green
          />
        )}

        {coupon_code && (
          <SumRow
            label={`Mã: ${coupon_code}`}
            value=""
          />
        )}

        <SumRow
          label="Phí vận chuyển"
          value={fmt(shipping_fee)}
        />

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