// components/cart/QuantitySelector.tsx

type Props = {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
};

export default function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onDecrease}
        style={{
          width: 32,
          height: 32,
          border: "none",
          background: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        −
      </button>

      <span
        style={{
          width: 40,
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        {quantity}
      </span>

      <button
        onClick={onIncrease}
        style={{
          width: 32,
          height: 32,
          border: "none",
          background: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        +
      </button>
    </div>
  );
}
