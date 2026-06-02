// types/product.ts

export interface ProductImage {
  id: number;
  url: string;
  alt?: string | null;
  sort_order?: number;
}

export interface ProductOption {
  id: number;
  name: string;
  position: number;
  type: string;
  values: string[];
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  name?: string | null;
  nameKr?: string | null;
  pricing: {
    price: number | null;
    originalPrice: number | null;
    discountPercent?: number | null;
  };
  media: {
    image?: string | null;
    images?: ProductImage[];
  };
  attributes?: Record<string, string> | null;
  isActive: boolean;
  flags: {
    isActive: boolean;
    isSoldout: boolean;
  };
  shipping?: {
    weightGrams?: number | null;
    dimensions: {
      lengthMm?: number | null;
      widthMm?: number | null;
      heightMm?: number | null;
    };

    volumetricWeightGrams?: number | null;
    chargeableWeightGrams?: number | null;

    isBulky?: boolean;

    weightSource?: string | null;
    weightConfidence?: number | null;
    isWeightEstimated?: boolean;
  };
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  nameKr?: string | null;

  category: {
    id: number;
    slug: string;
  };

  // ── Giá ──
  pricing: {
    price: number | null;
    originalPrice: number | null;
    discountPercent?: number | null;
  };

  // ── Ảnh ──
  media: {
    image: string | null;
    images?: ProductImage[];
  };

  options?: ProductOption[];

  addons?: any[];

  // ── Variants ──
  variants?: ProductVariant[];

  // ── Mô tả ──
  description?: string | null;

  // ── Đánh giá ──

  rating: {
    avg: number | null;
    count: number | null;
  };

  // ── Flags ──
  flags: {
    featured: boolean;
    new: boolean;
  };

  // ── Misc ──
  metadata: {
    productUrl: string;
    link: string;
    createdAt: string;
  };

  // ── SHIPPING (NEW STRUCTURE) ──
  shipping?: {
    weightGrams?: number | null;
    dimensions: {
      lengthMm?: number | null;
      widthMm?: number | null;
      heightMm?: number | null;
    };

    volumetricWeightGrams?: number | null;
    chargeableWeightGrams?: number | null;

    isBulky?: boolean;

    weightSource?: string | null;
    weightConfidence?: number | null;
    isWeightEstimated?: boolean;
  };
}
