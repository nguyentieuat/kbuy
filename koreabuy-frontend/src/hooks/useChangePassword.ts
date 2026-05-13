// hooks/useChangePassword.ts

import { useState } from "react";

export function useChangePassword(authHeaders: Record<string, string>) {
  const [loading, setLoading] = useState(false);

  const changePassword = async (form: {
    current: string;
    next: string;
    confirm: string;
  }) => {
    const errs: Record<string, string> = {};

    if (!form.current) errs.current = "Nhập mật khẩu hiện tại";
    if (!form.next) errs.next = "Nhập mật khẩu mới";
    else if (form.next.length < 6) errs.next = "Tối thiểu 6 ký tự";
    if (form.next !== form.confirm)
      errs.confirm = "Mật khẩu không khớp";

    if (Object.keys(errs).length > 0) {
      return { ok: false, errors: errs };
    }

    setLoading(true);

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

      if (!res.ok) {
        return { ok: false, message: data.error };
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    changePassword,
    loading,
  };
}
