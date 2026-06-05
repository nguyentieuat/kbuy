// components/product/ProductInfoPanel.tsx

import { useEffect, useState } from "react";
import ProductDescription from "./ProductDescription";
import ProductVariants from "./ProductVariants";
import ProductOptions from "./ProductOptions";
import ProductAddons from "./ProductAddons";
import { resolveVariant } from "../../utils/resolveVariant";

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

  debugger;
  const [selectedOptions, setSelectedOptions] = useState<any>({});
  const [selectedAddon, setSelectedAddon] = useState<{
    addonId: string;
    value: string;
  } | null>(null);

  const safeOptions =
    product.options?.filter(
      (opt: any) => Array.isArray(opt.values) && opt.values.length > 0,
    ) ?? [];

  const hasOptions = safeOptions.length > 0;

  const hasVariantList =
    Array.isArray(activeVariants) && activeVariants.length > 0;

  const isSimpleProduct = !hasOptions && !hasVariantList;

  const isOptionBased = hasOptions;
  const isVariantListBased = !hasOptions && hasVariantList;

  useEffect(() => {
    if (!isOptionBased) return;

    const v = resolveVariant(product, selectedOptions, selectedAddon);

    setSelectedVariant(v || null);
    setVariantSelectedByUser(true);
  }, [product, selectedOptions, selectedAddon, isOptionBased]);

  return (
    <div className="col-lg-6">
      {/* NAME */}
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 16 }}>
        {product.name}
      </h1>

      {product.nameKr && (
        <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
          Nguồn:{" "}
          <a
            href={product.metadata.productUrl}
            target="_blank"
            rel="noreferrer"
          >
            {product.nameKr}
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

      {/* MODE A: OPTION-BASED PRODUCT */}
      {isOptionBased && (
        <ProductOptions
          options={product.options}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          variants={product.variants || []}
        />
      )}

      {/* ADDONS (NEW) */}
      {product.addons?.length > 0 && (
        <ProductAddons
          addons={product.addons}
          selectedAddon={selectedAddon}
          setSelectedAddon={setSelectedAddon}
          disabled={!selectedVariant}
        />
      )}

      {/* MODE B: VARIANT LIST PRODUCT (Olive) */}
      {isVariantListBased && (
        <ProductVariants
          activeVariants={activeVariants}
          selectedVariant={selectedVariant}
          setSelectedVariant={setSelectedVariant}
          setVariantSelectedByUser={setVariantSelectedByUser}
          normalizeImageUrl={normalizeImageUrl}
        />
      )}

      {/* Selected preview */}
      {isSimpleProduct ? (
        <></>
      ) : selectedVariant ? (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: 10,
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        >
          <img
            src={normalizeImageUrl(selectedVariant.media?.image)}
            style={{
              width: 50,
              height: 50,
              objectFit: "cover",
              borderRadius: 6,
            }}
          />

          <div>
            <div style={{ fontWeight: 600 }}>
              {selectedVariant.name ??
                selectedVariant.nameKr ??
                selectedVariant.sku}
            </div>

            <div style={{ color: "#e53935", fontWeight: 600 }}>
              {selectedVariant.pricing?.price?.toLocaleString("vi-VN")}₫
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 10,
            border: "1px dashed #ccc",
            borderRadius: 8,
            color: "#888",
          }}
        >
          {hasOptions || hasVariantList
            ? "Vui lòng chọn thuộc tính sản phẩm"
            : null}
        </div>
      )}

      {/* QUANTITY */}
      <div
        className="d-flex align-items-center gap-3 mb-4"
        style={{ padding: 10 }}
      >
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
