// components/admin/order-detail/BulkIntShipmentModal.tsx

import { useState } from "react";
import type { Order } from "../types/adminOrder";
import { fmt } from "../../../utils/format";

export default function BulkIntShipmentModal({
  selectedOrders,
  onClose,
  onDone,
}: {
  selectedOrders: Order[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const authH = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const handleSubmit = async () => {
    if (!trackingCode.trim()) {
      setError("Vui lòng nhập mã tracking");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/shipments/international", {
        method: "POST",
        headers: authH,
        body: JSON.stringify({
          tracking_code: trackingCode.trim(),
          carrier: carrier || null,
          from_warehouse: fromWarehouse || null,
          to_warehouse: toWarehouse || null,
          note: note || null,
          order_ids: selectedOrders.map((o) => o.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 300,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "#fff",
          borderRadius: 16,
          zIndex: 301,
          width: "min(560px,95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
          <div>
            <h6 style={{ fontWeight: 700, margin: 0 }}>
              🌏 Tạo kiện vận chuyển quốc tế
            </h6>
            <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>
              Gom {selectedOrders.length} đơn vào 1 kiện hàng
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#888",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Danh sách đơn được chọn */}
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#888",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Đơn hàng được gom ({selectedOrders.length})
            </p>
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
              }}
            >
              {selectedOrders.map((o, idx) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    fontSize: 13,
                    borderBottom:
                      idx < selectedOrders.length - 1
                        ? "1px solid #f5f5f5"
                        : "none",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                    #{o.order_code}
                  </span>
                  <span style={{ color: "#666" }}>{o.receiver_name}</span>
                  <span style={{ color: "#e53935", fontWeight: 600 }}>
                    {fmt(o.final_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#555",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Mã tracking quốc tế *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: KR2024051001"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                style={{
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "monospace",
                }}
                autoFocus
              />
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#555",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Đơn vị vận chuyển
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Korea Post, CJ..."
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div className="col-6">
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#555",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Kho gửi
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Seoul Warehouse"
                  value={fromWarehouse}
                  onChange={(e) => setFromWarehouse(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div className="col-6">
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#555",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Kho nhận
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Kho HCM"
                  value={toWarehouse}
                  onChange={(e) => setToWarehouse(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div className="col-6">
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#555",
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Ghi chú
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ghi chú thêm..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {error && (
            <p
              style={{
                color: "#e53935",
                fontSize: 12,
                marginTop: 12,
                marginBottom: 0,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={onClose}
              className="btn btn-outline-secondary"
              style={{ flex: 1, borderRadius: 8 }}
            >
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !trackingCode.trim()}
              className="btn btn-primary"
              style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
            >
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang tạo...
                </span>
              ) : (
                "Tạo kiện hàng"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

