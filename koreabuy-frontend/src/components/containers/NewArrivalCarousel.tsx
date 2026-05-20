// components/ProductListCarousel.tsx

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useNewArrivalProducts } from "../../hooks/useProducts";
import ProductsCarousel from "../product/ProductsCarousel";

// Skeleton placeholder while loading
function SkeletonSlide() {
  return (
    <div
      style={{
        height:       320,
        background:   "#f0f0f0",
        borderRadius: 8,
        animation:    "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

export default function ProductListCarousel() {
  const { products, loading, error } = useNewArrivalProducts(12);
  // Show skeleton carousel while fetching
  if (loading) {
    return (
      <div className="product-carousel-container container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "24px", fontFamily: "serif" }}>New Arrivals</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonSlide key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Fail silently on homepage — no error UI needed
  if (error || !products.length) return null;

  return (
    <ProductsCarousel products={products} isHome/>
  );
}