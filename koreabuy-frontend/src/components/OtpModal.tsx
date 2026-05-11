// components/OtpModal.tsx

import { useState, useRef, useEffect } from "react";
import { useFirebaseOtp,  } from "../hooks/useFirebaseOtp";
import RecaptchaBox from "./RecaptchaBox";

type Props = {
  phone: string;
  onVerified: (verifyToken: string) => void;
  onClose: () => void;
};

export default function OtpModal({ phone, onVerified, onClose }: Props) {
  const {
    sendOtp,
    verifyOtp,
    reset,
    loading,
    error: firebaseError,
    hasSent,
    setContainerRef,
  } = useFirebaseOtp();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(180);
  const [verifying, setVerifying] = useState(false);
  const [sendCount, setSendCount] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasSentInitial = useRef(false);

  // Gửi OTP lần đầu
  useEffect(() => {
    if (hasSentInitial.current) return;
    hasSentInitial.current = true;
    sendOtp(phone);
    return () => reset();
  }, []);

  // Sync lỗi từ Firebase
  useEffect(() => {
    if (firebaseError) setError(firebaseError);
  }, [firebaseError]);

  // Đếm ngược
  useEffect(() => {
    if (!hasSent || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [hasSent, countdown]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    setError("");
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    text.split("").forEach((char, i) => { next[i] = char; });
    setOtp(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleResend = async () => {
    if (sendCount >= 3) {
      setError("Đã gửi quá nhiều lần, vui lòng thử lại sau");
      return;
    }
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setCountdown(60);
    setSendCount((c) => c + 1);
    inputRefs.current[0]?.focus();
    await sendOtp(phone);
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Vui lòng nhập đủ 6 số OTP");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const idToken = await verifyOtp(code);
      if (!idToken) { setVerifying(false); return; }

      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Xác minh thất bại");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      onVerified(data.verifyToken);
    } catch {
      setError("Xác minh thất bại, vui lòng thử lại");
    } finally {
      setVerifying(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────

  const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2");
  const isLoading = loading || verifying;
  const otpFilled = otp.join("").length === 6;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <RecaptchaBox containerRef={setContainerRef} />

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1040,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 16,
          zIndex: 1050,
          width: "min(420px, 95vw)",
          padding: 32,
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>

        <h6 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Xác minh số điện thoại
        </h6>

        {!firebaseError && (
          <p style={{ fontSize: 14, color: "#555", marginBottom: 6 }}>
            Mã OTP đã được gửi đến{" "}
            <strong style={{ color: "#333" }}>{maskedPhone}</strong>
          </p>
        )}

        {/* Loading gửi OTP */}
        {loading && !hasSent && (
          <div style={{ padding: "16px 0", marginBottom: 16 }}>
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <p style={{ fontSize: 13, color: "#888", marginTop: 8, marginBottom: 0 }}>
              Đang gửi mã OTP...
            </p>
          </div>
        )}

        {/* OTP Inputs */}
        {(hasSent || !loading) && (
          <>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  disabled={isLoading}
                  autoFocus={idx === 0 && hasSent}
                  style={{
                    width: 48, height: 56,
                    textAlign: "center",
                    fontSize: 22, fontWeight: 700,
                    borderRadius: 10,
                    border: `2px solid ${error ? "#e53935" : digit ? "#007bff" : "#ddd"}`,
                    outline: "none",
                    transition: "border-color 0.15s",
                    background: isLoading ? "#f8f8f8" : "#fff",
                    cursor: isLoading ? "not-allowed" : "text",
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{ color: "#e53935", fontSize: 13, marginBottom: 12 }}>
                {error}
              </p>
            )}

            <div style={{ marginBottom: 24 }}>
              {hasSent && countdown > 0 ? (
                <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
                  Gửi lại OTP sau{" "}
                  <span style={{ color: "#007bff", fontWeight: 600, minWidth: 28, display: "inline-block" }}>
                    {countdown}s
                  </span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isLoading}
                  style={{
                    border: "none", background: "none",
                    color: isLoading ? "#aaa" : "#007bff",
                    fontSize: 13,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontWeight: 600, padding: 0,
                  }}
                >
                  {loading ? "Đang gửi..." : "Gửi lại OTP"}
                </button>
              )}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-outline-secondary"
            style={{ flex: 1, borderRadius: 8 }}
          >
            Hủy
          </button>
          <button
            onClick={handleVerify}
            disabled={isLoading || !otpFilled}
            className="btn btn-primary"
            style={{ flex: 1, borderRadius: 8, fontWeight: 600, opacity: isLoading || !otpFilled ? 0.7 : 1 }}
          >
            {verifying ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Đang xác minh...
              </span>
            ) : "Xác minh"}
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#ccc", marginTop: 16, marginBottom: 0 }}>
          Mã OTP có hiệu lực trong 5 phút
        </p>
      </div>
    </>
  );
}
