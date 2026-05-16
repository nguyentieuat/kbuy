// components/admin/order-detail/OrderLogsSection.tsx

import type { OrderLog, OrderStatus } from "../types/adminOrder";

import Section from "./Section";

import { STATUS_CONFIG } from "../constants/adminOrder";
import { fmtDate } from "../../../utils/format";

type Props = {
  logs?: OrderLog[];
};

export default function OrderLogsSection({
  logs = [],
}: Props) {
  if (!logs.length) return null;

  return (
    <Section title="📋 Lịch sử trạng thái">
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 11,
            top: 16,
            bottom: 16,
            width: 2,
            background: "#f0f0f0",
          }}
        />

        {[...logs].reverse().map((log, idx) => {
          const cfg = STATUS_CONFIG[log.status as OrderStatus] ?? {
            dot: "#888",
            label: log.status,
            color: "#555",
            bg: "#f0f0f0",
          };

          return (
            <div
              key={log.id}
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: idx === 0 ? cfg.bg : "#f5f5f5",
                  border: `2px solid ${
                    idx === 0 ? cfg.dot : "#e0e0e0"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: idx === 0 ? cfg.dot : "#ccc",
                  }}
                />
              </div>

              <div style={{ flex: 1, paddingTop: 2 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: idx === 0 ? cfg.color : "#555",
                    }}
                  >
                    {cfg.label}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      color: "#aaa",
                    }}
                  >
                    {fmtDate(log.created_at)}
                  </span>
                </div>

                {log.note && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#666",
                      margin: "3px 0 0",
                    }}
                  >
                    {log.note}
                  </p>
                )}

                {log.location && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "#999",
                      margin: "2px 0 0",
                    }}
                  >
                    📍 {log.location}
                  </p>
                )}

                {log.handler_name && (
                  <p
                    style={{
                      fontSize: 11,
                      color: "#bbb",
                      margin: "2px 0 0",
                    }}
                  >
                    👤 {log.handler_name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
