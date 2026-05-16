// components/admin/order-detail/InfoRow.tsx

export default function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "#888", minWidth: 100, flexShrink: 0 }}>
        {label}:
      </span>
      <span
        style={{
          fontWeight: 500,
          fontFamily: mono ? "monospace" : undefined,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}