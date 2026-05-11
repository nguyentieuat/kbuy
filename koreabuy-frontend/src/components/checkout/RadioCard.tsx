// components/checkout/RadioCard.tsx

type Props = {
  selected: boolean;
  onClick: () => void;
  icon: string;
  name: string;
  desc?: string;
  right?: string;
  disabled?: boolean;
};

export default function RadioCard({
  selected,
  onClick,
  icon,
  name,
  desc,
  right,
  disabled,
}: Props) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        border: selected ? "2px solid #007bff" : "1px solid #eee",
        background: selected ? "#f0f6ff" : "#fff",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
    >
      {/* Radio dot */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          flexShrink: 0,
          border: `2px solid ${selected ? "#007bff" : "#ccc"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.15s",
        }}
      >
        {selected && (
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#007bff",
            }}
          />
        )}
      </div>

      {/* Icon */}
      <span style={{ fontSize: 22, flexShrink: 0 }}>
        {icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: 14,
            margin: 0,
          }}
        >
          {name}
        </p>

        {desc && (
          <p
            style={{
              fontSize: 12,
              color: "#888",
              margin: 0,
            }}
          >
            {desc}
          </p>
        )}
      </div>

      {/* Right */}
      {right && (
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: selected ? "#007bff" : "#333",
            flexShrink: 0,
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}