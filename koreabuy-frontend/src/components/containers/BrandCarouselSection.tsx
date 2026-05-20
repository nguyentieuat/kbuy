// components/containers/BrandCarouselSection.tsx

import { useEffect, useState } from "react";
import ProductsCarousel from "../product/ProductsCarousel";
import type { Product } from "../../types/product";

type Props = {
  title?: string;
  source: string;
};

export default function BrandCarouselSection({
  title = "Thương hiệu nổi bật",
  source,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/products?source=${source}&sort=featured&limit=12`,
        );

        const result = await res.json();

        setProducts(result.data || []);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [source]);

  if (loading) {
    return (
      <div
        className="untree_co-section"
      >
        <div className="container">
          <h5
            style={{
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {title}
          </h5>

          <div
            style={{
              display: "flex",
              gap: 12,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  minWidth: 120,
                  height: 120,
                  borderRadius: 16,
                  background: "#f2f2f2",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="untree_co-section" style={{
          paddingTop: 23,
        }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h5 style={{ fontWeight: 700 }}>{title}</h5>

          <p
            style={{
              fontSize: 13,
              color: "#888",
              margin: 0,
            }}
          >
            Khám phá sản phẩm nổi bật
          </p>
        </div>

        {/* Products */}
        <ProductsCarousel products={products} isHome showTitle={false} />
      </div>
    </div>
  );
}
