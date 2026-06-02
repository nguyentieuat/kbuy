// utils/resolveVariant.ts

export function resolveVariant(
  product: any,
  selectedOptions: any,
  selectedAddon: any,
) {
  const variants = product.variants || [];

  const optionEntries = Object.entries(selectedOptions || {});

  return (
    variants.find((v: any) => {
      const attrs = v.attributes || {};
      const sku = (v.sku || "").toLowerCase();

      const optionMatch =
        optionEntries.length === 0 ||
        optionEntries.every(([key, val]) => {
          const attrVal = attrs?.[key];

          return (
            String(attrVal ?? "").toLowerCase() === String(val).toLowerCase() ||
            sku.includes(String(val).toLowerCase())
          );
        });

      const addonMatch =
        !selectedAddon || sku.includes(selectedAddon.value.toLowerCase());

      return optionMatch && addonMatch;
    }) || null
  );
}
