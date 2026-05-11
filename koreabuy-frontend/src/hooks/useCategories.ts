// hooks/useCategories.ts

import { useEffect, useState } from "react";
import { fetchCategoryTree, fetchCategoryTreeWithCount } from "../api/categories.api";
import type { Category } from "../types/category";


export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCategoryTree();

        setCategories(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { categories, loading, error };
}

export function useCategoriesWithCount() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCategoryTreeWithCount();

        setCategories(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { categories, loading, error };
}
