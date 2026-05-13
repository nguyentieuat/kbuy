// components/RegisterForm.tsx

import React from "react";

type Props = {
  regUsername: string;
  setRegUsername: (v: string) => void;

  regPhone: string;
  setRegPhone: (v: string) => void;

  regEmail: string;
  setRegEmail: (v: string) => void;

  regPassword: string;
  setRegPassword: (v: string) => void;

  regConfirm: string;
  setRegConfirm: (v: string) => void;

  showPass: boolean;
  setShowPass: (v: boolean) => void;

  errors: Record<string, string>;
  inputStyle: (hasError?: boolean) => React.CSSProperties;

  loading: boolean;
  handleRegister: () => void;
};

export default function RegisterForm({
  regUsername,
  setRegUsername,
  regPhone,
  setRegPhone,
  regEmail,
  setRegEmail,
  regPassword,
  setRegPassword,
  regConfirm,
  setRegConfirm,
  showPass,
  setShowPass,
  errors,
  inputStyle,
  loading,
  handleRegister,
}: Props) {
  return (
    <>
      {/* Username */}
      <div className="mb-3">
        <label style={labelStyle}>Username *</label>
        <input
          type="text"
          className="form-control"
          placeholder="VD: nguyenvana"
          value={regUsername}
          onChange={(e) =>
            setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
          }
          style={inputStyle(!!errors.username)}
          autoFocus
        />
        {errors.username && <ErrorText msg={errors.username} />}
      </div>

      {/* Phone */}
      <div className="mb-3">
        <label style={labelStyle}>Số điện thoại</label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: `1px solid ${errors.phone ? "#e53935" : "#dee2e6"}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <span style={phonePrefixStyle}>+84</span>

          <input
            type="tel"
            className="form-control border-0 shadow-none"
            placeholder="912345678"
            value={regPhone}
            onChange={(e) => setRegPhone(e.target.value)}
            style={{ borderRadius: 0, fontSize: 14 }}
          />
        </div>

        {errors.phone && <ErrorText msg={errors.phone} />}
      </div>

      {/* Email */}
      <div className="mb-3">
        <label style={labelStyle}>Email</label>

        <input
          type="email"
          className="form-control"
          placeholder="example@email.com"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          style={inputStyle(!!errors.email)}
        />

        {errors.email && <ErrorText msg={errors.email} />}
        {errors.contact && <ErrorText msg={errors.contact} />}
      </div>

      {/* Password */}
      <div className="mb-3">
        <label style={labelStyle}>Mật khẩu *</label>

        <div style={{ position: "relative" }}>
          <input
            type={showPass ? "text" : "password"}
            className="form-control"
            placeholder="Tối thiểu 6 ký tự"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            style={{
              ...inputStyle(!!errors.password),
              paddingRight: 40,
            }}
          />

          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={eyeButtonStyle}
          >
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        {errors.password && <ErrorText msg={errors.password} />}
      </div>

      {/* Confirm */}
      <div className="mb-4">
        <label style={labelStyle}>Xác nhận mật khẩu *</label>

        <input
          type={showPass ? "text" : "password"}
          className="form-control"
          placeholder="Nhập lại mật khẩu"
          value={regConfirm}
          onChange={(e) => setRegConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          style={inputStyle(!!errors.confirm)}
        />

        {errors.confirm && <ErrorText msg={errors.confirm} />}
      </div>

      {/* Button */}
      <button
        onClick={handleRegister}
        disabled={loading}
        className="btn btn-primary w-100"
        style={{
          borderRadius: 8,
          fontWeight: 700,
          padding: "12px 0",
        }}
      >
        {loading ? (
          <span>
            <span className="spinner-border spinner-border-sm me-2" />
            Đang tạo tài khoản...
          </span>
        ) : (
          "Tạo tài khoản"
        )}
      </button>
    </>
  );
}

/* ───────── helpers UI ───────── */

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  display: "block",
};

const phonePrefixStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "#f8f8f8",
  borderRight: "1px solid #dee2e6",
  fontSize: 13,
  color: "#555",
};

const eyeButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "none",
  color: "#888",
  cursor: "pointer",
  fontSize: 14,
};

function ErrorText({ msg }: { msg: string }) {
  return (
    <p
      style={{
        color: "#e53935",
        fontSize: 12,
        marginTop: 4,
        marginBottom: 0,
      }}
    >
      {msg}
    </p>
  );
}
