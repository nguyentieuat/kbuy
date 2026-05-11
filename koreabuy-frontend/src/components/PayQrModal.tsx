// components/PayQrModal.tsx

import { useState } from "react";
import { useQrPayment } from "../hooks/useQrPayment";

type OrderPayload = {
  orderId: string | number;
  grandTotal: number;
  phone: string;

  txnRef: string;
  qrUrl: string;

  bankInfo: {
    bankId: string;
    accountNo: string;
    accountName: string;
    amount: number;
    description: string;
  };
};

type Props = {
  orderPayload: OrderPayload;
  onSuccess: () => void;
  onClose: () => void;
};

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

export default function PayQrModal({
  orderPayload,
  onSuccess,
  onClose,
}: Props) {
  const {
    status,
    qrUrl,
    bankInfo,
    countdown,
    pollCount,
    manualCheck,
    regenerateQr,
  } = useQrPayment({
    orderId: orderPayload.orderId,

    initialTxnRef: orderPayload.txnRef,

    initialQrUrl: orderPayload.qrUrl,

    initialBankInfo: orderPayload.bankInfo,

    onPaid: onSuccess,
  });

  const minutes = Math.floor(countdown / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (countdown % 60).toString().padStart(2, "0");

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);

      setCopiedField(field);

      setTimeout(() => {
        setCopiedField(null);
      }, 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <>
      <div
        onClick={status === "checking" ? undefined : onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1040,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 16,
          zIndex: 1050,
          width: "min(420px, 95vw)",
          padding: "24px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="https://vietqr.io/img/VIETQR.svg"
              alt="VietQR"
              height={24}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              Thanh toán chuyển khoản
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={status === "checking"}
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

        {/* Số tiền */}
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "#f0f6ff",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#888" }}>Số tiền</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#e53935" }}>
            {fmt(orderPayload.grandTotal)}
          </span>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div className="spinner-border text-primary" role="status" />
            <p style={{ color: "#888", marginTop: 12, fontSize: 14 }}>
              Đang tạo mã QR...
            </p>
          </div>
        )}

        {/* QR Ready */}
        {status === "ready" && qrUrl && bankInfo && (
          <>
            {/* QR Image */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: 10,
                  borderRadius: 12,
                  border: "2px solid #007bff",
                  background: "#fff",
                }}
              >
                <img
                  src={qrUrl}
                  alt="VietQR"
                  width={220}
                  height={220}
                  style={{ display: "block", borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Thông tin tài khoản */}
            <div
              style={{
                background: "#f8f9fa",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                Hoặc chuyển khoản thủ công:
              </div>
              {[
                { label: "Ngân hàng", value: bankInfo.bankId },
                {
                  label: "Số tài khoản",
                  value: bankInfo.accountNo,
                  copy: true,
                },
                { label: "Tên TK", value: bankInfo.accountName },
                {
                  label: "Số tiền",
                  value: fmt(bankInfo.amount),
                  highlight: true,
                },
                {
                  label: "Nội dung CK",
                  value: bankInfo.description,
                  copy: true,
                  highlight: true,
                },
              ].map(({ label, value, copy, highlight }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{ color: "#888", flexShrink: 0, marginRight: 8 }}
                  >
                    {label}:
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        fontWeight: highlight ? 700 : 500,
                        color: highlight ? "#e53935" : "#333",
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </span>
                    {copy && (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => handleCopy(value, label)}
                          style={{
                            border: "1px solid #ddd",
                            background: "#fff",
                            borderRadius: 4,
                            padding: "1px 6px",
                            fontSize: 11,
                            cursor: "pointer",
                            color: "#555",
                            flexShrink: 0,
                          }}
                          title="Sao chép"
                        >
                          Copy
                        </button>

                        {copiedField === label && (
                          <div
                            style={{
                              position: "absolute",
                              top: -28,
                              right: 0,
                              background: "#333",
                              color: "#fff",
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Đã sao chép
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Countdown + polling status */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                fontSize: 12,
                color: "#aaa",
              }}
            >
              <span>
                QR hết hạn sau{" "}
                <span
                  style={{
                    color: countdown < 60 ? "#e53935" : "#007bff",
                    fontWeight: 700,
                  }}
                >
                  {minutes}:{seconds}
                </span>
              </span>
              <span style={{ color: "#27ae60" }}>
                ↻ Tự động kiểm tra ({pollCount})
              </span>
            </div>

            {/* Nút kiểm tra thủ công */}
            <button
              onClick={manualCheck}
              className="btn btn-primary w-100"
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Tôi đã chuyển khoản xong
            </button>
          </>
        )}

        {/* Checking */}
        {status === "checking" && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div className="spinner-border text-primary" role="status" />
            <p style={{ color: "#888", marginTop: 12, fontSize: 14 }}>
              Đang kiểm tra giao dịch...
            </p>
            <p style={{ fontSize: 12, color: "#aaa" }}>
              Vui lòng không đóng cửa sổ này
            </p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "#27ae60",
                marginBottom: 4,
              }}
            >
              Thanh toán thành công!
            </p>
            <p style={{ fontSize: 13, color: "#888" }}>
              Đang xử lý đơn hàng của bạn...
            </p>
          </div>
        )}

        {/* Expired */}
        {status === "expired" && (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⏱️</div>
            <p style={{ color: "#e53935", marginBottom: 4, fontWeight: 600 }}>
              Mã QR đã hết hạn
            </p>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
              Vui lòng tạo mã QR mới để tiếp tục
            </p>
            <button
              onClick={regenerateQr}
              className="btn btn-primary w-100"
              style={{ borderRadius: 8 }}
            >
              Tạo mã QR mới
            </button>
          </div>
        )}

        {/* Footer */}
        {status === "ready" && (
          <p
            style={{
              fontSize: 11,
              color: "#ccc",
              textAlign: "center",
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            Hỗ trợ tất cả ngân hàng Việt Nam qua VietQR
          </p>
        )}
      </div>
    </>
  );
}
