// types/category.ts

export type Category = {
  id: number;
  name: string;
  slug: string;
  full_slug: string;
  parent_id?: number | null;
  children?: Category[];
  product_count?: number;

  is_source_group?: boolean;
  to:string;
};
