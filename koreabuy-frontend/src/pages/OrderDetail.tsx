// pages/OrderSuccessPage.tsx

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useOrderDetail } from "../hooks/useOrderDetail";
import TrackingTimeline from "../components/orders/TrackingTimeline";
import { useEffect } from "react";
import { normalizeImageUrl } from "../utils/image";
import { fmt } from "../utils/format";
import { useCart } from "../contexts/CartContext";
import {
  PAYMENT_OPTIONS,
  SHIPPING_OPTIONS,
} from "../components/checkout/constants";

export default function OrderDetail() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const fromCheckout = location.state?.fromCheckout === true;
  useEffect(() => {
    if (fromCheckout) {
      window.history.replaceState({}, "", location.pathname);
    }
  }, [fromCheckout, location.pathname]);

  const { order, loading } = useOrderDetail(orderCode);
  debugger;
  const { addToCart, clearCart } = useCart();

  const handleBuyAgain = async () => {
    try {
      clearCart();

      if (!order) return;

      for (const item of order.items) {
        // fetch latest product
        const res = await fetch(`/api/products/byid/${item.productId}`);
        if (!res.ok) continue;

        const data = await res.json();

        const product = data.data;

        // find latest variant
        const variant =
          product.variants?.find(
            (v: any) => String(v.id) === String(item.variantId),
          ) ?? null;

        // nếu variant cũ bị xoá
        if (item.variantId && !variant) {
          console.warn("Variant no longer exists");
          continue;
        }

        addToCart(product, variant, item.quantity);
      }

      navigate("/checkout");
    } catch (err) {
      console.error(err);
    }
  };

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
      <div className="container py-5" style={{ maxWidth: 1020 }}>
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
              #{order.orderCode}
            </div>
          </div>
        )}

        {order.logs?.length > 0 && <TrackingTimeline logs={order.logs} />}

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
            { label: "Người nhận", value: order.receiverName },
            { label: "Số điện thoại", value: `+84 ${order.receiverPhone}` },
            { label: "Địa chỉ", value: order.receiverAddress },
            {
              label: "Vận chuyển",
              value:
                SHIPPING_OPTIONS.find((opt) => opt.id === order.shippingMethod)
                  ?.name ?? order.shippingMethod,
            },
            {
              label: "Thanh toán",
              value: (() => {
                const opt = PAYMENT_OPTIONS.find(
                  (o) => o.id === order.paymentMethod,
                );
                return opt ? `${opt.icon} ${opt.name}` : order.paymentMethod;
              })(),
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
                    alt={item.productName ?? ""}
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
                  {item.productName}
                </p>
                {(item.variantName || item.variantNameKr) && (
                  <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
                    {item.variantName || item.variantNameKr}
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
                {fmt(item.totalPrice)}
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
            <span style={{ color: "#e53935" }}>{fmt(order.finalPrice)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex gap-3">
          <button
            onClick={handleBuyAgain}
            className="btn btn-outline-primary"
            style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
          >
            Mua lại
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
