// components/admin/order-detail/StatusBadge.tsx

import { PAYMENT_STATUS_CONFIG, STATUS_CONFIG } from "../constants/adminOrder";

export default function StatusBadge({
  status,
  type = "order",
}: {
  status: string;
  type?: "order" | "payment";
}) {
  const cfg =
    type === "order"
      ? (STATUS_CONFIG[status] ?? {
          label: status,
          color: "#555",
          bg: "#f0f0f0",
          dot: "#888",
        })
      : (PAYMENT_STATUS_CONFIG[status] ?? {
          label: status,
          color: "#555",
          bg: "#f0f0f0",
        });
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {"dot" in cfg && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: (cfg as any).dot,
            flexShrink: 0,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
}