// containers/ProductListGrid.tsx

import { useFeaturedProducts } from "../../hooks/useProducts";
import ProductsGrid from "../product/ProductsGrid";

export default function ProductListGrid() {
  const { products, loading, error } = useFeaturedProducts(6);
  // Loading skeleton
  if (loading) {
    return (
      <div className="untree_co-section">
        <div className="container">
          <div className="row">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="col-6 col-md-6 mb-4 col-lg-4">
                <div
                  style={{
                    height: 320,
                    background: "#f0f0f0",
                    borderRadius: 8,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) return null; // fail silently on homepage
  if (!products.length) return null;

  return (
    <div className="untree_co-section" style={{paddingTop: "53px"}}>
      <div className="container">
        <ProductsGrid products={products} isHome/>
      </div>
    </div>
  );
}
