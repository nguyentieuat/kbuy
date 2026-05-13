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

export type UserAddress = {
  id: number;
  receiver_gender: "male" | "female" | "other";
  receiver_name: string;
  receiver_phone: string;
  province: string;
  ward: string;
  detail: string | null;
  full_address: string;
  is_default: boolean;
};

export function useAddresses(authHeaders: Record<string, string>) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/auth/addresses", {
        headers: authHeaders,
      });

      const data = await res.json();
      setAddresses(data.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // API actions
  const setDefault = async (id: number) => {
    await fetch(`/api/auth/addresses/${id}/default`, {
      method: "PUT",
      headers: authHeaders,
    });
    await fetchAddresses();
  };

  const remove = async (id: number) => {
    await fetch(`/api/auth/addresses/${id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    await fetchAddresses();
  };

  const createOrUpdate = async (id: number | null, body: any) => {
    if (id) {
      await fetch(`/api/auth/addresses/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/auth/addresses", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
    }

    await fetchAddresses();
  };

  return {
    addresses,
    loading,
    fetchAddresses,
    setDefault,
    remove,
    createOrUpdate,
  };
}
