// models/products.models.js

const db = require("../config/db.config");

// ==============================
// CONFIG
// ==============================

const FALLBACK_NEW_DAYS = 30;
const FALLBACK_FEATURED_REVIEWS = 1000;
const FALLBACK_FEATURED_RATING = 4.7;

// ==============================
// SHARED SELECT
// ==============================

/**
 * Shared product select
 * Dùng chung toàn project để tránh thiếu field
 */
function productSelect(query) {
  return query.select(
    // =========================
    // PRODUCT CORE
    // =========================
    "p.id",
    db.raw('p.name_vi as "name"'),
    "p.name_kr",
    db.raw('p.price_min as "price"'),
    db.raw('p.original_price as "originalPrice"'),
    "p.product_url",
    "p.slug",
    db.raw('p.discount_percent as "discountPercent"'),
    db.raw('p.source_rating_avg as "ratingAvg"'),
    db.raw('p.source_rating_count as "ratingCount"'),
    db.raw('p.is_featured as "isFeatured"'),
    db.raw('p.new_arrival_until as "newArrivalUntil"'),

    "p.created_at",

    // =========================
    // SHIPPING (FROM product_shipping)
    // =========================

    db.raw('ps.weight_grams as "weightGrams"'),
    db.raw('ps.length_mm as "lengthMm"'),
    db.raw('ps.width_mm as "widthMm"'),
    db.raw('ps.height_mm as "heightMm"'),

    db.raw('ps.volumetric_weight_grams as "volumetricWeightGrams"'),
    db.raw('ps.chargeable_weight_grams as "chargeableWeightGrams"'),

    db.raw('ps.is_bulky as "isBulky"'),

    db.raw('ps.weight_source as "weightSource"'),
    db.raw('ps.weight_confidence as "weightConfidence"'),
    db.raw('ps.is_weight_estimated as "isWeightEstimated"'),

    // =========================
    // PRIMARY IMAGE
    // =========================
    db.raw(`
      (
        SELECT url
        FROM product_images
        WHERE product_id = p.id
          AND is_primary = true
        LIMIT 1
      ) as "image"
    `),
  );
}
/**
 * Base query dùng chung
 */
function baseProductQuery() {
  return db("products as p")
    .leftJoin("categories as c", "c.id", "p.category_id")
    .leftJoin("product_shipping as ps", "ps.product_id", "p.id")
    .where("p.is_active", true)
    .where("p.is_deleted", false);
}

// ==============================
// FEATURED PRODUCTS
// ==============================

async function getFeaturedProducts(limit = 9) {
  const query = baseProductQuery();

  query.modify(productSelect);

  query.where(function () {
    this.where("p.is_featured", true).orWhere(function () {
      this.where(
        "p.source_rating_count",
        ">=",
        FALLBACK_FEATURED_REVIEWS,
      ).andWhere("p.source_rating_avg", ">=", FALLBACK_FEATURED_RATING);
    });
  });

  return query
    .orderByRaw(
      `
      p.is_featured DESC,
      p.source_rating_avg DESC
    `,
    )
    .limit(limit);
}

// ==============================
// NEW ARRIVAL PRODUCTS
// ==============================

async function getNewArrivalProducts(limit = 12) {
  const fallbackDate = new Date();

  fallbackDate.setDate(fallbackDate.getDate() - FALLBACK_NEW_DAYS);

  const query = baseProductQuery();

  query.modify(productSelect);

  query.where(function () {
    this.where("p.new_arrival_until", ">", db.fn.now()).orWhere(
      "p.created_at",
      ">=",
      fallbackDate,
    );
  });

  return query
    .orderByRaw(
      `
      p.new_arrival_until DESC NULLS LAST,
      p.created_at DESC
    `,
    )
    .limit(limit);
}

// ==============================
// PRODUCT LIST
// ==============================

async function getProducts({
  categorySlug,
  search,
  sort = "newest",
  page = 1,
  limit = 12,
}) {
  const offset = (page - 1) * limit;

  // ===== BASE =====

  const baseQuery = baseProductQuery();

  // ===== CATEGORY TREE =====

  if (categorySlug) {
    baseQuery.whereIn("p.category_id", function () {
      this.withRecursive("category_tree", (qb) => {
        qb.select("id")
          .from("categories")
          .where("slug", categorySlug)

          .unionAll(function () {
            this.select("c.id")
              .from("categories as c")
              .join("category_tree as ct", "c.parent_id", "ct.id");
          });
      })

        .select("id")
        .from("category_tree");
    });
  }

  // ===== SEARCH =====

  if (search) {
    baseQuery.andWhereILike("p.name_vi", `%${search}%`);
  }

  // ===== SORT =====

  switch (sort) {
    case "price_asc":
      baseQuery.orderBy("p.price_min", "asc");
      break;

    case "price_desc":
      baseQuery.orderBy("p.price_min", "desc");
      break;

    case "rating_desc":
      baseQuery
        .orderBy("p.source_rating_avg", "desc")
        .orderBy("p.source_rating_count", "desc");
      break;

    case "featured":
      baseQuery
        .orderBy("p.is_featured", "desc")
        .orderBy("p.featured_order", "asc")
        .orderBy("p.created_at", "desc");
      break;

    default:
      baseQuery.orderBy("p.created_at", "desc");
  }

  // ===== COUNT =====

  const countQuery = baseQuery
    .clone()
    .clearSelect()
    .clearOrder()
    .countDistinct("p.id as total");

  const countResult = await countQuery.first();

  const total = Number(countResult?.total || 0);

  // ===== DATA =====

  const dataQuery = baseQuery
    .clone()
    .modify(productSelect)
    .limit(limit)
    .offset(offset);

  const data = await dataQuery;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ==============================
// PRODUCT DETAIL
// ==============================
async function getProductBySlug(slug) {
  const query = baseProductQuery();

  query.modify(productSelect);

  query.select(
    "p.extra_data",

    db.raw(`
      (
        SELECT json_agg(pi ORDER BY pi.sort_order)
        FROM product_images pi
        WHERE pi.product_id = p.id
      ) AS images
    `),

    db.raw(`
      (
        SELECT json_agg(pv ORDER BY pv.id)
        FROM product_variants pv
        WHERE pv.product_id = p.id
          AND pv.is_active = true
      ) AS variants
    `),
  );

  query
    .where("p.slug", slug)
    .first();

  return query;
}

// ==============================
// RECOMMENDATION
// ==============================

/**
 * Same category
 */
async function getProductsByCategory({
  categorySlug,
  excludeIds = [],
  limit = 12,
}) {
  const query = baseProductQuery();

  query.modify(productSelect);

  query.where("c.slug", categorySlug);

  if (excludeIds.length > 0) {
    query.whereNotIn("p.id", excludeIds);
  }

  return query
    .orderBy("p.is_featured", "desc")
    .orderBy("p.source_rating_avg", "desc")
    .orderBy("p.created_at", "desc")
    .limit(limit);
}

/**
 * Sibling categories
 */
async function getProductsFromParentCategory({
  categorySlug,
  excludeIds = [],
  limit = 12,
}) {
  // ===== CURRENT CATEGORY =====

  const currentCategory = await db("categories")
    .where("slug", categorySlug)
    .first();

  if (!currentCategory) {
    return [];
  }

  // no parent
  if (!currentCategory.parent_id) {
    return [];
  }

  // ===== SIBLINGS =====

  const siblingCategories = await db("categories")
    .select("id")
    .where("parent_id", currentCategory.parent_id)
    .whereNot("id", currentCategory.id);

  const siblingIds = siblingCategories.map((c) => c.id);

  if (siblingIds.length === 0) {
    return [];
  }

  // ===== PRODUCTS =====

  const query = baseProductQuery();

  query.modify(productSelect);

  query.whereIn("p.category_id", siblingIds);

  if (excludeIds.length > 0) {
    query.whereNotIn("p.id", excludeIds);
  }

  return query
    .orderBy("p.is_featured", "desc")
    .orderBy("p.source_rating_avg", "desc")
    .orderBy("p.created_at", "desc")
    .limit(limit);
}

/**
 * Featured fallback
 */
async function getFeaturedProductsExcluding({ excludeIds = [], limit = 12 }) {
  const query = baseProductQuery();

  query.modify(productSelect);

  query.where("p.is_featured", true);

  if (excludeIds.length > 0) {
    query.whereNotIn("p.id", excludeIds);
  }

  return query
    .orderBy("p.source_rating_avg", "desc")
    .orderBy("p.created_at", "desc")
    .limit(limit);
}

async function getRandomProducts({ excludeIds = [], limit = 12 }) {
  const query = baseProductQuery();

  query.modify(productSelect);

  if (excludeIds.length > 0) {
    query.whereNotIn("p.id", excludeIds);
  }

  return query.orderByRaw("RANDOM()").limit(limit);
}

module.exports = {
  getFeaturedProducts,
  getNewArrivalProducts,
  getProducts,
  getProductBySlug,

  // recommendation
  getProductsByCategory,
  getProductsFromParentCategory,
  getFeaturedProductsExcluding,
  getRandomProducts,
};
