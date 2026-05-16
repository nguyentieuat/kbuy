// mappers/cart.mapper.js

function toCartItem(row) {
  return {
    id: String(row.id),

    quantity: row.quantity,

    product: {
      id: row.product_id,

      name:
        row.product_name_vi ??
        row.product_name_kr,

      slug: row.slug,

      image: row.product_image,

      price: Number(
        row.variant_price ??
        row.product_price ??
        0,
      ),

      product_url: row.product_url,
    },

    variant: row.variant_id
      ? {
          id: row.variant_id,

          name:
            row.variant_name_vi ??
            row.variant_name_kr,

          price: Number(
            row.variant_price ?? 0,
          ),
        }
      : null,
  };
}

function toCartItems(rows = []) {
  return rows.map(toCartItem);
}

module.exports = {
  toCartItem,
  toCartItems,
};
