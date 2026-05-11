// hooks/useProducts.ts

import { useEffect, useState } from "react";
import {
  getFeaturedProducts,
  getNewArrivalProducts,
} from "../api/products.api";

import type { Product } from "../types/product";

type UseProductsResult = {
  products: Product[];
  loading: boolean;
  error: string | null;
};

// Hook to get featured products (ProductListGrid)
export function useFeaturedProducts(limit = 9): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false; // prevent state update if component unmounted

    async function fetch() {
      try {
        setLoading(true);
        const data = await getFeaturedProducts(limit);
        if (!cancelled) setProducts(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { products, loading, error };
}

// Hook retrieves new products (ProductListCarousel)
export function useNewArrivalProducts(limit = 12): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const data = await getNewArrivalProducts(limit);
        if (!cancelled) setProducts(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { products, loading, error };
}

type Params = {
  category?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function useProducts(params: Params) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const query = new URLSearchParams({
          ...(params.category && { category: params.category }),
          ...(params.search && { q: params.search }),
          ...(params.sort && { sort: params.sort }),
          ...(params.page && { page: String(params.page) }),
          ...(params.limit && { limit: String(params.limit) }),
        });

        const res = await fetch(`/api/products?${query}`);
        const json = await res.json();

        setProducts(json.data || []);
        setPagination(json.pagination || null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.category, params.search, params.sort, params.page, params.limit]);

  return { products, pagination, loading, error };
}

export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((res) => {
        // Unwrap data
        const data = res.data ?? res;
        setProduct(data);
      })
      .catch(() => setError("Không tải được sản phẩm"))
      .finally(() => setLoading(false));
  }, [slug]);

  return { product, loading, error };
}

export function useRecommendedProducts({
  category,
  excludeIds = [],
  limit = 12,
}: {
  category?: string;
  excludeIds?: number[];
  limit?: number;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRecommendedProducts() {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();

        query.set("limit", String(limit));

        if (category) {
          query.set("category", category);
        }

        if (excludeIds.length > 0) {
          query.set("exclude", excludeIds.join(","));
        }
        query.set("limit", String(limit));

        const res = await fetch(
          `/api/products/recommended?${query.toString()}`,
        );

        if (!res.ok) {
          throw new Error("Failed to fetch recommended products");
        }

        const response = await res.json();

        const data = response.data ?? response;

        if (mounted) {
          setProducts(data);
        }
      } catch (err) {
        console.error(err);

        if (mounted) {
          setError("Không tải được sản phẩm liên quan");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchRecommendedProducts();

    return () => {
      mounted = false;
    };
  }, [category, limit, excludeIds.join(",")]);

  return {
    products,
    loading,
    error,
  };
}
