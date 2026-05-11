// hooks/useToast.ts

// hooks/useToast.ts

import { useRef, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

export function useToast(duration = 2000) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const timeoutRef = useRef<number | null>(null);

  const show = (message: string, type: ToastType = "success") => {
    // clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({
      visible: true,
      message,
      type,
    });

    timeoutRef.current = window.setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        visible: false,
      }));
    }, duration);
  };

  return { toast, show };
}
