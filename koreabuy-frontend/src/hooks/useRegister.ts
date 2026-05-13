// hooks/useRegister.ts

import { useState } from "react";

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const register = async (data: {
    username: string;
    phone?: string;
    email?: string;
    password: string;
    confirm: string;
  }) => {
    const errs: Record<string, string> = {};

    if (!data.username) errs.username = "Vui lòng nhập username";
    if (!data.phone && !data.email)
      errs.contact = "Vui lòng nhập SĐT hoặc Email";
    if (data.phone && !/\d{9}$/.test(data.phone))
      errs.phone = "SĐT không hợp lệ";
    if (data.email && !/\S+@\S+\.\S+/.test(data.email))
      errs.email = "Email không hợp lệ";
    if (data.password.length < 6)
      errs.password = "Mật khẩu tối thiểu 6 ký tự";
    if (data.password !== data.confirm)
      errs.confirm = "Mật khẩu không khớp";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return { ok: false };
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          phone: data.phone || null,
          email: data.email || null,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      return { ok: true };
    } catch (err: any) {
      setErrors({ general: err.message });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, errors, setErrors };
}
