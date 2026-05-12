// mappers/product.mapper.js

function buildDescription(specsVi) {
  if (!specsVi) return null;

  return `
    <div style="display:flex; flex-direction:column;">
      ${Object.entries(specsVi)
        .map(
          ([key, val]) => `
          <div
            style="
              display:grid;
              grid-template-columns:160px 1fr;
              gap:16px;
              padding:12px 0;
              border-bottom:1px solid #f0f0f0;
            "
          >
            <div
              style="
                color:#888;
                font-size:13px;
                line-height:1.6;
              "
            >
              ${key}
            </div>

            <div
              style="
                font-size:13px;
                line-height:1.7;
                color:#333;
              "
            >
              ${String(val).replace(/\n/g, "<br/>")}
            </div>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
}

function mapProduct(row) {
  const specsVi = row.extra_data?.specs_vi ?? null;

  return {
    id: row.id,

    slug: row.slug ?? "",

    name: row.name ?? row.name_kr ?? "",
    nameKr: row.name_kr ?? null,

    price: Number(row.price_min ?? 0),

    originalPrice: row.original_price
      ? Number(row.original_price)
      : null,

    discountPercent: row.discount_percent ?? null,

    image: row.image ?? "",
    images: Array.isArray(row.images)
      ? row.images
      : [],

    variants: Array.isArray(row.variants)
      ? row.variants
      : [],

    description: buildDescription(specsVi),

    ratingAvg: row.source_rating_avg
      ? Number(row.source_rating_avg)
      : null,

    ratingCount: row.source_rating_count ?? 0,

    weightGrams: row.weightGrams ?? null,

    lengthMm: row.lengthMm ?? null,
    widthMm: row.widthMm ?? null,
    heightMm: row.heightMm ?? null,

    volumetricWeightGrams:
      row.volumetricWeightGrams ?? null,

    chargeableWeightGrams:
      row.chargeableWeightGrams ?? null,

    isBulky: row.isBulky ?? false,

    weightSource: row.weightSource ?? null,
    weightConfidence: row.weightConfidence ?? null,

    isWeightEstimated:
      row.isWeightEstimated ?? true,

    isFeatured: row.is_featured ?? false,

    isNew: row.new_arrival_until
      ? new Date(row.new_arrival_until) > new Date()
      : false,

    isSale:
      !!(
        row.original_price &&
        row.price_min < row.original_price
      ),

    productUrl: row.product_url ?? "",

    link: `/products/${row.slug}`,

    createdAt: row.created_at,
  };
}

module.exports = {
  mapProduct,
};
