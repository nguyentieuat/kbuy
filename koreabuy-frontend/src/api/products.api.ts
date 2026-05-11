// api/products.api.ts

import type { Product } from "../types/product";

type ApiResponse<T> = {
  success: boolean;
  data:    T;
};

// GET /api/products?featured=true&limit=8
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const res = await fetch(`/api/products?featured=true&limit=${limit}`);
  if (!res.ok) throw new Error(`getFeaturedProducts failed: ${res.status}`);
  const json: ApiResponse<Product[]> = await res.json();
  return json.data;
}

// GET /api/products?new_arrival=true&limit=12
export async function getNewArrivalProducts(limit = 12): Promise<Product[]> {
  const res = await fetch(`/api/products?new_arrival=true&limit=${limit}`);
  if (!res.ok) throw new Error(`getNewArrivalProducts failed: ${res.status}`);
  const json: ApiResponse<Product[]> = await res.json();
  return json.data;
}