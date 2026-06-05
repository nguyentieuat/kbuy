// hooks/useShippingRates.ts

import { useEffect, useState } from "react";

export function useShippingRates() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shipping/rates")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}