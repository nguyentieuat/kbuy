// components/admin/order-detail/OrderReceiverSection.tsx

import Section from "./Section";
import InfoRow from "./InfoRow";

type Props = {
  receiver_name: string;
  receiver_phone: string;
  receiver_email?: string | null;
  receiver_address: string;
  shipping_method?: string | null;
  note?: string | null;
};

export default function OrderReceiverSection({
  receiver_name,
  receiver_phone,
  receiver_email,
  receiver_address,
  shipping_method,
  note,
}: Props) {
  return (
    <Section title="📦 Thông tin người nhận">
      <InfoRow label="Tên" value={receiver_name} />

      <InfoRow label="SĐT" value={`+84 ${receiver_phone}`} />

      {receiver_email && (
        <InfoRow label="Email" value={receiver_email} />
      )}

      <InfoRow label="Địa chỉ" value={receiver_address} />

      {shipping_method && (
        <InfoRow
          label="Vận chuyển"
          value={
            shipping_method === "fast"
              ? "⚡ Nhanh"
              : "📦 Tiết kiệm"
          }
        />
      )}

      {note && (
        <InfoRow label="Ghi chú KH" value={note} />
      )}
    </Section>
  );
}
