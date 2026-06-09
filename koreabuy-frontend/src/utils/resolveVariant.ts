// utils/resolveVariant.ts

export function resolveVariant(
  product: any,
  selectedOptions: any,
  selectedAddon: any,
) {
  const variants = product.variants || [];
  const optionEntries = Object.entries(selectedOptions || {});

  if (optionEntries.length === 0) return null;

  return (
    variants.find((v: any) => {
      const attrs = v.attributes || {};
      const sku = (v.sku || "").toLowerCase();

      const optionMatch = optionEntries.every(([key, val]) => {
        const attrVal = attrs?.[key];
        const valStr = String(val).toLowerCase();
        const attrStr = String(attrVal ?? "").toLowerCase();

        // Priority 1: exact attribute match
        if (attrStr === valStr) return true;

        // Priority 2: sku match chỉ khi val trông như option code (không phải text ngắn)
        // Tránh "3", "4", "S", "M" match nhầm qua sku
        const looksLikeCode = valStr.length > 4 && /^[a-z0-9]+$/.test(valStr);
        if (looksLikeCode && sku.includes(valStr)) return true;

        return false;
      });

      const addonMatch =
        !selectedAddon ||
        sku.includes(String(selectedAddon.value ?? "").toLowerCase());

      return optionMatch && addonMatch;
    }) ?? null
  );
}
