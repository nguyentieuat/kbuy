// components/product/ProductInfoPanel.tsx

import ProductDescription from "./ProductDescription";
import ProductVariants from "./ProductVariants";

type Props = {
  product: any;
  currentPrice: number;
  originalPrice?: number | null;
  activeVariants: any[];
  selectedVariant: any;
  setSelectedVariant: (v: any) => void;
  setVariantSelectedByUser: (v: boolean) => void;

  quantity: number;
  setQuantity: (q: number | ((q: number) => number)) => void;

  handleAddToCart: () => void;
  handleBuyNow: () => void;

  showFullDescription: boolean;
  setShowFullDescription: (v: boolean | ((v: boolean) => boolean)) => void;

  normalizeImageUrl: (url?: string | null) => string;
};

export default function ProductInfoPanel(props: Props) {
  const {
    product,
    currentPrice,
    originalPrice,
    activeVariants,
    selectedVariant,
    setSelectedVariant,
    setVariantSelectedByUser,
    quantity,
    setQuantity,
    handleAddToCart,
    handleBuyNow,
    showFullDescription,
    setShowFullDescription,
    normalizeImageUrl,
  } = props;

  return (
    <div className="col-lg-6">
      {/* NAME */}
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 16 }}>
        {product.name}
      </h1>

      {product.name_kr && (
        <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
          Nguồn:{" "}
          <a href={product.productUrl} target="_blank" rel="noreferrer">
            {product.name_kr}
          </a>
        </p>
      )}

      {/* PRICE */}
      <div className="mb-4 d-flex align-items-baseline gap-3">
        <span style={{ fontSize: "1.9rem", fontWeight: 700, color: "#e53935" }}>
          {currentPrice.toLocaleString("vi-VN")}₫
        </span>

        {originalPrice && originalPrice > currentPrice && (
          <s style={{ color: "#aaa" }}>
            {originalPrice.toLocaleString("vi-VN")}₫
          </s>
        )}
      </div>

      {/* VARIANTS */}
      <ProductVariants
        activeVariants={activeVariants}
        selectedVariant={selectedVariant}
        setSelectedVariant={setSelectedVariant}
        setVariantSelectedByUser={setVariantSelectedByUser}
        normalizeImageUrl={normalizeImageUrl}
      />

      {/* QUANTITY */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <span style={{ fontWeight: 600 }}>Số lượng:</span>

        <div
          style={{
            display: "flex",
            border: "1px solid #ddd",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            style={{ width: 38, background: "#f5f5f5", border: "none" }}
          >
            −
          </button>

          <span style={{ width: 52, textAlign: "center" }}>{quantity}</span>

          <button
            onClick={() => setQuantity((q) => q + 1)}
            style={{ width: 38, background: "#f5f5f5", border: "none" }}
          >
            +
          </button>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="d-flex gap-3 mb-5">
        <button className="btn btn-outline-primary" onClick={handleAddToCart}>
          🛒 Thêm vào giỏ
        </button>

        <button className="btn btn-primary" onClick={handleBuyNow}>
          Mua ngay
        </button>
      </div>

      {/* DESCRIPTION */}
      <ProductDescription
        description={product.description}
        showFullDescription={showFullDescription}
        setShowFullDescription={setShowFullDescription}
      />
    </div>
  );
}
