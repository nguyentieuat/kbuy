// pages/ProfilePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import OtpModal from "../components/OtpModal";
import AvatarUploader from "../components/profile/AvatarUploader";
import OrderSection from "../components/profile/OrderSection";
import AddressSection from "../components/profile/AddressSection";
import ChangePasswordSection from "../components/profile/ChangePasswordSection";

type Tab = "info" | "address" | "orders" | "security";

export default function ProfilePage() {
  const { user, initialized, logout, refetchUser } = useAuth();
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(false);
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [showEmailOtpInput, setShowEmailOtpInput] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
  });

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, initialized, navigate]);
  useEffect(() => {
    if (user) setForm({ full_name: user.full_name ?? "" });
  }, [user]);

  if (!initialized || loading || !user) {
    return null;
  }

  const token = localStorage.getItem("token");
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const handleUpdateInfo = async () => {
    setLoading(true);
    try {
      debugger
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refetchUser();
      showToast("Cập nhật thành công!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setEmailOtpLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowEmailOtpInput(true);
      showToast("Mã OTP đã gửi vào email", "info");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setEmailOtpLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ otp: emailOtpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refetchUser();
      setShowEmailOtpInput(false);
      setEmailOtpCode("");
      showToast("Email đã được xác thực!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "info", label: "Thông tin", icon: "👤" },
    { key: "address", label: "Địa chỉ", icon: "📍" },
    { key: "orders", label: "Đơn hàng", icon: "📦" },
    { key: "security", label: "Bảo mật", icon: "🔒" },
  ];

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}>
      <div className="container py-4" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "24px",
            marginBottom: 16,
            border: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Avatar với upload */}
          <AvatarUploader
            currentAvatar={user.avatar_url}
            authHeaders={authHeaders}
            onUploaded={refetchUser}
          />

          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
              {user.full_name || user.username}
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>
              @{user.username}
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="btn btn-outline-danger btn-sm"
            style={{ borderRadius: 8 }}
          >
            Đăng xuất
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: "none",
                background: activeTab === tab.key ? "#007bff" : "#fff",
                color: activeTab === tab.key ? "#fff" : "#555",
                fontWeight: activeTab === tab.key ? 700 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow:
                  activeTab === tab.key
                    ? "0 4px 12px rgba(0,123,255,0.3)"
                    : "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Thông tin */}
        {activeTab === "info" && (
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              border: "1px solid #eee",
            }}
          >
            <h6 style={{ fontWeight: 700, marginBottom: 20 }}>
              Thông tin cá nhân
            </h6>

            <div className="mb-3">
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Họ và tên
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập họ và tên"
                value={form.full_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, full_name: e.target.value }))
                }
                style={{ borderRadius: 8, fontSize: 14 }}
              />
            </div>

            {/* SĐT */}
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #dee2e6",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#f8f8f8",
                  }}
                >
                  <span
                    style={{
                      padding: "8px 12px",
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
                    value={user.phone ?? "Chưa cập nhật"}
                    readOnly
                    style={{ background: "transparent", fontSize: 14 }}
                  />
                </div>
                {user.phone_verified ? (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      background: "#f0fff4",
                      color: "#27ae60",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✓ Đã xác thực
                  </span>
                ) : user.phone ? (
                  <button
                    onClick={() => setShowPhoneOtp(!showPhoneOtp)}
                    className="btn btn-outline-warning btn-sm"
                    style={{
                      borderRadius: 8,
                      whiteSpace: "nowrap",
                      fontSize: 12,
                    }}
                  >
                    {showPhoneOtp ? "Đóng" : "Xác thực ngay"}
                  </button>
                ) : null}
              </div>

              {/* Phone OTP inline — tái sử dụng API checkout */}
              {showPhoneOtp && user.phone && (
                <OtpModal
                  phone={user.phone}
                  onClose={() => setShowPhoneOtp(false)}
                  onVerified={async () => {
                    setShowPhoneOtp(false);
                    await refetchUser();
                    showToast("SĐT đã xác thực", "success");
                  }}
                />
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="email"
                  className="form-control"
                  value={user.email ?? "Chưa cập nhật"}
                  readOnly
                  style={{
                    borderRadius: 8,
                    fontSize: 14,
                    background: "#f8f8f8",
                    flex: 1,
                  }}
                />
                {user.email_verified ? (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      background: "#f0fff4",
                      color: "#27ae60",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✓ Đã xác thực
                  </span>
                ) : user.email ? (
                  <button
                    onClick={handleSendEmailOtp}
                    disabled={emailOtpLoading}
                    className="btn btn-outline-warning btn-sm"
                    style={{
                      borderRadius: 8,
                      whiteSpace: "nowrap",
                      fontSize: 12,
                    }}
                  >
                    {emailOtpLoading ? "..." : "Xác thực ngay"}
                  </button>
                ) : null}
              </div>

              {showEmailOtpInput && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: "#f8f9fa",
                    border: "1px solid #dee2e6",
                  }}
                >
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
                    Nhập mã OTP đã gửi đến <strong>{user.email}</strong>:
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mã 6 số"
                      value={emailOtpCode}
                      onChange={(e) =>
                        setEmailOtpCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      style={{
                        borderRadius: 8,
                        fontSize: 14,
                        letterSpacing: 4,
                        textAlign: "center",
                      }}
                      maxLength={6}
                    />
                    <button
                      onClick={handleVerifyEmail}
                      disabled={emailOtpLoading || emailOtpCode.length < 6}
                      className="btn btn-primary btn-sm"
                      style={{ borderRadius: 8, whiteSpace: "nowrap" }}
                    >
                      {emailOtpLoading ? "..." : "Xác nhận"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleUpdateInfo}
              disabled={loading}
              className="btn btn-primary"
              style={{ borderRadius: 8, fontWeight: 600, padding: "10px 28px" }}
            >
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Đang lưu...
                </span>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        )}

        {/* Tab: Địa chỉ */}
        {activeTab === "address" && (
          <AddressSection authHeaders={authHeaders} />
        )}

        {/* Tab: Đơn hàng */}
        {activeTab === "orders" && <OrderSection authHeaders={authHeaders} />}

        {/* Tab: Bảo mật */}
        {activeTab === "security" && (
          <ChangePasswordSection
            authHeaders={authHeaders}
            onSuccess={() => showToast("Đổi mật khẩu thành công!", "success")}
            onError={(msg) => showToast(msg, "error")}
          />
        )}

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
