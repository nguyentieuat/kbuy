// components/LoginForm.tsx

import React from "react";

type Props = {
  credential: string;
  setCredential: (v: string) => void;

  password: string;
  setPassword: (v: string) => void;

  showPass: boolean;
  setShowPass: (v: boolean) => void;

  errors: Record<string, string>;
  inputStyle: (hasError?: boolean) => React.CSSProperties;

  loading: boolean;
  handleLogin: () => void;
};

export default function LoginForm({
  credential,
  setCredential,
  password,
  setPassword,
  showPass,
  setShowPass,
  errors,
  inputStyle,
  loading,
  handleLogin,
}: Props) {
  return (
    <>
      {/* Credential */}
      <div className="mb-3">
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            display: "block",
          }}
        >
          SĐT / Email / Username
        </label>

        <input
          type="text"
          className="form-control"
          placeholder="Nhập SĐT, email hoặc username"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={inputStyle(!!errors.credential)}
          autoFocus
        />

        {errors.credential && (
          <p
            style={{
              color: "#e53935",
              fontSize: 12,
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {errors.credential}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="mb-4">
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            display: "block",
          }}
        >
          Mật khẩu
        </label>

        <div style={{ position: "relative" }}>
          <input
            type={showPass ? "text" : "password"}
            className="form-control"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              ...inputStyle(!!errors.password),
              paddingRight: 40,
            }}
          />

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
              fontSize: 14,
            }}
          >
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        {errors.password && (
          <p
            style={{
              color: "#e53935",
              fontSize: 12,
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {errors.password}
          </p>
        )}
      </div>

      {/* Button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        className="btn btn-primary w-100"
        style={{ borderRadius: 8, fontWeight: 700, padding: "12px 0" }}
      >
        {loading ? (
          <span>
            <span className="spinner-border spinner-border-sm me-2" />
            Đang đăng nhập...
          </span>
        ) : (
          "Đăng nhập"
        )}
      </button>
    </>
  );
}
