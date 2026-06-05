// components/checkout/OrderSummary.tsx

type Props = {
  totalQuantity: number;
  totalOriginal: number;
  totalProductDiscount: number;

  couponApplied: {
    id: number;
    code: string;
    discountType: "percent" | "fixed" | "freeship" | "service_fee";
    discountValue: number;
  } | null;

  couponDiscount: number;
  shippingDiscount: number;
  serviceDiscount: number;

  shippingResult: any;
  shippingFee: number;

  localFee: number;
  localBaseFee: number;
  internationalFee: number;

  serviceFee: number;
  grandTotal: number;

  totalMinOrderFeeVnd: number;
  minOrderFeeDetails: Array<{
    source: string;
    fee_vnd: number;
    name?: string;
    [key: string]: any;
  }>;

  fmt: (n: number) => string;
};

export default function OrderSummary({
  totalQuantity,
  totalOriginal,
  totalProductDiscount,
  couponApplied,
  shippingDiscount,
  serviceDiscount,
  couponDiscount,
  shippingResult,
  localFee,
  localBaseFee,
  internationalFee,
  serviceFee,
  grandTotal,
  totalMinOrderFeeVnd,
  minOrderFeeDetails,
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

      {/* Coupon giảm giá đơn hàng thông thường (percent / fixed) */}
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
      {/* HIỂN THỊ PHỤ PHÍ NỘI ĐỊA HÀN QUỐC (NẾU CÓ) */}
      {totalMinOrderFeeVnd > 0 && (
        <div
          style={{
            background: "#f9f9f9",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px dashed #ddd",
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
              color: "#d32f2f",
              marginBottom: 4,
            }}
          >
            <span>Phí giao hàng nội địa Hàn Quốc</span>
            <span>+{fmt(totalMinOrderFeeVnd)}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#666", fontSize: 12 }}>
            {minOrderFeeDetails.map((detail, idx) => (
              <li key={idx} style={{ marginBottom: 2 }}>
                Các sản phẩm <strong>{detail.source}</strong> chưa đạt mức freeship:{" "}
                <span style={{ color: "#d32f2f" }}>+{fmt(detail.fee_vnd)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        {/* Nếu phí dịch vụ được giảm hết (Miễn phí), ta gạch ngang số cũ */}
        <span>
          {serviceDiscount >= serviceFee && serviceFee > 0 ? (
            <s style={{ color: "#aaa" }}>{fmt(serviceFee)}</s>
          ) : (
            fmt(serviceFee)
          )}
        </span>
      </div>

      {/* HIỂN THỊ DÒNG GIẢM GIÁ PHÍ DỊCH VỤ (NẾU CÓ) */}
      {serviceDiscount > 0 && couponApplied && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 14,
            color: "#27ae60",
          }}
        >
          <span>Giảm phí dịch vụ ({couponApplied.code})</span>
          <span>-{fmt(serviceDiscount)}</span>
        </div>
      )}

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

      {/* Savings — Thêm điều kiện kiểm tra và cộng dồn serviceDiscount vào Tổng Tiết Kiệm */}
      {totalProductDiscount +
        couponDiscount +
        shippingDiscount +
        serviceDiscount >
        0 && (
        <p
          style={{
            textAlign: "right",
            fontSize: 12,
            color: "#27ae60",
            margin: 0,
          }}
        >
          Tiết kiệm{" "}
          {fmt(
            totalProductDiscount +
              couponDiscount +
              shippingDiscount +
              serviceDiscount +
              (shippingResult?.localDiscount ?? 0),
          )}
        </p>
      )}
    </div>
  );
}
