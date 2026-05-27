// mappers/product.mapper.js

const { convertPrice } = require("../services/currency.service");

function buildDescription({ specsVi, detailImages = [] }) {
  const specsHtml = specsVi
    ? `
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
    `
    : "";

  const detailHtml =
    Array.isArray(detailImages) && detailImages.length
      ? `
      <div style="
        margin-top:32px;
        display:flex;
        flex-direction:column;
        gap:0;
      ">
        ${detailImages
          .map(
            (url) => `
              <div style="
                width:100%;
                line-height:0;
                font-size:0;
              ">
                <img
                  src="${url}"
                  style="
                    width:100%;
                    display:block;
                    border-radius:12px;
                  "
                  loading="lazy"
                />
              </div>
            `,
          )
          .join("")}
      </div>
    `
      : "";

  return `${specsHtml}${detailHtml}` || null;
}

function mapProduct(row, rate = 19) {
  const specsVi = row.extra_data?.specs?.vi ?? row.extra_data?.specs_vi ?? null;
  const detailImages = row.extra_data?.detail_images ?? [];

  return {
    id: row.id,
    slug: row.slug,

    name: row.name,
    nameKr: row.name_kr,

    source: row.source,

    pricing: {
      price: convertPrice(Number(row.price ?? row.sale_price ?? 0), rate),
      originalPrice: convertPrice(
        Number(row.originalPrice ?? row.original_price ?? 0),
        rate,
      ),
      discountPercent: row.discountPercent ?? row.discount_percent ?? null,
    },

    category: {
      id: row.category_id,
      slug: row.category_slug,
    },

    media: {
      image: row.image,
      images: row.images || [],
    },

    variants: Array.isArray(row.variants)
      ? row.variants.map((v) => ({
          ...v,

          name: v.name_vi,
          nameKr: v.name_kr,

          productId: v.product_id,

          pricing: {
            price: convertPrice(Number(v.price), rate),

            originalPrice: convertPrice(Number(v.original_price), rate),

            discountPercent: v.discount_percent ?? v.discountPercent ?? null,
          },

          media: {
            image: v.image_url ?? row.image,

            images: (v.images ?? []).map((img) => ({
              url: img.url,
              type: img.type,
              isPrimary: img.is_primary,
            })),
          },

          // =========================
          // SHIPPING
          // =========================

          shipping: {
            weightGrams: v.shipping?.weight_grams ?? null,

            dimensions: {
              lengthMm: v.shipping?.length_mm ?? null,

              widthMm: v.shipping?.width_mm ?? null,

              heightMm: v.shipping?.height_mm ?? null,
            },

            volumetricWeightGrams: v.shipping?.volumetric_weight_grams ?? null,

            chargeableWeightGrams: v.shipping?.chargeable_weight_grams ?? null,

            isBulky: v.shipping?.is_bulky ?? false,

            weightSource: v.shipping?.weight_source ?? null,

            weightConfidence: v.shipping?.weight_confidence ?? null,

            isWeightEstimated: v.shipping?.is_weight_estimated ?? true,
          },

          flags: {
            isActive: v.is_active,
            isSoldout: v.is_soldout,
          },
        }))
      : [],

    description: buildDescription(specsVi, detailImages),

    shipping: {
      weightGrams: row.weightGrams,
      dimensions: {
        lengthMm: row.lengthMm,
        widthMm: row.widthMm,
        heightMm: row.heightMm,
      },
      volumetricWeightGrams: row.volumetricWeightGrams,
      chargeableWeightGrams: row.chargeableWeightGrams,
      isBulky: row.isBulky,
      weightSource: row.weightSource,
      weightConfidence: row.weightConfidence,
      isWeightEstimated: row.isWeightEstimated,
    },

    rating: {
      avg: row.ratingAvg ?? null,
      count: row.ratingCount ?? 0,
    },

    flags: {
      featured: row.isFeatured,
      new: row.newArrivalUntil
        ? new Date(row.newArrivalUntil) > new Date()
        : false,
    },

    metadata: {
      productUrl: row.product_url ?? row.productUrl,
      link: `/products/${row.slug}`,
      createdAt: row.created_at,
    },
  };
}

module.exports = {
  mapProduct,
};
