// components/checkout/CouponSection.tsx

import type { AppliedCoupon } from "../../types/coupon";

type Props = {
  coupon: string;
  setCoupon: (v: string) => void;
  couponApplied: AppliedCoupon | null;
  couponDiscount: number;
  shippingDiscount: number; 
  serviceDiscount: number; 
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
  shippingDiscount,
  serviceDiscount,
  couponError,
  couponLoading,
  onApply,
  onRemove,
  fmt,
}: Props) {
  
  // Hàm helper hiển thị nội dung giảm giá thông minh
  const renderDiscountText = () => {
    if (!couponApplied) return "";
    
    // Ép kiểu nếu type trong file định nghĩa hệ thống chưa cập nhật đủ 4 loại
    const type = couponApplied.discountType as string;

    if (type === "freeship") {
      return shippingDiscount > 0 
        ? `Miễn phí vận chuyển nội địa (-${fmt(shippingDiscount)})` 
        : "Miễn phí vận chuyển nội địa";
    }

    if (type === "service_fee") {
      return serviceDiscount > 0 
        ? `Giảm phí dịch vụ (-${fmt(serviceDiscount)})` 
        : "Giảm phí dịch vụ";
    }

    // Mặc định cho loại percent và fixed thông thường
    return `Giảm giá đơn hàng (-${fmt(couponDiscount)})`;
  };

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
                {couponApplied.code}
              </p>
              {/* Thay đổi dòng hiển thị cũ ở đây */}
              <p style={{ fontSize: 12, color: "#555", margin: 0, marginTop: 2 }}>
                {renderDiscountText()}
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