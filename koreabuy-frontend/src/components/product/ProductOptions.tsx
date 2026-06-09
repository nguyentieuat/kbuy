// components/product/ProductOptions.tsx

import type { ProductOption } from "../../types/product";

type Props = {
  options: ProductOption[];
  selectedOptions: Record<string, string>;
  setSelectedOptions: (opts: any) => void;
  variants: any[]; // để check soldout
};

// Check xem value có bị soldout không (tất cả variants chứa value đó đều soldout)
function isValueSoldout(
  optionName: string,
  value: string,
  variants: any[],
  currentSelected: Record<string, string>,
): boolean {
  const matching = variants.filter((v) => {
    const attrs = v.attributes || {};
    // Phải match tất cả options đã chọn khác
    const otherOptionsMatch = Object.entries(currentSelected).every(
      ([k, val]) => k === optionName || attrs[k] === val,
    );
    return otherOptionsMatch && attrs[optionName] === value;
  });

  if (!matching.length) return false;
  return matching.every((v) => v.flags?.isSoldout || v.is_soldout);
}

function normalizeOptionValue(val: any) {
  if (typeof val === "string") {
    return { label: val, value: val };
  }
  return {
    label: val.label ?? val.value,
    value: val.value ?? val.label,
  };
}

export default function ProductOptions({
  options,
  selectedOptions,
  setSelectedOptions,
  variants,
}: Props) {
  if (!options?.length) return null;

  const sorted = [...options].sort((a, b) => a.position - b.position);

  return (
    <div style={{ marginBottom: 20 }}>
      {sorted.map((opt) => (
        <div key={opt.id} style={{ marginBottom: 14 }}>
          <label
            style={{
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 6,
              display: "block",
            }}
          >
            {opt.name}
            {selectedOptions[opt.name] && (
              <span style={{ fontWeight: 400, color: "#555", marginLeft: 8 }}>
                — {selectedOptions[opt.name]}
              </span>
            )}
          </label>

          <select
            value={selectedOptions[opt.name] || ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedOptions((prev: any) => {
                if (!val) {
                  // Bỏ key khi deselect
                  const { [opt.name]: _, ...rest } = prev;
                  return rest;
                }
                return { ...prev, [opt.name]: val };
              });
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              appearance: "auto",
              cursor: "pointer",
            }}
          >
            <option value="">— Chọn {opt.name} —</option>
            {opt.values.map((raw) => {
              const val = normalizeOptionValue(raw);

              const soldout = isValueSoldout(
                opt.name,
                val.value,
                variants,
                selectedOptions,
              );

              return (
                <option
                  key={`${opt.name}-${val.value}`}
                  value={val.value}
                  disabled={soldout}
                  style={{ color: soldout ? "#aaa" : "#333" }}
                >
                  {val.label}
                  {soldout ? " (Hết hàng)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      ))}
    </div>
  );
}
