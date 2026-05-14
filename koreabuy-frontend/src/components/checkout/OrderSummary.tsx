// components/checkout/OrderSummary.tsx

type Props = {
  totalQuantity: number;
  totalOriginal: number;
  totalProductDiscount: number;

  couponApplied: {
    code: string;
    couponId: number;
  } | null;
  couponDiscount: number;

  shippingResult: any;
  shippingFee: number;

  serviceFee: number;
  grandTotal: number;

  fmt: (n: number) => string;
};

export default function OrderSummary({
  totalQuantity,
  totalOriginal,
  totalProductDiscount,
  couponApplied,
  couponDiscount,
  shippingResult,
  shippingFee,
  serviceFee,
  grandTotal,
  fmt,
}: Props) {
  return (
    <div style={{ borderTop: "1px solid #eee", paddingTop: 14 }}>
      {/* Tổng tiền */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 14,
          color: "#555",
        }}
      >
        <span>Tổng tiền ({totalQuantity} sản phẩm)</span>
        <span>{fmt(totalOriginal)}</span>
      </div>

      {/* Giảm giá sản phẩm */}
      {totalProductDiscount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 14,
            color: "#27ae60",
          }}
        >
          <span>Giảm giá sản phẩm</span>
          <span>-{fmt(totalProductDiscount)}</span>
        </div>
      )}

      {/* Coupon */}
      {couponDiscount > 0 && couponApplied && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 14,
            color: "#27ae60",
          }}
        >
          <span>Mã giảm giá ({couponApplied.code})</span>

          <span>-{fmt(couponDiscount)}</span>
        </div>
      )}

      {/* Shipping quốc tế */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 14,
          color: "#555",
        }}
      >
        <span>Phí vận chuyển quốc tế</span>
        <span>{fmt(shippingResult.internationalFee)}</span>
      </div>

      {/* Shipping nội địa */}
      {/* Shipping nội địa */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 14,
          color: "#555",
        }}
      >
        <span>Phí vận chuyển nội địa VN</span>

        <span
          style={{
            color: couponApplied?.code === "FREESHIP" ? "#27ae60" : "#007bff",

            fontWeight: 600,
          }}
        >
          {couponApplied?.code === "FREESHIP" ? (
            <>
              <s style={{ color: "#aaa", fontWeight: 400 }}>
                {fmt(shippingResult.localFee)}
              </s>{" "}
              Miễn phí
            </>
          ) : (
            fmt(shippingFee)
          )}
        </span>
      </div>

      {/* Service fee */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 14,
          color: "#555",
        }}
      >
        <span>Phí nền tảng</span>
        <span>{fmt(serviceFee)}</span>
      </div>

      {/* bulky warning */}
      {shippingResult.bulkyFee > 0 && (
        <div
          style={{
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fff8e1",
            border: "1px solid #f5c542",
            fontSize: 12,
            color: "#8a6d1d",
            lineHeight: 1.5,
          }}
        >
          ⚠️ Một số sản phẩm trong đơn thuộc nhóm hàng cồng kềnh. Phí vận chuyển
          đã bao gồm phụ phí kích thước.
        </div>
      )}

      <div style={{ borderTop: "1px dashed #eee", margin: "12px 0" }} />

      {/* Grand total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 17,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        <span>Thành tiền</span>
        <span style={{ color: "#e53935" }}>
          {grandTotal > 0 ? fmt(grandTotal) : "Liên hệ"}
        </span>
      </div>

      {/* Savings */}
      {totalProductDiscount + couponDiscount > 0 && (
        <p
          style={{
            textAlign: "right",
            fontSize: 12,
            color: "#27ae60",
            margin: 0,
          }}
        >
          Tiết kiệm {fmt(totalProductDiscount + couponDiscount)}
        </p>
      )}
    </div>
  );
}
