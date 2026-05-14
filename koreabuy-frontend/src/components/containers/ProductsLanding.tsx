// components/containers/ProductsLanding.tsx

import FeaturedProductsGrid from "../../components/containers/FeaturedProductsGrid";
import BrandCarouselSection from "./BrandCarouselSection";
import { SOURCES } from "../../constains/sourceConstain";

export default function ProductsLanding() {
  return (
    <div className="container" style={{ paddingTop: "100px" }}>
      <FeaturedProductsGrid />

      {SOURCES.map((item) => (
        <BrandCarouselSection
          key={item.value}
          source={item.value}
          title={`${item.label} nổi bật`}
        />
      ))}
    </div>
  );
}
