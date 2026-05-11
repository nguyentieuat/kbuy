// components/product/ProductGallery.tsx

import type { ProductImage, ProductVariant } from "../../types/product";

type Props = {
  productName: string;
  images: ProductImage[];
  activeVariants: ProductVariant[];
  mainImageUrl: string;
  discountPercent?: number | null;

  selectedImage: number;
  selectedVariant: any;

  setSelectedImage: (idx: number) => void;
  setVariantSelectedByUser: (v: boolean) => void;

  normalizeImageUrl: (url?: string | null) => string;
};

export default function ProductGallery({
  productName,
  images,
  activeVariants,
  mainImageUrl,
  discountPercent,
  selectedImage,
  selectedVariant,
  setSelectedImage,
  setVariantSelectedByUser,
  normalizeImageUrl,
}: Props) {
  return (
    <div className="col-lg-6">
      {/* MAIN IMAGE */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          background: "#f8f8f8",
          aspectRatio: "1/1",
          position: "relative",
        }}
      >
        {mainImageUrl ? (
          <img
            src={normalizeImageUrl(mainImageUrl)}
            alt={productName}
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
              color: "#ccc",
              fontSize: 48,
            }}
          >
            📦
          </div>
        )}

        {/* DISCOUNT BADGE */}
        {discountPercent && discountPercent > 0 && (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "#e53935",
              color: "#fff",
              borderRadius: 6,
              padding: "3px 10px",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* THUMBNAILS */}
      {(images.length > 0 ||
        activeVariants.some((v) => v.image_url)) && (
        <div style={{ marginTop: 12 }}>
          {images.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {images.map((img, idx) => {
                const isActive =
                  !selectedVariant && selectedImage === idx;

                return (
                  <div
                    key={img.id}
                    onClick={() => {
                      setVariantSelectedByUser(false);
                      setSelectedImage(idx);
                    }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 8,
                      overflow: "hidden",
                      cursor: "pointer",
                      flexShrink: 0,
                      border: isActive
                        ? "2px solid #007bff"
                        : "2px solid #eee",
                    }}
                  >
                    <img
                      src={normalizeImageUrl(img.url)}
                      alt={img.alt ?? `Ảnh ${idx + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
