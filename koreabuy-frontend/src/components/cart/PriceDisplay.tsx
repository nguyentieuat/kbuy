// components/cart/PriceDisplay.tsx

type Props = {
  price: number;
  originalPrice?: number;
};

export default function PriceDisplay({
  price,
  originalPrice,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
      }}
    >
      <span
        style={{
          color: "#e53935",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {price > 0
          ? `${price.toLocaleString("vi-VN")}₫`
          : "Liên hệ"}
      </span>

      {originalPrice && originalPrice > price && (
        <s style={{ color: "#aaa", fontSize: 13 }}>
          {originalPrice.toLocaleString("vi-VN")}₫
        </s>
      )}
    </div>
  );
}
