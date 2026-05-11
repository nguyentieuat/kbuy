// components/checkout/CouponSection.tsx

type Props = {
  coupon: string;
  setCoupon: (v: string) => void;

  couponApplied: string | null;
  couponDiscount: number;

  couponError: string;
  couponLoading: boolean;

  onApply: () => void;
  onRemove: () => void;

  fmt: (n: number) => string;
};

export default function CouponSection({
  coupon,
  setCoupon,
  couponApplied,
  couponDiscount,
  couponError,
  couponLoading,
  onApply,
  onRemove,
  fmt,
}: Props) {
  return (
    <div>
      <h6 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>
        Mã khuyến mãi
      </h6>

      {couponApplied ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderRadius: 8,
            background: "#f0fff4",
            border: "1px solid #27ae60",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  margin: 0,
                  color: "#27ae60",
                }}
              >
                {couponApplied}
              </p>
              <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                Giảm {fmt(couponDiscount)}
              </p>
            </div>
          </div>

          <button
            onClick={onRemove}
            style={{
              border: "none",
              background: "none",
              color: "#aaa",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập mã khuyến mãi..."
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onApply()}
              style={{ borderRadius: 8, fontSize: 13 }}
              disabled={couponLoading}
            />

            <button
              onClick={onApply}
              className="btn btn-outline-primary"
              disabled={couponLoading || !coupon.trim()}
              style={{
                borderRadius: 8,
                whiteSpace: "nowrap",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {couponLoading ? "..." : "Áp dụng"}
            </button>
          </div>

          {couponError && (
            <p style={{ color: "#e53935", fontSize: 12, marginTop: 6 }}>
              {couponError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
