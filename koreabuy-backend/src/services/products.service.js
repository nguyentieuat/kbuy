// services/products.service.js

const ProductModel = require("../models/products.models");

/**
 * Format 1 row DB → shape ProductItem of the frontend is required
 */
function formatProduct(row) {
  // ── Lấy specs_vi từ extra_data ──
  const specsVi = row.extra_data?.specs_vi ?? null;

  const description = specsVi
    ? `
    <div style="display:flex; flex-direction:column;">
      ${Object.entries(specsVi)
        .map(
          ([key, val]) => `
          <div
            style="
              display:grid;
              grid-template-columns: 160px 1fr;
              gap:16px;
              padding:12px 0;
              border-bottom:1px solid #f0f0f0;
              align-items:start;
            "
          >
            <div
              style="
                color:#888;
                font-size:13px;
                line-height:1.6;
                word-break:break-word;
              "
            >
              ${key}
            </div>

            <div
              style="
                font-size:13px;
                line-height:1.7;
                color:#333;
                word-break:break-word;
              "
            >
              ${String(val).replace(/\n/g, "<br/>")}
            </div>
          </div>
        `,
        )
        .join("")}
    </div>
  `
    : null;

  return {
    // ── Thông tin cơ bản ──
    id: row.id,
    slug: row.slug ?? "",
    name: row.name ?? row.name_kr ?? "",
    name_kr: row.name_kr ?? null,

    // ── Giá ──
    price: row.price_min ?? 0,
    originalPrice: row.original_price ?? null,
    discountPercent: row.discount_percent ?? null,

    // ── Ảnh ──
    image: row.image ?? "",
    images: Array.isArray(row.images) ? row.images : [],

    // ── Variants ──
    variants: Array.isArray(row.variants) ? row.variants : [],

    // ── Mô tả: specs_vi từ extra_data ──
    description,

    // ── Đánh giá ──
    ratingAvg: row.source_rating_avg ?? null,
    ratingCount: row.source_rating_count ?? 0,

    // ── Shipping / Weight (FROM product_shipping) ──
    weightGrams: row.weightGrams ?? null,

    lengthMm: row.lengthMm ?? null,
    widthMm: row.widthMm ?? null,
    heightMm: row.heightMm ?? null,

    volumetricWeightGrams: row.volumetricWeightGrams ?? null,
    chargeableWeightGrams: row.chargeableWeightGrams ?? null,

    isBulky: row.isBulky ?? false,

    weightSource: row.weightSource ?? null,
    weightConfidence: row.weightConfidence ?? null,
    isWeightEstimated: row.isWeightEstimated ?? true,

    // ── Flags ──
    isFeatured: row.is_featured ?? false,
    isNew: row.new_arrival_until
      ? new Date(row.new_arrival_until) > new Date()
      : false,
    isSale: !!(row.original_price && row.price_min < row.original_price),

    // ── Misc ──
    productUrl: row.product_url ?? "",
    link: `/products/${row.slug}`,
    created_at: row.created_at,
  };
}

/**
 * Select featured products for ProductListGrid
 */
async function getFeaturedProducts(limit = 9) {
  const rows = await ProductModel.getFeaturedProducts(limit);
  return rows.map(formatProduct);
}

/**
 * Bring new products to ProductListCarousel
 */
async function getNewArrivalProducts(limit = 12) {
  const rows = await ProductModel.getNewArrivalProducts(limit);
  return rows.map(formatProduct);
}

/**
 * Get a list of products with filters/sorts/pagination.
 */
async function getProducts(query = {}) {
  const limit = parseInt(query.limit ?? 9);
  const page = parseInt(query.page ?? 1);

  const result = await ProductModel.getProducts({
    categorySlug: query.category_slug ?? null,
    search: query.search ?? null,
    sort: query.sort ?? null,
    page,
    limit,
  });

  return {
    data: result.data.map(formatProduct),
    pagination: result.pagination,
  };
}

/**
 * Extract details of a product by slug.
 */
async function getProductBySlug(slug) {
  const row = await ProductModel.getProductBySlug(slug);
  if (!row) return null;
  return formatProduct(row);
}

/**
 * Get a list of products recommend.
 */
async function getRecommendedProducts({
  categorySlug,
  excludeIds = [],
  limit = 12,
}) {
  let results = [];

  // =========================
  // CASE: có category
  // =========================
  if (categorySlug) {
    // 1. same category
    const sameCategory = await ProductModel.getProductsByCategory({
      categorySlug,
      excludeIds,
      limit,
    });

    results.push(...sameCategory);

    excludeIds = [...excludeIds, ...sameCategory.map((p) => p.id)];

    // 2. sibling categories
    if (results.length < limit) {
      const remain = limit - results.length;

      const parentProducts = await ProductModel.getProductsFromParentCategory({
        categorySlug,
        excludeIds,
        limit: remain,
      });

      results.push(...parentProducts);

      excludeIds = [...excludeIds, ...parentProducts.map((p) => p.id)];
    }
  }

  // =========================
  // GLOBAL FALLBACK
  // =========================

  if (results.length < limit) {
    const remain = limit - results.length;

    const featured = await ProductModel.getFeaturedProductsExcluding({
      excludeIds,
      limit: remain,
    });

    results.push(...featured);

    excludeIds = [...excludeIds, ...featured.map((p) => p.id)];
  }

  // =========================
  // LAST FALLBACK
  // random products
  // =========================

  if (results.length < limit) {
    const remain = limit - results.length;

    const randomProducts = await ProductModel.getRandomProducts({
      excludeIds,
      limit: remain,
    });

    results.push(...randomProducts);
  }

  return results.map(formatProduct);
}

module.exports = {
  getFeaturedProducts,
  getNewArrivalProducts,
  getProducts,
  getProductBySlug,
  getRecommendedProducts,
};
