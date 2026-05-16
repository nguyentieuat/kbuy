// components/admin/order-detail/OrderShipmentSection.tsx

import Section from "./Section";
import InfoRow from "./InfoRow";
import { fmtDate } from "../../../utils/format";
import { INT_SHIPMENT_STATUS } from "../constants/adminOrder";

type Props = {
  intShipment?: any;
  showIntForm: boolean;

  intTracking: string;
  intCarrier: string;
  intFrom: string;
  intTo: string;
  intNote: string;

  intLoading: boolean;
  intStatusLoading: boolean;

  setShowIntForm: (v: boolean) => void;
  setIntTracking: (v: string) => void;
  setIntCarrier: (v: string) => void;
  setIntFrom: (v: string) => void;
  setIntTo: (v: string) => void;
  setIntNote: (v: string) => void;

  onCreateShipment: () => void;
  onUpdateStatus: (status: string) => void;
};

const STEPS = [
  "preparing",
  "shipped",
  "arrived_kr",
  "customs",
  "arrived_vn",
  "completed",
];

const NEXT_STEP: Record<
  string,
  {
    status: string;
    label: string;
    color: string;
    bg: string;
    icon: string;
  }
> = {
  preparing: {
    status: "shipped",
    label: "Đã gửi từ Hàn Quốc",
    icon: "✈️",
    color: "#1e40af",
    bg: "#dbeafe",
  },
  shipped: {
    status: "arrived_kr",
    label: "Đến kho Hàn Quốc",
    icon: "🏭",
    color: "#6b21a8",
    bg: "#f3e8ff",
  },
  arrived_kr: {
    status: "customs",
    label: "Đang thông quan",
    icon: "📋",
    color: "#92400e",
    bg: "#fef3c7",
  },
  customs: {
    status: "arrived_vn",
    label: "✅ Đã đến Việt Nam",
    icon: "🇻🇳",
    color: "#166534",
    bg: "#dcfce7",
  },
  arrived_vn: {
    status: "completed",
    label: "Hoàn tất — Đưa vào kho VN",
    icon: "🏠",
    color: "#166534",
    bg: "#dcfce7",
  },
};

export default function OrderShipmentSection({
  intShipment,
  showIntForm,

  intTracking,
  intCarrier,
  intFrom,
  intTo,
  intNote,

  intLoading,
  intStatusLoading,

  setShowIntForm,
  setIntTracking,
  setIntCarrier,
  setIntFrom,
  setIntTo,
  setIntNote,

  onCreateShipment,
  onUpdateStatus,
}: Props) {
  return (
    <Section
      title="🌏 Vận chuyển quốc tế"
      action={
        !intShipment && !showIntForm ? (
          <button
            onClick={() => setShowIntForm(true)}
            className="btn btn-outline-primary btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
          >
            + Thêm tracking
          </button>
        ) : undefined
      }
    >
      {intShipment ? (
        <div>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              padding: "8px 12px",
              background: "#f0f6ff",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>📦</span>

            <span
              style={{
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: 14,
                color: "#1d4ed8",
              }}
            >
              {intShipment.tracking_code}
            </span>

            <span
              style={{
                marginLeft: "auto",
                padding: "2px 8px",
                borderRadius: 20,
                background: "#dbeafe",
                color: "#1e40af",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {INT_SHIPMENT_STATUS[intShipment.status] ??
                intShipment.status}
            </span>
          </div>

          {/* Info */}
          {intShipment.carrier && (
            <InfoRow label="Đơn vị" value={intShipment.carrier} />
          )}

          {intShipment.from_warehouse && (
            <InfoRow
              label="Kho gửi"
              value={intShipment.from_warehouse}
            />
          )}

          {intShipment.to_warehouse && (
            <InfoRow
              label="Kho nhận"
              value={intShipment.to_warehouse}
            />
          )}

          {intShipment.note && (
            <InfoRow label="Ghi chú" value={intShipment.note} />
          )}

          {intShipment.shipped_at && (
            <InfoRow
              label="Ngày gửi"
              value={fmtDate(intShipment.shipped_at)}
            />
          )}

          {intShipment.arrived_at && (
            <InfoRow
              label="Ngày đến VN"
              value={fmtDate(intShipment.arrived_at)}
            />
          )}

          {/* Progress */}
          {(() => {
            const s = intShipment.status;
            const next = NEXT_STEP[s];

            if (!next) return null;

            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "#aaa",
                      marginBottom: 4,
                    }}
                  >
                    {STEPS.map((step) => (
                      <span
                        key={step}
                        style={{
                          color: step === s ? "#1d4ed8" : "inherit",
                          fontWeight: step === s ? 700 : 400,
                        }}
                      >
                        {step === s ? "●" : "○"}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      height: 4,
                      background: "#f0f0f0",
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: "#3b82f6",
                        width: `${(STEPS.indexOf(s) / 5) * 100}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      color: "#ccc",
                      marginTop: 2,
                    }}
                  >
                    <span>Chuẩn bị</span>
                    <span>Gửi đi</span>
                    <span>Kho KR</span>
                    <span>HQ</span>
                    <span>VN</span>
                    <span>Xong</span>
                  </div>
                </div>

                <button
                  onClick={() => onUpdateStatus(next.status)}
                  disabled={intStatusLoading}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 8,
                    border: `1.5px solid ${next.color}`,
                    background: next.bg,
                    color: next.color,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: intStatusLoading ? 0.7 : 1,
                  }}
                >
                  {intStatusLoading ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <>
                      <span style={{ fontSize: 16 }}>{next.icon}</span>
                      Cập nhật: {next.label}
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>
      ) : showIntForm ? (
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: 10,
            padding: 16,
            border: "1px solid #eee",
          }}
        >
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
            💡 Để gom nhiều đơn vào 1 kiện, dùng{" "}
            <strong>"Chọn nhiều đơn"</strong> ở trang danh sách.
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
              placeholder="Mã tracking quốc tế *"
              value={intTracking}
              onChange={(e) => setIntTracking(e.target.value)}
              style={{
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "monospace",
              }}
              autoFocus
            />

            <input
              className="form-control form-control-sm"
              placeholder="Đơn vị vận chuyển"
              value={intCarrier}
              onChange={(e) => setIntCarrier(e.target.value)}
              style={{ borderRadius: 8, fontSize: 13 }}
            />

            <div className="row g-2">
              <div className="col-6">
                <input
                  className="form-control form-control-sm"
                  placeholder="Kho gửi"
                  value={intFrom}
                  onChange={(e) => setIntFrom(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div className="col-6">
                <input
                  className="form-control form-control-sm"
                  placeholder="Kho nhận"
                  value={intTo}
                  onChange={(e) => setIntTo(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>

            <input
              className="form-control form-control-sm"
              placeholder="Ghi chú"
              value={intNote}
              onChange={(e) => setIntNote(e.target.value)}
              style={{ borderRadius: 8, fontSize: 13 }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onCreateShipment}
                disabled={intLoading || !intTracking.trim()}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: 8 }}
              >
                {intLoading ? "Đang lưu..." : "Lưu"}
              </button>

              <button
                onClick={() => setShowIntForm(false)}
                className="btn btn-outline-secondary btn-sm"
                style={{ borderRadius: 8 }}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
          Chưa có tracking quốc tế
        </p>
      )}
    </Section>
  );
}
