// components/VariantModal.tsx

import type { CartItem } from "../types/cart";
import type { ProductVariant } from "../types/product";

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};

type Props = {
  item: CartItem;
  onClose: () => void;
  onSelect: (variant: ProductVariant) => void;
};

export default function VariantModal({ item, onClose, onSelect }: Props) {
  const variants = (item.product.variants ?? []).filter((v) => v.is_active);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 1040,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          zIndex: 1050,
          padding: 24,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h6 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>
            Chọn phân loại
          </h6>
          <button
            onClick={onClose}
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

        {/* Tên sản phẩm */}
        <p style={{ fontSize: 14, color: "#555", marginBottom: 20 }}>
          {item.product.name}
        </p>

        {/* Danh sách variants */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {variants.map((v) => {
            const isSelected = item.variant?.id === v.id;
            const imageUrl = normalizeImageUrl(
              v.image_url ?? item.product.image,
            );
            const price = Number(v.price ?? 0);

            return (
              <div
                key={v.id}
                onClick={() => {
                  if (v.is_soldout) return;

                  // Nếu đang chọn variant này rồi thì bỏ qua
                  if (item.variant?.id === v.id) return;

                  onSelect(v);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  cursor: v.is_soldout ? "not-allowed" : "pointer",
                  opacity: v.is_soldout ? 0.5 : 1,
                  width: 100,
                }}
              >
                {/* Ảnh */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    overflow: "hidden",
                    position: "relative",
                    background: "#f8f8f8",
                    border: isSelected ? "2px solid #007bff" : "2px solid #eee",
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={v.name_vi ?? v.sku}
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
                        fontSize: 28,
                      }}
                    >
                      📦
                    </div>
                  )}
                  {v.is_soldout && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(255,255,255,0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#999",
                      }}
                    >
                      Hết hàng
                    </div>
                  )}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "#007bff",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>

                {/* Tên */}
                <span
                  style={{
                    fontSize: 12,
                    textAlign: "center",
                    lineHeight: 1.3,
                    color: isSelected ? "#007bff" : "#333",
                    fontWeight: isSelected ? 600 : 400,
                    wordBreak: "break-word",
                  }}
                >
                  {v.name_vi ?? v.sku}
                </span>

                {/* Giá */}
                {price > 0 && (
                  <span
                    style={{ fontSize: 12, color: "#e53935", fontWeight: 600 }}
                  >
                    {price.toLocaleString("vi-VN")}₫
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
