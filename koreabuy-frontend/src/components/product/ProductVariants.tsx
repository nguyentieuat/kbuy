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
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
        Phân loại sản phẩm
      </label>

      <select
        value={selectedVariant?.id || ""}
        onChange={(e) => {
          const v = activeVariants.find(
            (x: any) => x.id === Number(e.target.value),
          );

          if (!v) return;

          if (v.flags?.isSoldout) return;

          setVariantSelectedByUser(true);
          setSelectedVariant(v);
        }}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: 8,
          border: "1px solid #ddd",
          fontSize: 14,
        }}
      >
        <option value="">— Chọn phân loại —</option>

        {activeVariants.map((v: any) => (
          <option key={v.id} value={v.id} disabled={v.flags?.isSoldout}>
            {v.name ?? v.nameKr ?? v.sku}
            {v.flags?.isSoldout ? " (Hết hàng)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
