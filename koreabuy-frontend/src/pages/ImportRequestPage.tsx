// pages/ImportRequestPage.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";

// ── Supported sources ────────────────────────────────────────────────────────

type Source = {
  id: string;
  name: string;
  logo: string;
  domain: string;
  example: string;
  color: string;
};

const SOURCES: Source[] = [
  {
    id: "oliveyoung",
    name: "Olive Young",
    logo: "🌿",
    domain: "oliveyoung.co.kr",
    example:
      "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=...",
    color: "#00a651",
  },
  {
    id: "coupang",
    name: "Coupang",
    logo: "🛒",
    domain: "coupang.com",
    example: "https://www.coupang.com/vp/products/...",
    color: "#e52528",
  },
  {
    id: "musinsa",
    name: "Musinsa",
    logo: "👗",
    domain: "musinsa.com",
    example: "https://www.musinsa.com/products/...",
    color: "#000",
  },
  {
    id: "gmarket",
    name: "Gmarket",
    logo: "🏪",
    domain: "gmarket.co.kr",
    example: "https://item.gmarket.co.kr/Item?goodscode=...",
    color: "#ff6600",
  },
  {
    id: "other",
    name: "Trang khác",
    logo: "🌐",
    domain: "",
    example: "https://...",
    color: "#6366f1",
  },
];

function detectSource(url: string): string {
  for (const s of SOURCES) {
    if (s.domain && url.includes(s.domain)) return s.id;
  }
  return "other";
}

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ImportRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast, show: showToast } = useToast();

  const [url, setUrl] = useState("");
  const [detectedSource, setDetectedSource] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{
    id: string;
    code: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setErrors((p) => ({ ...p, url: "" }));
    if (val.trim()) {
      setDetectedSource(detectSource(val.trim()));
    } else {
      setDetectedSource(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!url.trim()) errs.url = "Vui lòng nhập link sản phẩm";
    else if (!validateUrl(url.trim())) errs.url = "Link không hợp lệ";
    if (!email.trim() && !user)
      errs.email = "Vui lòng nhập email để nhận thông báo";
    if (email && !/\S+@\S+\.\S+/.test(email)) errs.email = "Email không hợp lệ";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/import-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          source_url: url.trim(),
          source: detectedSource ?? "other",
          note: note || null,
          email: email || null,
          phone: phone || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSubmitted({ id: data.id, code: data.request_code });
    } catch (err: any) {
      showToast(err.message || "Có lỗi xảy ra", "error");
    } finally {
      setLoading(false);
    }
  };

  const sourceInfo = SOURCES.find((s) => s.id === detectedSource);

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}
      >
        <div className="container py-5" style={{ maxWidth: 560 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "40px 32px",
              textAlign: "center",
              border: "1px solid #eee",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h5 style={{ fontWeight: 700, marginBottom: 8 }}>
              Yêu cầu đã được gửi!
            </h5>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
              Chúng tôi sẽ kiểm tra sản phẩm và phản hồi trong vòng{" "}
              <strong>24 giờ</strong> qua email/SĐT của bạn.
            </p>
            <div
              style={{
                background: "#f0f6ff",
                borderRadius: 10,
                padding: "12px 20px",
                marginBottom: 24,
                display: "inline-block",
              }}
            >
              <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                Mã yêu cầu
              </p>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#007bff",
                  margin: 0,
                }}
              >
                #{submitted.code}
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => {
                  setUrl("");
                  setSubmitted(null);
                  setDetectedSource(null);
                }}
                className="btn btn-outline-primary"
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Gửi yêu cầu khác
              </button>
              <button
                onClick={() => navigate("/")}
                className="btn btn-primary"
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}>
      <div className="container py-4" style={{ maxWidth: 640 }}>
        {/* Page title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 8 }}>
            🛍️ Mua hộ từ Hàn Quốc
          </h4>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
            Hãy để lại link sản phẩm bạn muốn mua — chúng tôi sẽ xử lý và cập
            nhật dữ liệu trên hệ thống
          </p>
        </div>

        {/* Supported sites */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        ></div>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "28px 28px",
            border: "1px solid #eee",
            boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
          }}
        >
          {/* ── Link sản phẩm ── */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
                display: "block",
              }}
            >
              Link sản phẩm *
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: `1.5px solid ${errors.url ? "#e53935" : url && detectedSource ? (sourceInfo?.color ?? "#007bff") : "#dee2e6"}`,
                borderRadius: 10,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Source icon */}
              <div
                style={{
                  padding: "0 14px",
                  fontSize: 20,
                  borderRight: "1px solid #f0f0f0",
                  background: "#fafafa",
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {sourceInfo?.logo ?? "🔗"}
              </div>
              <input
                type="url"
                className="form-control border-0 shadow-none"
                placeholder="https://www.oliveyoung.co.kr/store/goods/..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                style={{ fontSize: 13, height: 48, borderRadius: 0 }}
                autoFocus
              />
              {url && (
                <button
                  onClick={() => {
                    setUrl("");
                    setDetectedSource(null);
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    padding: "0 12px",
                    color: "#aaa",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Detected source badge */}
            {detectedSource && sourceInfo && (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    background: sourceInfo.color + "15",
                    color: sourceInfo.color,
                    fontWeight: 600,
                  }}
                >
                  {sourceInfo.logo} {sourceInfo.name} đã nhận diện
                </span>
              </div>
            )}

            {errors.url && (
              <p
                style={{
                  color: "#e53935",
                  fontSize: 12,
                  marginTop: 4,
                  marginBottom: 0,
                }}
              >
                {errors.url}
              </p>
            )}
          </div>

          {/* ── Liên hệ ── */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
                display: "block",
              }}
            >
              Thông tin liên hệ
              {!user && <span style={{ color: "#e53935" }}> *</span>}
              {user && (
                <span
                  style={{
                    color: "#27ae60",
                    fontSize: 12,
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  (đã điền từ tài khoản)
                </span>
              )}
            </label>

            <div className="row g-3">
              <div className="col-sm-6">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email nhận thông báo *"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: "" }));
                  }}
                  style={{
                    borderRadius: 8,
                    fontSize: 14,
                    borderColor: errors.email ? "#e53935" : undefined,
                  }}
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
              </div>
              <div className="col-sm-6">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #dee2e6",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      padding: "8px 10px",
                      background: "#f8f8f8",
                      borderRight: "1px solid #dee2e6",
                      fontSize: 13,
                      color: "#555",
                      whiteSpace: "nowrap",
                    }}
                  >
                    +84
                  </span>
                  <input
                    type="tel"
                    className="form-control border-0 shadow-none"
                    placeholder="Số điện thoại"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    style={{ borderRadius: 0, fontSize: 14 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Ghi chú ── */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
                display: "block",
              }}
            >
              Ghi chú / Yêu cầu thêm
              <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 6 }}>
                (không bắt buộc)
              </span>
            </label>
            <textarea
              className="form-control"
              placeholder="VD: Size L màu đen, hoặc nếu hết hàng thì báo lại..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ borderRadius: 8, fontSize: 14, resize: "none" }}
            />
          </div>

          {/* ── Info box ── */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              marginBottom: 20,
              fontSize: 12,
              color: "#0369a1",
              lineHeight: 1.6,
            }}
          >
            <strong>📋 Quy trình:</strong>
            <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li>Gửi link → Hệ thống kiểm tra sản phẩm</li>
              <li>Gửi link sản phẩm hệ thống email/SĐT (trong 24h)</li>
              <li>Xác nhận → Đặt hàng</li>
              <li>Giao hàng</li>
            </ol>
          </div>

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="btn btn-primary w-100"
            style={{
              padding: "14px 0",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 16,
              opacity: loading || !url.trim() ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" />
                Đang gửi yêu cầu...
              </span>
            ) : (
              "🛍️ Gửi yêu cầu"
            )}
          </button>
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
