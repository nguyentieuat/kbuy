// components/cart/CartItemCard.tsx

import type { CartItem } from "../../types/cart";
import "./cartItemRow.css";

type Props = {
  item: CartItem;
  imageUrl: string;
  price: number;
  originalPrice: number;
  navigate: (path: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  setVariantModal: (item: CartItem) => void;
  handleRemoveItem: (id: string) => void;
};

export default function CartItemRow({
  item,
  imageUrl,
  price,
  originalPrice,
  navigate,
  updateQuantity,
  setVariantModal,
  handleRemoveItem,
}: Props) {
  const handleOpenVariant = async (item: CartItem) => {
    try {
      const res = await fetch(`/api/products/${item.product.slug}`);

      if (!res.ok) {
        throw new Error("Load product failed");
      }

      const data = await res.json();

      setVariantModal({
        ...item,
        product: data.data ?? data,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cart-row">
      {/* Ảnh */}
      <div
        className="cart-image"
        onClick={() => navigate(item.product.metadata.link)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={item.product.name} className="cart-img" />
        ) : (
          <div className="cart-empty">📦</div>
        )}
      </div>

      {/* Info */}
      <div className="cart-info">
        <p
          className="cart-name"
          onClick={() => navigate(item.product.metadata.link)}
        >
          {item.product.name}
        </p>

        {item.variant && (
          <button
            className="cart-variant-btn"
            onClick={() => handleOpenVariant(item)}
          >
            {item.variant
              ? (item.variant.name ?? item.variant.nameKr ?? item.variant.sku)
              : "Chọn phân loại"}
            <span>▼</span>
          </button>
        )}

        <div className="cart-price">
          <span className="price">
            {price > 0 ? `${price.toLocaleString("vi-VN")}₫` : "Liên hệ"}
          </span>

          {originalPrice > price && (
            <s className="old-price">
              {originalPrice.toLocaleString("vi-VN")}₫
            </s>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="cart-actions">
        <div className="qty-box">
          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
            −
          </button>
          <span>{item.quantity}</span>
          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
            +
          </button>
        </div>

        <span className="cart-total">
          {price > 0
            ? `${(price * item.quantity).toLocaleString("vi-VN")}₫`
            : ""}
        </span>

        <button
          className="remove-btn"
          onClick={() => handleRemoveItem(item.id)}
        >
          🗑 Xóa
        </button>
      </div>
    </div>
  );
}
