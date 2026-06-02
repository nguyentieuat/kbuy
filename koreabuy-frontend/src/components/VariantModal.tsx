// components/VariantModal.tsx

import { useEffect, useState } from "react";
import type { CartItem } from "../types/cart";
import type { ProductVariant } from "../types/product";
import { resolveVariant } from "../utils/resolveVariant";
import ProductOptions from "./product/ProductOptions";
import ProductAddons from "./product/ProductAddons";
import ProductVariants from "./product/ProductVariants";

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};

type Props = {
  item: CartItem;
  onClose: () => void;
  onSelect: (variant: ProductVariant, options: any, addon: any) => void;
};

export default function VariantModal({ item, onClose, onSelect }: Props) {
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(item.selectedOptions || {});

  const [selectedAddon, setSelectedAddon] = useState<any>(
    item.selectedAddon || null,
  );

  const [previewVariant, setPreviewVariant] = useState<ProductVariant | null>(
    item.variant,
  );

  useEffect(() => {
    const v = resolveVariant(item.product, selectedOptions, selectedAddon);

    setPreviewVariant(v);
  }, [selectedOptions, selectedAddon]);

  const hasOptions = (item.product.options ?? []).length > 0;

  const hasVariantList = (item.product.variants ?? []).length > 0;

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

        <div style={{ marginBottom: 16 }}>
          {hasOptions && (
            <div style={{ marginBottom: 16 }}>
              <ProductOptions
                options={item.product.options ?? []}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                variants={item.product.variants ?? []}
              />
            </div>
          )}
        </div>

        {(item.product.addons ?? []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <ProductAddons
              addons={item.product.addons ?? []}
              selectedAddon={selectedAddon}
              setSelectedAddon={setSelectedAddon}
              disabled={false}
            />
          </div>
        )}

        {!hasOptions && hasVariantList && (
          <ProductVariants
            activeVariants={item.product.variants ?? []}
            selectedVariant={previewVariant}
            setSelectedVariant={(v: any) => {
              setPreviewVariant(v);
            }}
            setVariantSelectedByUser={() => {}}
            normalizeImageUrl={normalizeImageUrl}
          />
        )}

        {/* Danh sách variants */}
        <div
          style={{
            marginTop: 20,
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#888" }}>Preview sản phẩm</div>

          {previewVariant ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <img
                src={normalizeImageUrl(previewVariant.media?.image)}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 6,
                  objectFit: "cover",
                }}
              />

              <div>
                <div style={{ fontWeight: 600 }}>
                  {previewVariant.name ?? previewVariant.sku}
                </div>

                <div style={{ color: "#e53935" }}>
                  {previewVariant.pricing?.price?.toLocaleString("vi-VN")}₫
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#999", marginTop: 6 }}>
              Combination không hợp lệ
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (!previewVariant) return;

            onSelect(previewVariant, selectedOptions, selectedAddon);
          }}
          style={{
            marginTop: 20,
            width: "100%",
            padding: 12,
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Cập nhật sản phẩm
        </button>
      </div>
    </>
  );
}
