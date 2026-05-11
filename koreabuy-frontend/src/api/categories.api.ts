// api/categories.api.ts

export async function fetchCategoryTree() {
  const res = await fetch("/api/categories/tree");

  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }

  const json = await res.json();
  return json.data;
}

export async function fetchCategoryTreeWithCount() {
  const res = await fetch("/api/categories/treecount");

  if (!res.ok) {
    throw new Error("Failed to fetch categories with count");
  }

  const json = await res.json();
  return json.data;
}
