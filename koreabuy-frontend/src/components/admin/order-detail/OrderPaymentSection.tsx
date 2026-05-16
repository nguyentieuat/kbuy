// components/admin/order-detail/PaymentSection.tsx

import Section from "./Section";
import StatusBadge from "./StatusBadge";

type Props = {
  paymentMethod?: string | null;
  paymentStatus: string;
  payLoading: boolean;
  onMarkPaid: () => void;
};

export default function PaymentSection({
  paymentMethod,
  paymentStatus,
  payLoading,
  onMarkPaid,
}: Props) {
  return (
    <Section title="💳 Thanh toán">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13 }}>
          <p style={{ margin: 0, color: "#555" }}>
            Phương thức:{" "}
            <strong>
              {paymentMethod === "cod"
                ? "💵 COD"
                : paymentMethod === "vietqr"
                  ? "🏦 VietQR"
                  : (paymentMethod ?? "—")}
            </strong>
          </p>

          <p style={{ margin: "4px 0 0", color: "#555" }}>
            Trạng thái:{" "}
            <StatusBadge status={paymentStatus} type="payment" />
          </p>
        </div>

        {paymentStatus === "unpaid" && (
          <button
            onClick={onMarkPaid}
            disabled={payLoading}
            className="btn btn-success btn-sm"
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            {payLoading ? "..." : "✓ Đánh dấu đã TT"}
          </button>
        )}
      </div>
    </Section>
  );
}