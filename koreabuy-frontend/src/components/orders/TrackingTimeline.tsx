// components/orders/TrackingTimeline.tsx

import type { OrderLog } from "../../hooks/useOrderDetail";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: string;
  }
> = {
  pending: {
    label: "Chờ xác nhận",
    color: "#e59335",
    bg: "#fff8e1",
    icon: "📋",
  },

  waiting_payment: {
    label: "Chờ thanh toán",
    color: "#7b3fe4",
    bg: "#f3eeff",
    icon: "💳",
  },

  confirmed: {
    label: "Đã xác nhận",
    color: "#007bff",
    bg: "#e8f4ff",
    icon: "✅",
  },

  processing: {
    label: "Đang đóng gói",
    color: "#ff6b00",
    bg: "#fff3e8",
    icon: "📦",
  },

  shipped: {
    label: "Đang vận chuyển",
    color: "#ff6b00",
    bg: "#fff3e8",
    icon: "🚚",
  },

  delivered: {
    label: "Đã giao hàng",
    color: "#27ae60",
    bg: "#f0fff4",
    icon: "🏠",
  },

  cancelled: {
    label: "Đã huỷ",
    color: "#e53935",
    bg: "#fff0f0",
    icon: "❌",
  },
};

type Props = {
  logs: OrderLog[];
};

export default function TrackingTimeline({ logs }: Props) {
  if (!logs?.length) return null;
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      border: "1px solid #eee",
    }}>
      <h6 style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
        🚚 Lịch sử vận chuyển
      </h6>

      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          left: 15,
          top: 20,
          bottom: 20,
          width: 2,
          background: "#eee",
          zIndex: 0,
        }} />

        {[...logs].reverse().map((log, idx) => {
          const cfg = STATUS_CONFIG[log.status] ?? {
            label: log.status, color: "#888", bg: "#f5f5f5", icon: "📌",
          };
          const isLatest = idx === 0;

          return (
            <div
              key={log.id}
              style={{
                display: "flex",
                gap: 12,
                marginBottom: idx < logs.length - 1 ? 20 : 0,
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Icon node */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: isLatest ? cfg.bg : "#f5f5f5",
                border: `2px solid ${isLatest ? cfg.color : "#eee"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
                boxShadow: isLatest ? `0 0 0 3px ${cfg.bg}` : "none",
                transition: "all 0.3s",
              }}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: isLatest ? 700 : 500,
                    color: isLatest ? cfg.color : "#333",
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0, marginLeft: 8 }}>
                    {new Date(log.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {log.note && (
                  <p style={{ fontSize: 12, color: "#555", margin: "3px 0 0" }}>
                    {log.note}
                  </p>
                )}

                {log.location && (
                  <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
                    📍 {log.location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
