// components/profile/ChangePasswordSection.tsx

import { useState } from "react";
import { useChangePassword } from "../../hooks/useChangePassword";

export default function ChangePasswordSection({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders: Record<string, string>;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);

  const { changePassword, loading } =
    useChangePassword(authHeaders);

  const handleSubmit = async () => {
    const result = await changePassword(form);

    if (!result.ok) {
      if (result.errors) {
        setErrors(result.errors);
        return;
      }

      onError(result.message || "Có lỗi xảy ra");
      return;
    }

    setForm({ current: "", next: "", confirm: "" });
    setErrors({});
    onSuccess();
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #eee",
      }}
    >
      <h6 style={{ fontWeight: 700, marginBottom: 20 }}>Đổi mật khẩu</h6>

      {(["current", "next", "confirm"] as const).map((field) => (
        <div key={field} className="mb-3">
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              display: "block",
            }}
          >
            {field === "current"
              ? "Mật khẩu hiện tại"
              : field === "next"
                ? "Mật khẩu mới"
                : "Xác nhận mật khẩu mới"}
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              className="form-control"
              value={form[field]}
              onChange={(e) =>
                setForm((p) => ({ ...p, [field]: e.target.value }))
              }
              style={{
                borderRadius: 8,
                fontSize: 14,
                paddingRight: 40,
                borderColor: errors[field] ? "#e53935" : undefined,
              }}
            />
            {field === "current" && (
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            )}
          </div>
          {errors[field] && (
            <p
              style={{
                color: "#e53935",
                fontSize: 12,
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              {errors[field]}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn btn-primary"
        style={{
          borderRadius: 8,
          fontWeight: 600,
          padding: "10px 28px",
          marginTop: 4,
        }}
      >
        {loading ? (
          <span>
            <span className="spinner-border spinner-border-sm me-2" />
            Đang xử lý...
          </span>
        ) : (
          "Đổi mật khẩu"
        )}
      </button>
    </div>
  );
}
