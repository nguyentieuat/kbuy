// controllers/products.controller.js

const ProductsService = require("../services/products.service");

/**
 * GET /api/products?type=featured&limit=8
 * GET /api/products?type=new_arrival&limit=12
 * GET /api/products?category=mat-na&sort=newest&page=1&limit=20
 */
async function getProducts(req, res) {
  try {
    const {
      type,
      category,
      source,
      search,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // Featured
    if (type === "featured") {
      const products = await ProductsService.getFeaturedProducts(
        parseInt(limit ?? 9),
      );

      return res.json({
        success: true,
        data: products,
        pagination: null,
      });
    }

    // New arrival
    if (type === "new_arrival") {
      const products = await ProductsService.getNewArrivalProducts(
        parseInt(limit ?? 12),
      );

      return res.json({
        success: true,
        data: products,
        pagination: null,
      });
    }

    // Default list
    const normalizedQuery = {
      category_slug: category,
      source: source,
      search: search,
      sort: sort,
      page: page,
      limit: limit,
    };

    const result = await ProductsService.getProducts(normalizedQuery);

    return res.json({
      success: true,
      ...result, // { data, pagination }
    });
  } catch (err) {
    console.error("[products.controller] getProducts:", err.message);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}

/**
 * GET /api/products/:slug
 */
async function getProductBySlug(req, res) {
  try {
    const { slug } = req.params;
    const product = await ProductsService.getProductBySlug(slug);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("[products.controller] getProductBySlug:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}

async function getProductById(req, res) {
  try {
    const { productId } = req.params;
    const product = await ProductsService.getProductById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("[products.controller] getProductBySlug:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}

/**
 * GET /api/products/recommended
 */
async function getRecommendedProducts(req, res) {
  try {
    const { category, exclude, limit = 12 } = req.query;

    const excludeIds = exclude
      ? exclude.split(",").map(Number).filter(Boolean)
      : [];

    const products = await ProductsService.getRecommendedProducts({
      categorySlug: category,
      excludeIds,
      limit: Number(limit),
    });

    return res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error("[products.controller] getRecommendedProducts:", err.message);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}

module.exports = {
  getProducts,
  getProductBySlug,
  getProductById,
  getRecommendedProducts,
};
