// pages/OrderSuccessPage.tsx

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useOrderDetail } from "../hooks/useOrderDetail";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};

export default function OrderDetail() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const fromCheckout = location.state?.fromCheckout === true;

  const { order, loading, error } = useOrderDetail(orderCode);

  if (loading) {
    return (
      <div style={{ paddingTop: 120, textAlign: "center" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}>
      <div className="container py-5" style={{ maxWidth: 640 }}>
        {/* Success banner */}
        {fromCheckout && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              marginBottom: 16,
              border: "1px solid #eee",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
            <h5 style={{ fontWeight: 700, marginBottom: 6 }}>
              Đặt hàng thành công!
            </h5>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 16 }}>
              Cảm ơn bạn đã mua hàng. Chúng tôi sẽ xử lý đơn hàng sớm nhất.
            </p>
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                background: "#f0f6ff",
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 700,
                color: "#007bff",
              }}
            >
              #{order.order_code}
            </div>
          </div>
        )}

        {/* Thông tin đơn */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            border: "1px solid #eee",
          }}
        >
          <h6 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
            Thông tin giao hàng
          </h6>
          {[
            { label: "Người nhận", value: order.receiver_name },
            { label: "Số điện thoại", value: `+84 ${order.receiver_phone}` },
            { label: "Địa chỉ", value: order.receiver_address },
            {
              label: "Vận chuyển",
              value:
                order.shipping_method === "fast"
                  ? "⚡ Giao hàng nhanh (1–2 ngày)"
                  : "📦 Giao hàng tiết kiệm (3–5 ngày)",
            },
            {
              label: "Thanh toán",
              value:
                order.payment_method === "cod"
                  ? "💵 Thanh toán khi nhận hàng"
                  : "💳 Chuyển khoản VietQR",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 8,
                gap: 12,
              }}
            >
              <span style={{ color: "#888", flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 500, textAlign: "right" }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Sản phẩm */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            border: "1px solid #eee",
          }}
        >
          <h6 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
            Sản phẩm ({order.items.length})
          </h6>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: "1px solid #f5f5f5",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#f8f8f8",
                  flexShrink: 0,
                }}
              >
                {item.image ? (
                  <img
                    src={normalizeImageUrl(item.image)}
                    alt={item.product_name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    📦
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.product_name}
                </p>
                {item.variant_name && (
                  <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
                    {item.variant_name}
                  </p>
                )}
                <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>
                  x{item.quantity}
                </p>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#e53935",
                  flexShrink: 0,
                }}
              >
                {fmt(item.total_price)}
              </span>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 15,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            <span>Tổng cộng</span>
            <span style={{ color: "#e53935" }}>{fmt(order.final_price)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex gap-3">
          <button
            onClick={() => navigate("/orders")}
            className="btn btn-outline-primary"
            style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
          >
            Xem đơn hàng
          </button>
          <button
            onClick={() => navigate("/products")}
            className="btn btn-primary"
            style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
}
