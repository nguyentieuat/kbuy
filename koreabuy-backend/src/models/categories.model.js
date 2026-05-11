// models/categories.model.js
const db = require("../config/db.config");

const getAllCategories = () => {
  return db("categories")
    .where({ is_active: true })
    .orderBy("sort_order", "asc");
};

const getCategoriesWithCount = async () => {
  return db("categories as c")
    .select(
      "c.id",
      "c.name",
      "c.slug",
      "c.parent_id",
      "c.sort_order",
      db.raw(`COUNT(p.id)::int as product_count`)
    )
    .leftJoin("products as p", function () {
      this.on("p.category_id", "=", "c.id")
        .andOn("p.is_active", "=", db.raw("true"))
        .andOn("p.is_deleted", "=", db.raw("false"));
    })
    .where("c.is_active", true)
    .groupBy(
      "c.id",
      "c.name",
      "c.slug",
      "c.parent_id",
      "c.sort_order"
    )
    .orderBy("c.sort_order", "asc");
};

module.exports = {
  getAllCategories,
  getCategoriesWithCount
};

