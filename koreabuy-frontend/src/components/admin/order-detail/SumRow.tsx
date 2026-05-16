// components/admin/order-detail/SumRow.tsx

export default function SumRow({
  label,
  value,
  bold,
  red,
  green,
}: {
  label: string;
  value: string;
  bold?: boolean;
  red?: boolean;
  green?: boolean;
}) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
    >
      <span style={{ color: "#666" }}>{label}</span>
      <span
        style={{
          fontWeight: bold ? 700 : 400,
          color: red ? "#e53935" : green ? "#27ae60" : "#333",
        }}
      >
        {value}
      </span>
    </div>
  );
}