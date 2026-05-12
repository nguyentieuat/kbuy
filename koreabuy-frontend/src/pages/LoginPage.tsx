// pages/LoginPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";

type Mode = "login" | "register";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, show: showToast } = useToast();

  const from = (location.state as any)?.from ?? "/";
  const initialMode = (location.state as any)?.mode as Mode | undefined;

  const [mode, setMode] = useState<Mode>(initialMode ?? "login");
  const [loading, setLoading] = useState(false);

  // Login form
  const [credential, setCredential] = useState(""); // sdt / email / username
  const [password, setPassword] = useState("");

  // Register form
  const [regUsername, setRegUsername] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const stateMode = (location.state as any)?.mode as Mode | undefined;
    if (stateMode) setMode(stateMode);
  }, [location.state]);

  const handleLogin = async () => {
    if (!credential.trim())
      return setErrors({ credential: "Vui lòng nhập thông tin đăng nhập" });
    if (!password.trim())
      return setErrors({ password: "Vui lòng nhập mật khẩu" });

    setLoading(true);
    setErrors({});
    try {
      await login(credential.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const errs: Record<string, string> = {};
    if (!regUsername.trim()) errs.username = "Vui lòng nhập username";
    if (!regPhone.trim() && !regEmail.trim())
      errs.contact = "Vui lòng nhập SĐT hoặc Email";
    if (regPhone && !/\d{9}$/.test(regPhone)) errs.phone = "SĐT không hợp lệ";
    if (regEmail && !/\S+@\S+\.\S+/.test(regEmail))
      errs.email = "Email không hợp lệ";
    if (!regPassword) errs.password = "Vui lòng nhập mật khẩu";
    else if (regPassword.length < 6)
      errs.password = "Mật khẩu tối thiểu 6 ký tự";
    if (regPassword !== regConfirm) errs.confirm = "Mật khẩu không khớp";

    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          phone: regPhone || null,
          email: regEmail || null,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // localStorage.setItem("token", data.token);
      // await refetchUser();
      showToast("Đăng ký thành công! 🎉", "success");
      setTimeout(() => {
        setMode("login");
        setCredential(regUsername);
        setRegUsername(""); // clear form
        setRegPhone("");
        setRegEmail("");
        setRegPassword("");
        setRegConfirm("");
        setErrors({});
      }, 1200);
    } catch (err: any) {
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean) => ({
    borderRadius: 8,
    fontSize: 14,
    borderColor: hasError ? "#e53935" : undefined,
  });

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}>
      <div className="container py-5" style={{ maxWidth: 440 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 28px",
            border: "1px solid #eee",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>
              {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            </h5>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
              {mode === "login"
                ? "Chào mừng bạn quay lại!"
                : "Đăng ký để theo dõi đơn hàng dễ dàng hơn"}
            </p>
          </div>

          {/* Tab switch */}
          <div
            style={{
              display: "flex",
              background: "#f5f5f5",
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
            }}
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErrors({});
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#007bff" : "#888",
                  boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          {/* General error */}
          {errors.general && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "#fff0f0",
                border: "1px solid #ffcdd2",
                color: "#e53935",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {errors.general}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {mode === "login" && (
            <>
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
          )}

          {/* ── REGISTER FORM ── */}
          {mode === "register" && (
            <>
              <div className="mb-3">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Username *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: nguyenvana"
                  value={regUsername}
                  onChange={(e) =>
                    setRegUsername(
                      e.target.value.toLowerCase().replace(/\s/g, ""),
                    )
                  }
                  style={inputStyle(!!errors.username)}
                  autoFocus
                />
                {errors.username && (
                  <p
                    style={{
                      color: "#e53935",
                      fontSize: 12,
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    {errors.username}
                  </p>
                )}
              </div>

              <div className="mb-3">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Số điện thoại
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: `1px solid ${errors.phone ? "#e53935" : "#dee2e6"}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      padding: "8px 12px",
                      background: "#f8f8f8",
                      borderRight: "1px solid #dee2e6",
                      fontSize: 13,
                      color: "#555",
                    }}
                  >
                    +84
                  </span>
                  <input
                    type="tel"
                    className="form-control border-0 shadow-none"
                    placeholder="912345678"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    style={{ borderRadius: 0, fontSize: 14 }}
                  />
                </div>
                {errors.phone && (
                  <p
                    style={{
                      color: "#e53935",
                      fontSize: 12,
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="mb-3">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="example@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={inputStyle(!!errors.email)}
                />
                {errors.email && (
                  <p
                    style={{
                      color: "#e53935",
                      fontSize: 12,
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    {errors.email}
                  </p>
                )}
                {errors.contact && (
                  <p
                    style={{
                      color: "#e53935",
                      fontSize: 12,
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    {errors.contact}
                  </p>
                )}
              </div>

              <div className="mb-3">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Mật khẩu *
                </label>
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

              <div className="mb-4">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Xác nhận mật khẩu *
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  className="form-control"
                  placeholder="Nhập lại mật khẩu"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  style={inputStyle(!!errors.confirm)}
                />
                {errors.confirm && (
                  <p
                    style={{
                      color: "#e53935",
                      fontSize: 12,
                      marginTop: 4,
                      marginBottom: 0,
                    }}
                  >
                    {errors.confirm}
                  </p>
                )}
              </div>

              <button
                onClick={handleRegister}
                disabled={loading}
                className="btn btn-primary w-100"
                style={{ borderRadius: 8, fontWeight: 700, padding: "12px 0" }}
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
          )}
        </div>
        <div style={{ textAlign: "center", float: "left" }}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            style={{ fontSize: 13, color: "#888", textDecoration: "none" }}
          >
            ← Quay về trang chủ
          </a>
        </div>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
