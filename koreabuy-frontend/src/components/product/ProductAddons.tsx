// components/product/ProductAddons.tsx

type AddonOption = {
  id: number;
  label: string;
  value: string;
  priceDelta: number;
};

type Addon = {
  addonId: string;
  id: string;
  name: string;
  price: number;
  options: AddonOption[];
};

type SelectedAddon = {
  addonId: string;
  value: string;
} | null;

type Props = {
  addons: Addon[];
  selectedAddon: SelectedAddon;
  setSelectedAddon: (v: SelectedAddon) => void;
  disabled?: boolean;
};

export default function ProductAddons({
  addons,
  selectedAddon,
  setSelectedAddon,
  disabled = false,
}: Props) {
  if (!addons?.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
        Sản phẩm bổ sung
      </div>

      {addons.map((addon) => (
        <div key={addon.id} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 13, color: "#555" }}>{addon.name}</span>
            <span style={{ fontSize: 13, color: "#e53935", fontWeight: 600 }}>
              +{addon.price.toLocaleString("vi-VN")}₫
            </span>
          </div>

          <select
            value={
              selectedAddon?.addonId === addon.addonId
                ? selectedAddon.value
                : ""
            }
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;

              if (!val) {
                setSelectedAddon(null);
                return;
              }

              setSelectedAddon({
                addonId: addon.addonId,
                value: val,
              });
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              fontSize: 14,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              appearance: "auto",
            }}
          >
            <option value="">— Không chọn —</option>
            {addon.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label ?? opt.value}
                {opt.priceDelta
                  ? ` (+${opt.priceDelta.toLocaleString("vi-VN")}₫)`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
