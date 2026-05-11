// hooks/useAddress.ts
import { useEffect, useState } from "react";
import { getRegion, type Region } from "../utils/shipping";

export type Province = {
  code: number;
  name: string;
  division_type?: string;
};

export type Ward = {
  code: number;
  name: string;
  division_type?: string;
};

const BASE = "https://provinces.open-api.vn/api/v2";

export function useProvinces() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/p/`)
      .then((r) => r.json())
      .then((data) => setProvinces(Array.isArray(data) ? data : (data.data ?? [])))
      .finally(() => setLoading(false));
  }, []);

  return { provinces, loading };
}

export function useWards(provinceCode: number | null) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provinceCode) { setWards([]); return; }
    setLoading(true);

    fetch(`${BASE}/p/${provinceCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => {
        const province = Array.isArray(data) ? data[0] : data;
        setWards(province?.wards ?? []);
      })
      .finally(() => setLoading(false));
  }, [provinceCode]);

  return { wards, loading };
}

export function useRegion(province: Province | null): Region {
  if (!province) return "unknown";
  return getRegion(province.code);
}