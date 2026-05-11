// hooks/useFirebaseOtp.ts

import { useState, useRef } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "../lib/firebase";




export function useFirebaseOtp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);
  const isProcessing = useRef(false);

  // Export ref để RecaptchaBox gắn vào
  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
  };

  const resetRecaptcha = () => {
    try {
      recaptchaVerifier.current?.clear();
    } catch {}
    recaptchaVerifier.current = null;
    if (containerRef.current) containerRef.current.innerHTML = "";
  };

  const sendOtpToPhone = async (phone: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    setError("");

    try {
      resetRecaptcha();
      await new Promise((r) => setTimeout(r, 100));

      // Dùng element trực tiếp thay vì id string
      recaptchaVerifier.current = new RecaptchaVerifier(
        auth,
        containerRef.current!, // ✅ truyền element thay vì "recaptcha-container"
        { size: "invisible" },
      );

      const cleaned = phone.replace(/\D/g, "");
      const internationalPhone =
        "+84" + (cleaned.startsWith("0") ? cleaned.slice(1) : cleaned);

      const result = await signInWithPhoneNumber(
        auth,
        internationalPhone,
        recaptchaVerifier.current,
      );
      setConfirmation(result);
    } catch (err: any) {
      console.error("Firebase error:", err);
      setError(getFirebaseError(err?.code));
      resetRecaptcha();
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  };

  const verifyOtp = async (otp: string): Promise<string | null> => {
    if (!confirmation) {
      setError("Chưa gửi OTP");
      return null;
    }
    setLoading(true);
    setError("");
    try {
      const result = await confirmation.confirm(otp);
      const idToken = await result.user.getIdToken();
      return idToken;
    } catch (err: any) {
      setError(getFirebaseError(err?.code));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    resetRecaptcha();
    setConfirmation(null);
    setError("");
    isProcessing.current = false;
  };

  return {
    sendOtp: sendOtpToPhone,
    setContainerRef,
    verifyOtp,
    reset,
    loading,
    error,
    hasSent: !!confirmation,
  };
}

function getFirebaseError(code: string | undefined): string {
  if (!code) return "Có lỗi xảy ra, vui lòng thử lại";
  const errors: Record<string, string> = {
    "auth/invalid-phone-number": "Số điện thoại không hợp lệ",
    "auth/too-many-requests": "Quá nhiều yêu cầu, thử lại sau",
    "auth/invalid-verification-code": "Mã OTP không đúng",
    "auth/code-expired": "Mã OTP đã hết hạn, vui lòng gửi lại",
    "auth/quota-exceeded": "Vượt giới hạn SMS, thử lại sau",
    "auth/captcha-check-failed": "Xác minh reCAPTCHA thất bại",
    "auth/invalid-app-credential": "Lỗi cấu hình ứng dụng",
  };
  return errors[code] ?? `Có lỗi xảy ra (${code})`;
}
