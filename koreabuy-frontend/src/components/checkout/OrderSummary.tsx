// components/checkout/OrderSummary.tsx

type Props = {
  totalQuantity: number;
  totalOriginal: number;
  totalProductDiscount: number;

  couponApplied: {
    id: number;
    code: string;

    discountType: "percent" | "fixed" | "freeship";

    discountValue: number;
  } | null;

  couponDiscount: number;
  shippingDiscount: number;

  shippingResult: any;
  shippingFee: number;

  localFee: number;
  localBaseFee: number;
  internationalFee: number;

  serviceFee: number;
  grandTotal: number;

  fmt: (n: number) => string;
};

export default function OrderSummary({
  totalQuantity,
  totalOriginal,
  totalProductDiscount,
  couponApplied,
  shippingDiscount,
  couponDiscount,
  shippingResult,
  shippingFee,
  localFee,
  localBaseFee,
  internationalFee,
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
        <span>{fmt(internationalFee)}</span>
      </div>

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

        <span>
          {!shippingResult ? (
            <span style={{ color: "#aaa" }}>Chọn địa chỉ</span>
          ) : shippingResult.isFreeShipping ? (
            <>
              <s style={{ color: "#aaa" }}>{fmt(localBaseFee)}</s>{" "}
              <span style={{ color: "#27ae60" }}>Miễn phí</span>
            </>
          ) : shippingResult.localDiscount > 0 ? (
            <>
              <s style={{ color: "#aaa" }}>{fmt(localBaseFee)}</s>{" "}
              {fmt(localFee)}
            </>
          ) : (
            fmt(localFee)
          )}
        </span>
      </div>

      {/* Badge giải thích freeship */}

      {shippingResult?.discountRule && (
        <div style={{ fontSize: 12, color: "#2e7d32", marginTop: 4 }}>
          {shippingResult.discountRule.name}
        </div>
      )}

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
        <span>Phí dịch vụ</span>
        <span>{fmt(serviceFee)}</span>
      </div>

      {/* bulky warning */}
      {shippingResult?.bulkyFee > 0 && (
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
          Tiết kiệm {fmt(totalProductDiscount + couponDiscount + shippingDiscount + (shippingResult?.localDiscount ?? 0))}
        </p>
      )}
    </div>
  );
}
