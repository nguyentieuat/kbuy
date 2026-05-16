// components/admin/order-detail/OrderStatusSection.tsx

// components/admin/order-detail/OrderStatusSection.tsx

import { useState } from "react";

import type { OrderStatus } from "../types/adminOrder";

import Section from "./Section";
import StatusBadge from "./StatusBadge";

import {
  STATUS_CONFIG,
  STATUS_FLOW,
} from "../constants/adminOrder";

type Props = {
  status: OrderStatus;
  loading?: boolean;
  onSubmit: (data: {
    status: OrderStatus;
    note?: string;
    location?: string;
  }) => Promise<void> | void;
};

export default function OrderStatusSection({
  status,
  loading = false,
  onSubmit,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  const [newStatus, setNewStatus] =
    useState<OrderStatus>(status);

  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");

  const nextStatuses = STATUS_FLOW[status] ?? [];

  const handleSubmit = async () => {
    await onSubmit({
      status: newStatus,
      note: note || undefined,
      location: location || undefined,
    });

    setShowForm(false);
    setNote("");
    setLocation("");
  };

  return (
    <Section title="🔄 Cập nhật trạng thái">
      {nextStatuses.length > 0 ? (
        !showForm ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {nextStatuses.map((s) => {
              const cfg = STATUS_CONFIG[s];

              return (
                <button
                  key={s}
                  onClick={() => {
                    setNewStatus(s);
                    setShowForm(true);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `2px solid ${cfg.dot}`,
                    background: cfg.bg,
                    color: cfg.color,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  → {cfg.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: "#f8f9fa",
              borderRadius: 10,
              padding: 16,
              border: "1px solid #eee",
            }}
          >
            <p
              style={{
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              Chuyển sang:{" "}
              <StatusBadge status={newStatus} />
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <input
                className="form-control form-control-sm"
                placeholder="Ghi chú..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ borderRadius: 8, fontSize: 13 }}
              />

              <input
                className="form-control form-control-sm"
                placeholder="Vị trí (VD: Kho HCM)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ borderRadius: 8, fontSize: 13 }}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn btn-primary btn-sm"
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  {loading ? "Đang lưu..." : "Xác nhận"}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ borderRadius: 8 }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
          {status === "delivered"
            ? "✅ Đơn đã hoàn thành"
            : "❌ Đơn đã huỷ"}
        </p>
      )}
    </Section>
  );
}
