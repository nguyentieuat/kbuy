// components/admin/order-detail/BulkIntShipmentModal.tsx

import { useState } from "react";
import type { Order } from "../types/adminOrder";
import { AdminOrderAPI } from "../../../api/adminOrder.api";
import { fmt } from "../../../utils/format";
import { useNumberInput } from "../hooks/useNumberInput";
import { useToast } from "../../../hooks/useToast";

type Props = {
  selectedOrders: Order[];
  onClose: () => void;
  onDone: () => void;
};

export default function BulkIntShipmentModal({
  selectedOrders,
  onClose,
  onDone,
}: Props) {
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const costInput = useNumberInput();
  const weightInput = useNumberInput();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { show } = useToast();

  // Tổng cân ước tính từ các đơn
  const estimatedWeight = selectedOrders.reduce((sum, o) => {
    return sum + Number(o.actual_weight_grams ?? 0);
  }, 0);

  // Tổng phí ship quốc tế khách đã trả
  const totalCollectedFee = selectedOrders.reduce((sum, o) => {
    return sum + Number(o.international_shipping_fee ?? 0);
  }, 0);

  // Lợi nhuận ước tính
  const estimatedProfit =
    costInput.numValue > 0 ? totalCollectedFee - costInput.numValue : null;

  const handleSubmit = async () => {
    if (!tracking.trim()) {
      setError("Vui lòng nhập mã tracking");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await AdminOrderAPI.createBulkShipment({
        order_ids: selectedOrders.map((o) => o.id),
        tracking_code: tracking,
        carrier: carrier || "unknown",
        from_warehouse: fromWarehouse || undefined,
        to_warehouse: toWarehouse || undefined,
        actual_cost_krw: costInput.numValue || undefined,
        actual_weight_grams: weightInput.numValue * 1000 || undefined,
        total_collected_fee: totalCollectedFee,
        note: note || undefined,
      });

      show("Tạo vận chuyển quốc tế thành công", "success");

      onDone();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
      show(err?.response?.data?.message || "Tạo vận chuyển thất bại", "error");
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
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "min(560px, 95vw)",
          zIndex: 301,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h6 style={{ fontWeight: 700, margin: 0 }}>
            🌏 Tạo kiện quốc tế ({selectedOrders.length} đơn)
          </h6>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#888",
            }}
          >
            ✕
          </button>
        </div>

        {/* Danh sách đơn */}
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#555" }}>
            Đơn hàng trong kiện:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {selectedOrders.map((o) => (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#444",
                }}
              >
                <span style={{ fontFamily: "monospace", color: "#1d4ed8" }}>
                  #{o.order_code}
                </span>
                <span style={{ color: "#888" }}>
                  {o.receiver_name} —{" "}
                  {o.actual_weight_grams
                    ? `${(o.actual_weight_grams / 1000).toFixed(2)}kg`
                    : "?kg"}
                </span>
                <span style={{ color: "#27ae60", fontWeight: 600 }}>
                  {fmt(Number(o.international_shipping_fee ?? 0))}
                </span>
              </div>
            ))}
          </div>

          {/* Tổng */}
          <div
            style={{
              borderTop: "1px dashed #ddd",
              marginTop: 8,
              paddingTop: 8,
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
            }}
          >
            <span>Tổng ước tính</span>
            <span>{(estimatedWeight / 1000).toFixed(2)}kg</span>
            <span style={{ color: "#27ae60" }}>{fmt(totalCollectedFee)}</span>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            className="form-control form-control-sm"
            placeholder="Mã tracking quốc tế *"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            style={{ borderRadius: 8, fontSize: 13, fontFamily: "monospace" }}
            autoFocus
          />

          <input
            className="form-control form-control-sm"
            placeholder="Đơn vị vận chuyển (CJ, EMS, K-Packet...)"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            style={{ borderRadius: 8, fontSize: 13 }}
          />

          <div className="row g-2">
            <div className="col-6">
              <label
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Phí thực trả carrier (VNĐ)
              </label>
              <input
                className="form-control form-control-sm"
                inputMode="numeric"
                placeholder="0"
                value={costInput.display}
                onChange={costInput.onChange}
                style={{ borderRadius: 8, fontSize: 13, textAlign: "right" }}
              />
              {costInput.numValue > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#888",
                    marginTop: 2,
                    textAlign: "right",
                  }}
                ></div>
              )}
            </div>
            <div className="col-6">
              <label
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Cân nặng thực tế (kg)
              </label>
              <input
                className="form-control form-control-sm"
                inputMode="numeric"
                placeholder="0"
                value={weightInput.display}
                onChange={weightInput.onChange}
                style={{ borderRadius: 8, fontSize: 13, textAlign: "right" }}
              />
            </div>
          </div>

          {/* Preview lợi nhuận */}
          {costInput.numValue && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: estimatedProfit! >= 0 ? "#f0fdf4" : "#fff5f5",
                border: `1px solid ${estimatedProfit! >= 0 ? "#86efac" : "#fca5a5"}`,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>Khách đã trả</span>
                <span style={{ fontWeight: 600 }}>
                  {fmt(totalCollectedFee)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>Phí thực tế</span>
                <span style={{ fontWeight: 600, color: "#e53935" }}>
                  -{fmt(Number(costInput.numValue))}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px dashed #ddd",
                  marginTop: 6,
                  paddingTop: 6,
                  fontWeight: 700,
                }}
              >
                <span>Lợi nhuận ship</span>
                <span
                  style={{
                    color: estimatedProfit! >= 0 ? "#16a34a" : "#e53935",
                  }}
                >
                  {estimatedProfit! >= 0 ? "+" : ""}
                  {fmt(estimatedProfit!)}
                </span>
              </div>
            </div>
          )}

          <div className="row g-2">
            <div className="col-6">
              <input
                className="form-control form-control-sm"
                placeholder="Kho gửi"
                value={fromWarehouse}
                onChange={(e) => setFromWarehouse(e.target.value)}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <div className="col-6">
              <input
                className="form-control form-control-sm"
                placeholder="Kho nhận"
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                style={{ borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>

          <input
            className="form-control form-control-sm"
            placeholder="Ghi chú"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ borderRadius: 8, fontSize: 13 }}
          />

          {error && (
            <div style={{ color: "#e53935", fontSize: 13 }}>⚠️ {error}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSubmit}
              disabled={loading || !tracking.trim()}
              className="btn btn-primary"
              style={{ borderRadius: 8, flex: 1, fontWeight: 600 }}
            >
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang tạo...
                </span>
              ) : (
                `Tạo kiện (${selectedOrders.length} đơn)`
              )}
            </button>
            <button
              onClick={onClose}
              className="btn btn-outline-secondary"
              style={{ borderRadius: 8 }}
            >
              Huỷ
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
