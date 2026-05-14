// services/products.service.js

const ProductModel = require("../models/products.models");
const { mapProduct } = require("../mappers/product.mapper");

/**
 * Select featured products for ProductListGrid
 */
async function getFeaturedProducts(limit = 9) {
  const rows = await ProductModel.getFeaturedProducts(limit);
  return rows.map(mapProduct);
}

/**
 * Bring new products to ProductListCarousel
 */
async function getNewArrivalProducts(limit = 12) {
  const rows = await ProductModel.getNewArrivalProducts(limit);
  return rows.map(mapProduct);
}

/**
 * Get a list of products with filters/sorts/pagination.
 */
async function getProducts(query = {}) {
  const limit = parseInt(query.limit ?? 12);
  const page = parseInt(query.page ?? 1);

  const result = await ProductModel.getProducts({
    categorySlug: query.category_slug ?? null,
    source: query.source ?? null,
    search: query.search ?? null,
    sort: query.sort ?? null,
    page,
    limit,
  });

  return {
    data: result.data.map(mapProduct),
    pagination: result.pagination,
  };
}

/**
 * Extract details of a product by slug.
 */
async function getProductBySlug(slug) {
  const row = await ProductModel.getProductBySlug(slug);
  if (!row) return null;
  return mapProduct(row);
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

  return results.map(mapProduct);
}

module.exports = {
  getFeaturedProducts,
  getNewArrivalProducts,
  getProducts,
  getProductBySlug,
  getRecommendedProducts,
};
