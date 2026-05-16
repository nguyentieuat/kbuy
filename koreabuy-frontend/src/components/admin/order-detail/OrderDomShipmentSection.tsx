// components/admin/order-detail/OrderDomShipmentSection.tsx

import Section from "./Section";
import InfoRow from "./InfoRow";

import { fmt, fmtDate } from "../../../utils/format";
import { DOM_SHIPMENT_STATUS } from "../constants/adminOrder";

type Props = {
  domShipment?: any;

  showDomForm: boolean;

  domTracking: string;
  domCarrier: string;
  domUrl: string;
  domFee: string;
  domNote: string;

  domLoading: boolean;

  setShowDomForm: (v: boolean) => void;
  setDomTracking: (v: string) => void;
  setDomCarrier: (v: string) => void;
  setDomUrl: (v: string) => void;
  setDomFee: (v: string) => void;
  setDomNote: (v: string) => void;

  onCreateShipment: () => void;
};

export default function OrderDomShipmentSection({
  domShipment,

  showDomForm,

  domTracking,
  domCarrier,
  domUrl,
  domFee,
  domNote,

  domLoading,

  setShowDomForm,
  setDomTracking,
  setDomCarrier,
  setDomUrl,
  setDomFee,
  setDomNote,

  onCreateShipment,
}: Props) {
  return (
    <Section
      title="🚚 Vận chuyển nội địa"
      action={
        !domShipment && !showDomForm ? (
          <button
            onClick={() => setShowDomForm(true)}
            className="btn btn-outline-success btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
          >
            + Thêm tracking
          </button>
        ) : undefined
      }
    >
      {domShipment ? (
        <div>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              padding: "8px 12px",
              background: "#f0fff4",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>🚚</span>

            <span
              style={{
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: 14,
                color: "#166534",
              }}
            >
              {domShipment.tracking_code}
            </span>

            <span
              style={{
                marginLeft: "auto",
                padding: "2px 8px",
                borderRadius: 20,
                background: "#dcfce7",
                color: "#166534",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {DOM_SHIPMENT_STATUS[domShipment.status] ??
                domShipment.status}
            </span>
          </div>

          {/* Info */}
          {domShipment.carrier && (
            <InfoRow label="Đơn vị" value={domShipment.carrier} />
          )}

          {domShipment.shipping_fee > 0 && (
            <InfoRow
              label="Phí ship"
              value={fmt(domShipment.shipping_fee)}
            />
          )}

          {domShipment.tracking_url && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  color: "#888",
                  minWidth: 100,
                  flexShrink: 0,
                }}
              >
                Link tracking:
              </span>

              <a
                href={domShipment.tracking_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#007bff",
                  wordBreak: "break-all",
                }}
              >
                {domShipment.tracking_url}
              </a>
            </div>
          )}

          {domShipment.note && (
            <InfoRow label="Ghi chú" value={domShipment.note} />
          )}

          {domShipment.shipped_at && (
            <InfoRow
              label="Ngày lấy"
              value={fmtDate(domShipment.shipped_at)}
            />
          )}

          {domShipment.delivered_at && (
            <InfoRow
              label="Ngày giao"
              value={fmtDate(domShipment.delivered_at)}
            />
          )}
        </div>
      ) : showDomForm ? (
        <div
          style={{
            background: "#f8f9fa",
            borderRadius: 10,
            padding: 16,
            border: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <input
              className="form-control form-control-sm"
              placeholder="Mã tracking nội địa *"
              value={domTracking}
              onChange={(e) => setDomTracking(e.target.value)}
              style={{
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "monospace",
              }}
              autoFocus
            />

            <div className="row g-2">
              <div className="col-6">
                <input
                  className="form-control form-control-sm"
                  placeholder="Đơn vị (GHN, GHTK...)"
                  value={domCarrier}
                  onChange={(e) => setDomCarrier(e.target.value)}
                  style={{
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </div>

              <div className="col-6">
                <input
                  className="form-control form-control-sm"
                  type="number"
                  placeholder="Phí vận chuyển (VNĐ)"
                  value={domFee}
                  onChange={(e) => setDomFee(e.target.value)}
                  style={{
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <input
              className="form-control form-control-sm"
              placeholder="Link tracking (nếu có)"
              value={domUrl}
              onChange={(e) => setDomUrl(e.target.value)}
              style={{
                borderRadius: 8,
                fontSize: 13,
              }}
            />

            <input
              className="form-control form-control-sm"
              placeholder="Ghi chú"
              value={domNote}
              onChange={(e) => setDomNote(e.target.value)}
              style={{
                borderRadius: 8,
                fontSize: 13,
              }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onCreateShipment}
                disabled={domLoading || !domTracking.trim()}
                className="btn btn-success btn-sm"
                style={{ borderRadius: 8 }}
              >
                {domLoading ? "Đang lưu..." : "Lưu"}
              </button>

              <button
                onClick={() => setShowDomForm(false)}
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
          Chưa có tracking nội địa
        </p>
      )}
    </Section>
  );
}
