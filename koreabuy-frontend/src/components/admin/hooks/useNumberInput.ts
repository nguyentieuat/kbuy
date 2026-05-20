// hooks/useNumberInput.ts

import { useState } from "react";

export function useNumberInput(initial = "") {
  const [display, setDisplay] = useState(initial);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDisplay("");
      return;
    }
    setDisplay(Number(raw).toLocaleString("vi-VN"));
  };

  const onChangeWithCallback = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (val: string) => void,
  ) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = Number(raw) || 0;
    setDisplay(raw ? num.toLocaleString("vi-VN") : "");
    callback(raw); 
  };

  const numValue = Number(display.replace(/\D/g, "")) || 0;

  return { display, onChange, onChangeWithCallback, numValue };
}