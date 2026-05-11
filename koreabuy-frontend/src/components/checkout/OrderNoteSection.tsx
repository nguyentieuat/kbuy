// components/checkout/OrderNoteSection.tsx

import SectionCard from "./SectionCard";

type Props = {
  note: string;
  onChange: (value: string) => void;
};

export default function OrderNoteSection({
  note,
  onChange,
}: Props) {
  return (
    <SectionCard title="Ghi chú đơn hàng">
      <textarea
        className="form-control"
        placeholder="Yêu cầu khác cho đơn hàng (nếu có)..."
        rows={3}
        value={note}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderRadius: 8,
          fontSize: 14,
          resize: "none",
        }}
      />
    </SectionCard>
  );
}
