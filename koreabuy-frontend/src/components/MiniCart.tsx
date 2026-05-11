// components/MiniCart.tsx

import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};

export default function MiniCart({ onClose }: { onClose: () => void }) {
  const { items, totalPrice, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 340,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          Giỏ hàng ({items.length})
        </span>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#888",
          }}
        >
          ✕
        </button>
      </div>

      {/* Items */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "#aaa",
              fontSize: 14,
            }}
          >
            Giỏ hàng trống
          </div>
        ) : (
          items.map((item) => {
            const imageUrl = normalizeImageUrl(
              item.variant?.image_url ||
                item.product.image ||
                item.product.images?.[0]?.url,
            );

            const price = Number(
              item.variant?.price ?? item.product.price ?? 0,
            );
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid #f8f8f8",
                  alignItems: "center",
                }}
              >
                {/* Ảnh */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#f8f8f8",
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.product.name}
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

                {/* Thông tin */}
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
                    {item.product.name}
                  </p>
                  {item.variant && (
                    <p
                      style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}
                    >
                      {item.variant.name_vi ?? item.variant.sku}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#e53935",
                        fontWeight: 700,
                      }}
                    >
                      {price > 0
                        ? `${(price * item.quantity).toLocaleString("vi-VN")}₫`
                        : "Liên hệ"}
                    </span>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      x{item.quantity}
                    </span>
                  </div>
                </div>

                {/* Xóa */}
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#ccc",
                    fontSize: 16,
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: "#555" }}>Tổng cộng:</span>
            <span style={{ fontWeight: 700, color: "#e53935" }}>
              {totalPrice > 0
                ? `${totalPrice.toLocaleString("vi-VN")}₫`
                : "Liên hệ"}
            </span>
          </div>
          <button
            onClick={() => {
              navigate("/cart");
              onClose();
            }}
            className="btn btn-primary w-100"
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Xem giỏ hàng
          </button>
        </div>
      )}
    </div>
  );
}
