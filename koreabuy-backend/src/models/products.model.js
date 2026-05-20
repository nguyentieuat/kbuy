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
    "p.category_id",
    "p.category_slug",
    db.raw('p.sale_price as "price"'),
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
    // SHIPPING (FROM product_variant_shipping)
    // =========================

    db.raw('pvs.weight_grams as "weightGrams"'),
    db.raw('pvs.length_mm as "lengthMm"'),
    db.raw('pvs.width_mm as "widthMm"'),
    db.raw('pvs.height_mm as "heightMm"'),

    db.raw('pvs.volumetric_weight_grams as "volumetricWeightGrams"'),
    db.raw('pvs.chargeable_weight_grams as "chargeableWeightGrams"'),

    db.raw('pvs.is_bulky as "isBulky"'),

    db.raw('pvs.weight_source as "weightSource"'),
    db.raw('pvs.weight_confidence as "weightConfidence"'),
    db.raw('pvs.is_weight_estimated as "isWeightEstimated"'),

    // =========================
    // PRIMARY IMAGE
    // =========================
    db.raw(`
      (
        SELECT pvi.url
        FROM product_variant_images pvi
        WHERE pvi.product_id = p.id
          AND pvi.is_primary = true
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

    .leftJoin("product_variant_shipping as pvs", function () {
      this.on("pvs.product_id", "=", "p.id").andOnNull("pvs.variant_id");
    })

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
  source,
  search,
  sort = "newest",
  page = 1,
  limit = 12,
}) {
  const offset = (page - 1) * limit;

  // ===== BASE =====

  const baseQuery = baseProductQuery();

  // ===== SOURCE =====

  if (source) {
    baseQuery.andWhereRaw("LOWER(p.source) = LOWER(?)", [source]);
  }

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

    // =========================
    // PRODUCT IMAGES
    // =========================
    db.raw(`
      (
        SELECT json_agg(
          json_build_object(
            'id', pvi.id,
            'url', pvi.url,
            'sort_order', pvi.sort_order
          )
          ORDER BY pvi.sort_order
        )
        FROM product_variant_images pvi
        WHERE pvi.product_id = p.id
      ) AS images
    `),

    // =========================
    // VARIANTS + VARIANT IMAGES (NESTED)
    // =========================
    db.raw(`
        (
          SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,

              'name_vi', pv.name_vi,
              'name_kr', pv.name_kr,

              'price', pv.price,
              'original_price', pv.original_price,

              'image_url', pv.image_url,
              'image_detail_url', pv.image_detail_url,

              'attributes', pv.attributes,

              'is_active', pv.is_active,
              'is_soldout', pv.is_soldout,

              -- =========================
              -- SHIPPING
              -- =========================

              'shipping', json_build_object(
                'weight_grams', pvs.weight_grams,
                'length_mm', pvs.length_mm,
                'width_mm', pvs.width_mm,
                'height_mm', pvs.height_mm,

                'volumetric_weight_grams',
                  pvs.volumetric_weight_grams,

                'chargeable_weight_grams',
                  pvs.chargeable_weight_grams,

                'is_bulky', pvs.is_bulky,

                'weight_source', pvs.weight_source,

                'weight_confidence',
                  pvs.weight_confidence,

                'is_weight_estimated',
                  pvs.is_weight_estimated
              ),

              -- =========================
              -- IMAGES
              -- =========================

              'images', (
                SELECT COALESCE(
                  json_agg(
                    json_build_object(
                      'id', pvi.id,
                      'url', pvi.url,
                      'type', pvi.image_type,
                      'is_primary', pvi.is_primary,
                      'sort_order', pvi.sort_order
                    )
                    ORDER BY pvi.sort_order
                  ),
                  '[]'::json
                )
                FROM product_variant_images pvi
                WHERE pvi.variant_id = pv.id
              )
            )
            ORDER BY pv.id
          )

          FROM product_variants pv

          LEFT JOIN product_variant_shipping pvs
            ON pvs.variant_id = pv.id

          WHERE pv.product_id = p.id
            AND pv.is_active = true
        ) AS variants
        `),
  );

  query.where("p.slug", slug).first();

  return query;
}

async function getProductById(productId) {
  const query = baseProductQuery();

  query.modify(productSelect);
  
  query.select(
    "p.extra_data",

    // =========================
    // PRODUCT IMAGES
    // =========================
    db.raw(`
      (
        SELECT json_agg(
          json_build_object(
            'id', pvi.id,
            'url', pvi.url,
            'sort_order', pvi.sort_order
          )
          ORDER BY pvi.sort_order
        )
        FROM product_variant_images pvi
        WHERE pvi.product_id = p.id
      ) AS images
    `),

    // =========================
    // VARIANTS + VARIANT IMAGES (NESTED)
    // =========================
    db.raw(`
        (
          SELECT json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,

              'name_vi', pv.name_vi,
              'name_kr', pv.name_kr,

              'price', pv.price,
              'original_price', pv.original_price,

              'image_url', pv.image_url,
              'image_detail_url', pv.image_detail_url,

              'attributes', pv.attributes,

              'is_active', pv.is_active,
              'is_soldout', pv.is_soldout,

              -- =========================
              -- SHIPPING
              -- =========================

              'shipping', json_build_object(
                'weight_grams', pvs.weight_grams,
                'length_mm', pvs.length_mm,
                'width_mm', pvs.width_mm,
                'height_mm', pvs.height_mm,

                'volumetric_weight_grams',
                  pvs.volumetric_weight_grams,

                'chargeable_weight_grams',
                  pvs.chargeable_weight_grams,

                'is_bulky', pvs.is_bulky,

                'weight_source', pvs.weight_source,

                'weight_confidence',
                  pvs.weight_confidence,

                'is_weight_estimated',
                  pvs.is_weight_estimated
              ),

              -- =========================
              -- IMAGES
              -- =========================

              'images', (
                SELECT COALESCE(
                  json_agg(
                    json_build_object(
                      'id', pvi.id,
                      'url', pvi.url,
                      'type', pvi.image_type,
                      'is_primary', pvi.is_primary,
                      'sort_order', pvi.sort_order
                    )
                    ORDER BY pvi.sort_order
                  ),
                  '[]'::json
                )
                FROM product_variant_images pvi
                WHERE pvi.variant_id = pv.id
              )
            )
            ORDER BY pv.id
          )

          FROM product_variants pv

          LEFT JOIN product_variant_shipping pvs
            ON pvs.variant_id = pv.id

          WHERE pv.product_id = p.id
            AND pv.is_active = true
        ) AS variants
        `),
  );
  query.where("p.id", productId).first();

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

async function getDefaultShippingByProducts(productIds = []) {
  if (!productIds.length) return [];

  return db("products as p")
    .leftJoin("product_variant_shipping as pvs", function () {
      this.on("p.id", "=", "pvs.product_id").andOnNull("pvs.variant_id");
    })
    .select(
      // product
      "p.id",

      "p.name_kr",
      "p.name_vi",

      "p.sale_price",
      "p.original_price",

      "p.currency",

      "p.is_active",
      "p.is_deleted",

      // shipping
      "pvs.is_bulky",
      "pvs.weight_grams",
      "pvs.chargeable_weight_grams",
    )
    .whereIn("p.id", productIds)
    .where({
      "p.is_active": true,
      "p.is_deleted": false,
    });
}
module.exports = {
  getFeaturedProducts,
  getNewArrivalProducts,
  getProducts,
  getProductBySlug,
  getProductById,

  // recommendation
  getProductsByCategory,
  getProductsFromParentCategory,
  getFeaturedProductsExcluding,
  getRandomProducts,
  getDefaultShippingByProducts,
};
