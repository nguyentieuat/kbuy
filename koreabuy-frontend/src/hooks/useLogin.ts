// hooks/useLogin.ts

import { useState } from "react";

export function useLogin(loginFn: (c: string, p: string) => Promise<any>) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const login = async (credential: string, password: string) => {
    const errs: Record<string, string> = {};

    if (!credential.trim())
      errs.credential = "Vui lòng nhập thông tin đăng nhập";
    if (!password.trim())
      errs.password = "Vui lòng nhập mật khẩu";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return { ok: false };
    }

    setLoading(true);
    setErrors({});

    try {
      await loginFn(credential.trim(), password);
      return { ok: true };
    } catch (err: any) {
      setErrors({ general: err.message });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, errors, setErrors };
}
