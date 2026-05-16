// components/admin/order-detail/Section.tsx

export default function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          background: "#fafafa",
          borderBottom: "1px solid #f0f0f0",
          fontSize: 13,
          fontWeight: 700,
          color: "#333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        {action}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
