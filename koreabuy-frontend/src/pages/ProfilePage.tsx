// pages/ProfilePage.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import AddressModal from "../components/AddressModal";
import OtpModal from "../components/OtpModal";

type Tab = "info" | "address" | "orders" | "security";

// ── Types ─────────────────────────────────────────────────────────────────

type UserAddress = {
  id: number;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  ward: string;
  detail: string | null;
  full_address: string;
  is_default: boolean;
};

type AddressFormResult = {
  receiver_name?: string;
  receiver_phone?: string;
  
  province: {
    name: string;
  };
  ward: {
    name: string;
  };
  detail: string;
};

// ── AddressSection ────────────────────────────────────────────────────────

function AddressSection({
  authHeaders,
}: {
  authHeaders: Record<string, string>;
}) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<UserAddress | null>(null);
  const { show: showToast } = useToast();

  const fetchAddresses = async () => {
    const res = await fetch("/api/auth/addresses", { headers: authHeaders });
    const data = await res.json();
    setAddresses(data.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSetDefault = async (id: number) => {
    await fetch(`/api/auth/addresses/${id}/default`, {
      method: "PUT",
      headers: authHeaders,
    });
    fetchAddresses();
    showToast("Đã đặt địa chỉ mặc định", "success");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa địa chỉ này?")) return;
    await fetch(`/api/auth/addresses/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    fetchAddresses();
    showToast("Đã xóa địa chỉ", "info");
  };

  const handleSaveAddress = async (result: AddressFormResult) => {
    const body = {
      receiver_name: result.receiver_name,
      receiver_phone: result.receiver_phone,
      province: result.province.name,
      ward: result.ward.name,
      detail: result.detail,
      full_address: [result.detail, result.ward.name, result.province.name]
        .filter(Boolean)
        .join(", "),
    };

    if (editTarget) {
      await fetch(`/api/auth/addresses/${editTarget.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/auth/addresses", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
    }

    setShowModal(false);
    setEditTarget(null);
    fetchAddresses();
    showToast(
      editTarget ? "Đã cập nhật địa chỉ" : "Đã thêm địa chỉ",
      "success",
    );
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div className="spinner-border spinner-border-sm text-primary" />
      </div>
    );

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #eee",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h6 style={{ fontWeight: 700, margin: 0 }}>Địa chỉ giao hàng</h6>
        <button
          onClick={() => {
            setEditTarget(null);
            setShowModal(true);
          }}
          className="btn btn-primary btn-sm"
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          + Thêm địa chỉ
        </button>
      </div>

      {addresses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
          <p style={{ fontSize: 13 }}>Chưa có địa chỉ nào</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: addr.is_default
                  ? "2px solid #007bff"
                  : "1px solid #eee",
                background: addr.is_default ? "#f0f6ff" : "#fff",
                position: "relative",
              }}
            >
              {/* Badge mặc định */}
              {addr.is_default && (
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    right: 12,
                    background: "#007bff",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "0 0 6px 6px",
                  }}
                >
                  MẶC ĐỊNH
                </span>
              )}

              <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                {addr.receiver_name}
                <span
                  style={{
                    color: "#888",
                    fontWeight: 400,
                    marginLeft: 8,
                    fontSize: 13,
                  }}
                >
                  +84 {addr.receiver_phone}
                </span>
              </p>
              <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                {addr.full_address}
              </p>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {!addr.is_default && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    style={{
                      border: "1px solid #007bff",
                      background: "none",
                      color: "#007bff",
                      fontSize: 12,
                      borderRadius: 6,
                      padding: "3px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditTarget(addr);
                    setShowModal(true);
                  }}
                  style={{
                    border: "1px solid #ddd",
                    background: "none",
                    color: "#555",
                    fontSize: 12,
                    borderRadius: 6,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  Sửa
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => handleDelete(addr.id)}
                    style={{
                      border: "1px solid #ffcdd2",
                      background: "none",
                      color: "#e53935",
                      fontSize: 12,
                      borderRadius: 6,
                      padding: "3px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddressModal
          mode="profile"
          initialData={{
            detail: editTarget?.detail ?? "",
            receiver_name: editTarget?.receiver_name ?? "",
            receiver_phone: editTarget?.receiver_phone ?? "",
          }}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onConfirm={handleSaveAddress}
        />
      )}
    </div>
  );
}

// ── AvatarUploader ────────────────────────────────────────────────────────

function AvatarUploader({
  currentAvatar,
  authHeaders,
  onUploaded,
}: {
  currentAvatar: string | null;
  authHeaders: Record<string, string>;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { show: showToast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: authHeaders.Authorization,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUploaded();
      showToast("Đã cập nhật ảnh đại diện", "success");
    } catch (err: any) {
      showToast(err.message, "error");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayAvatar = preview ?? currentAvatar;

  return (
    <div style={{ position: "relative", width: 64, height: 64 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#f0f6ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          border: "2px solid #007bff",
        }}
      >
        {displayAvatar ? (
          <img
            src={`http://localhost:5000${displayAvatar}`}
            alt="avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          "👤"
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={() => {
          fileRef.current?.click();
        }}
        disabled={uploading}
        style={{
          position: "absolute",
          bottom: -2,
          right: -2,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#007bff",
          border: "2px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 10,
          color: "#fff",
        }}
        title="Đổi ảnh"
      >
        {uploading ? "⏳" : "✏️"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}

// ── Main ProfilePage ──────────────────────────────────────────────────────

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
        {activeTab === "orders" && (
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              border: "1px solid #eee",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p style={{ color: "#888", marginBottom: 12 }}>
              Xem tất cả đơn hàng của bạn
            </p>
            <button
              onClick={() => navigate("/orders")}
              className="btn btn-primary"
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Đến trang đơn hàng
            </button>
          </div>
        )}

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

// ── ChangePasswordSection ──────────────────────────────────────────────────

function ChangePasswordSection({
  authHeaders,
  onSuccess,
  onError,
}: {
  authHeaders: Record<string, string>;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.current) errs.current = "Nhập mật khẩu hiện tại";
    if (!form.next) errs.next = "Nhập mật khẩu mới";
    else if (form.next.length < 6) errs.next = "Tối thiểu 6 ký tự";
    if (form.next !== form.confirm) errs.confirm = "Mật khẩu không khớp";
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ current: "", next: "", confirm: "" });
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
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
