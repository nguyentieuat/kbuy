// models/cartItem.model.js

const db = require("../config/db.config");

async function findItems(cartId) {
  return (
    db("cart_items as ci")
      .leftJoin("products as p", "ci.product_id", "p.id")

      .leftJoin("product_variants as pv", "ci.variant_id", "pv.id")

      // primary image
      .leftJoin("product_variant_images as pvi", function () {
        this.on("pvi.product_id", "=", "p.id").andOn(
          "pvi.is_primary",
          "=",
          db.raw("true"),
        );
      })

      .where("ci.cart_id", cartId)

      .select(
        "ci.id",
        "ci.quantity",

        "p.id as product_id",
        "p.slug",

        "p.name_kr as product_name_kr",
        "p.name_vi as product_name_vi",

        "p.sale_price as product_price",
        "p.original_price as product_original_price",
        

        "p.product_url",

        "pv.id as variant_id",

        "pv.name_kr as variant_name_kr",
        "pv.name_vi as variant_name_vi",

        "pv.price as variant_price",
        "pv.original_price as variant_original_price",

        // product image
        "pvi.url as product_image",
      )
  );
}
async function findExisting(cartId, productId, variantId) {
  return db("cart_items")
    .where({
      cart_id: cartId,
      product_id: productId,
      variant_id: variantId ?? null,
    })
    .first();
}

async function create(data) {
  return db("cart_items").insert(data);
}

async function updateQuantity(id, quantity) {
  return db("cart_items").where("id", id).update({
    quantity,
  });
}

async function deleteById(id) {
  return db("cart_items").where("id", id).delete();
}

async function findById(cartId, itemId) {
  return db("cart_items")
    .where({
      id: itemId,
      cart_id: cartId,
    })
    .first();
}

module.exports = {
  findItems,
  findExisting,
  create,
  updateQuantity,
  deleteById,
  findById,
};
