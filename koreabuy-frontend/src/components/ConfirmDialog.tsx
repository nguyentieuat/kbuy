// components/ConfirmDialog.tsx

type Props = {
  visible: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible, message = "Bạn có chắc muốn xóa?", onConfirm, onCancel,
}: Props) {
  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 1040,
        }}
      />

      {/* Dialog */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: 12,
        padding: "28px 32px", zIndex: 1050,
        minWidth: 300, textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
        <p style={{ fontSize: 15, color: "#333", marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            className="btn btn-outline-secondary"
            style={{ borderRadius: 8, minWidth: 100 }}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger"
            style={{ borderRadius: 8, minWidth: 100 }}
          >
            Xóa
          </button>
        </div>
      </div>
    </>
  );
}
