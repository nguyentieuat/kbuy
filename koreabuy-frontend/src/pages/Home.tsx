// pages/Home.tsx

import HeroSlider from "../components/HeroSlider";
import PromoBanner from "../components/PromoBanner";
import NewArrivalCarousel from "../components/containers/NewArrivalCarousel";
import FeaturedProductsGrid from "../components/containers/FeaturedProductsGrid";
import BrandCarouselSection from "../components/containers/BrandCarouselSection";
import { SOURCES } from "../constains/sourceConstain";

export default function Home() {
  return (
    <>
      <HeroSlider />

      <FeaturedProductsGrid />

      {SOURCES.map((item) => (
        <BrandCarouselSection
          key={item.value}
          source={item.value}
          title={`${item.label} nổi bật`}
        />
      ))}

      <PromoBanner />

      <NewArrivalCarousel />
    </>
  );
}
