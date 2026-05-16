// types/product.ts

export interface ProductImage {
  id: number;
  url: string;
  alt?: string | null;
  sort_order?: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name_vi?: string | null;
  name_kr?: string | null;
  price: number | null;
  original_price: number | null;
  discount_percent?: number | null;
  is_soldout: boolean;
  image_url?: string | null;
  attributes?: Record<string, string> | null;
  is_active: boolean;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  name_kr?: string | null;
  link: string;

  categoryId: number;
  categorySlug: string;

  // ── Giá ──
  price: number | null;
  originalPrice: number | null;
  discountPercent?: number | null;

  // ── Ảnh ──
  image: string | null;
  images?: ProductImage[];

  // ── Variants ──
  variants?: ProductVariant[];

  // ── Mô tả ──
  description?: string | null;

  // ── Đánh giá ──
  ratingAvg?: number | null;
  ratingCount?: number | null;

  // ── Flags ──
  isFeatured: boolean;
  isNew?: boolean;
  isSale?: boolean;

  // ── Misc ──
  productUrl?: string;
  newArrivalUntil?: string | null;
  created_at: string;

  // ── SHIPPING (NEW STRUCTURE) ──
  shipping?: {
    weightGrams?: number | null;
    lengthMm?: number | null;
    widthMm?: number | null;
    heightMm?: number | null;

    volumetricWeightGrams?: number | null;
    chargeableWeightGrams?: number | null;

    isBulky?: boolean;

    weightSource?: string | null;
    weightConfidence?: number | null;
    isWeightEstimated?: boolean;
  };
}
