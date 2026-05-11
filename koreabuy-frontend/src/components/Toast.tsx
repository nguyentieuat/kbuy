// components/Toast.tsx

type ToastType = "success" | "error" | "info";

type Props = {
  visible: boolean;
  message: string;
  type?: ToastType;
};

const COLORS: Record<ToastType, string> = {
  success: "#27ae60",
  error:   "#e53935",
  info:    "#333",
};

// const ICONS: Record<ToastType, string> = {
//   success: "✅",
//   error:   "❌",
//   info:    "ℹ️",
// };

export default function Toast({ visible, message, type = "success" }: Props) {
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      opacity: visible ? 1 : 0,
      transition: "all 0.3s ease",
      background: COLORS[type], color: "#fff",
      padding: "12px 24px", borderRadius: 8,
      fontSize: 14, fontWeight: 500,
      zIndex: 9999, pointerEvents: "none",
      whiteSpace: "nowrap",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {/* <span>{ICONS[type]}</span> */}
      <span>{message}</span>
    </div>
  );
}
