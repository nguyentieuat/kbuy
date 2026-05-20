// mappers/cart.mapper.js

const { convertPrice, getKrwToVndRate } = require("../services/currency.service");

function toCartItem(row, rate = 19) {
  return {
    id: String(row.id),

    quantity: row.quantity,

    product: {
      id: row.product_id,

      name: row.product_name_vi ?? row.product_name_kr,

      slug: row.slug,

      media: {
        image: row.product_image,
      },
      pricing: {
        price: convertPrice(
          Number(row.product_price ?? row.variant_price ?? 0),
          rate,
        ),

        originalPrice: convertPrice(
          Number(row.product_original_price ?? row.variant_original_price ?? 0),
          rate,
        ),
      },

      metadata: {
        productUrl: row.product_url ?? row.productUrl,
        link: `/products/${row.slug}`,
        createdAt: row.created_at,
      },
    },

    variant: row.variant_id
      ? {
          id: row.variant_id,

          name: row.variant_name_vi ?? row.variant_name_kr,

          pricing: {
            price: convertPrice(Number(row.variant_price ?? 0), rate),

            originalPrice: convertPrice(
              Number(row.variant_original_price ?? 0),
              rate,
            ),
          },
        }
      : null,
  };
}

function toCartItems(rows = [], rate = 19) {
  return rows.map((row) => toCartItem(row, rate));
}

module.exports = {
  toCartItem,
  toCartItems,
};
