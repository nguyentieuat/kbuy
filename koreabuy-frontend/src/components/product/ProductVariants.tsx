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
            {selectedVariant.name ??
              selectedVariant.nameKr ??
              selectedVariant.sku}
          </span>
        )}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {activeVariants.map((v: any) => (
          <div
            key={v.id}
            onClick={() => {
              if (v.flags.isSoldout) return;
              setVariantSelectedByUser(true);
              setSelectedVariant(v);
            }}
            style={{
              width: 72,
              opacity: v.flags.isSoldout ? 0.5 : 1,
              cursor: v.flags.isSoldout ? "not-allowed" : "pointer",
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
              {v.media.image ? (
                <img
                  src={normalizeImageUrl(v.media.image)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div>📦</div>
              )}
            </div>

            <div style={{ fontSize: 11 }}>
              {v.name ?? v.nameKr ?? v.sku}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
