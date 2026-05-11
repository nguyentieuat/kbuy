// components/product/ProductVariants.tsx

export default function ProductVariants({
  activeVariants,
  selectedVariant,
  setSelectedVariant,
  setVariantSelectedByUser,
  normalizeImageUrl,
}: any) {
  if (!activeVariants?.length) return null;

  return (
    <div className="mb-4">
      <p style={{ fontWeight: 600, marginBottom: 10 }}>
        Phân loại:{" "}
        {selectedVariant && (
          <span style={{ color: "#007bff" }}>
            {selectedVariant.name_vi ?? selectedVariant.sku}
          </span>
        )}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {activeVariants.map((v: any) => (
          <div
            key={v.id}
            onClick={() => {
              if (v.is_soldout) return;
              setVariantSelectedByUser(true);
              setSelectedVariant(v);
            }}
            style={{
              width: 72,
              opacity: v.is_soldout ? 0.5 : 1,
              cursor: v.is_soldout ? "not-allowed" : "pointer",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                overflow: "hidden",
                border:
                  selectedVariant?.id === v.id
                    ? "2px solid #007bff"
                    : "2px solid #eee",
              }}
            >
              {v.image_url ? (
                <img
                  src={normalizeImageUrl(v.image_url)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div>📦</div>
              )}
            </div>

            <div style={{ fontSize: 11 }}>{v.name_vi ?? v.sku}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
