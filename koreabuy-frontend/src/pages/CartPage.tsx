// pages/CartPage.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import type { CartItem } from "../types/cart";
import type { ProductVariant } from "../types/product";
import VariantModal from "../components/VariantModal";
import Toast from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../hooks/useToast";
import CartItemRow from "../components/cart/CartItemRow";
import CartSummary from "../components/cart/CartSummary";

export default function CartPage() {
  const { items, updateQuantity, updateVariant, removeItem, clearCart } =
    useCart();
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();

  const [variantModal, setVariantModal] = useState<CartItem | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | "all" | null>(
    null,
  );

  // Xóa 1 item
  const handleRemoveItem = (itemId: string) => {
    setConfirmTarget(itemId);
  };

  // Xóa tất cả
  const handleClearCart = () => {
    setConfirmTarget("all");
  };

  // Xác nhận xóa
  const handleConfirmDelete = () => {
    if (confirmTarget === "all") {
      clearCart();
      showToast("Đã xóa toàn bộ giỏ hàng", "info");
    } else if (confirmTarget) {
      removeItem(confirmTarget);
      showToast("Đã xóa sản phẩm khỏi giỏ hàng", "error");
    }
    setConfirmTarget(null);
  };

  if (items.length === 0) {
    return (
      <div className="untree_co-section" style={{ paddingTop: 120 }}>
        <div className="container text-center py-5">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <h3 style={{ color: "#888", marginBottom: 16 }}>Giỏ hàng trống</h3>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/products")}
            style={{ borderRadius: 8, padding: "10px 32px" }}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="untree_co-section" style={{ paddingTop: 120 }}>
      <div className="container">
        <h2 style={{ marginBottom: 32, fontWeight: 700 }}>
          Giỏ hàng ({items.length} sản phẩm)
        </h2>

        <div className="row g-4">
          {/* Danh sách sản phẩm */}
          <div className="col-lg-8">
            {items.map((item) => {
              const imageUrl = normalizeImageUrl(
                  item.product.media.image 
              );
              const price = Number(
                item.variant?.pricing.price ?? item.product.pricing.price ?? 0,
              );
              const originalPrice = Number(
                item.variant?.pricing.originalPrice ?? item.product.pricing.originalPrice ?? 0,
              );

              return (
                <CartItemRow
                  key={item.id}
                  item={item}
                  imageUrl={imageUrl}
                  price={price}
                  originalPrice={originalPrice}
                  navigate={navigate}
                  updateQuantity={updateQuantity}
                  setVariantModal={setVariantModal}
                  handleRemoveItem={handleRemoveItem}
                />
              );
            })}

            {/* Xóa tất cả */}
            <div style={{ marginTop: 16 }}>
              <button
                onClick={handleClearCart}
                style={{
                  border: "none",
                  background: "none",
                  color: "#aaa",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Xóa tất cả
              </button>
            </div>
          </div>

          {/* Tổng đơn hàng */}
          <CartSummary items={items} />

        </div>
      </div>

      {/* Variant Modal */}
      {variantModal && (
        <VariantModal
          item={variantModal}
          onClose={() => setVariantModal(null)}
          onSelect={(newVariant: ProductVariant) => {
            const itemId = variantModal.id;
            setVariantModal(null);
            updateVariant(itemId, newVariant);
            showToast("Đã cập nhật phân loại", "info");
          }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        visible={confirmTarget !== null}
        message={
          confirmTarget === "all"
            ? "Xóa toàn bộ sản phẩm trong giỏ hàng?"
            : "Xóa sản phẩm này khỏi giỏ hàng?"
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};
