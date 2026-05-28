// components/product/ProductsCarousel.tsx

import { useRef } from "react";
import type { Product } from "../../types/product";
import ProductCard from "../product/ProductCard";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { normalizeImageUrl } from "../../utils/image";

const iconStyle = {
  fontSize: "30px",
  color: "#ccc",
  cursor: "pointer",
  transition: "color 0.3s",
};

interface Props {
  products: Product[];
  title?: string;
  isHome?: boolean;
  showTitle?: boolean;
}

export default function ProductsCarousel({
  products,
  title = "Sản phẩm mới",
  isHome = false,
  showTitle = true,
}: Props) {
  const desktopSlides = isHome ? 3 : 4;

  const prevRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLElement>(null);

  return (
    <div className="product-carousel-container container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="text-muted" style={{ cursor: "pointer" }}>
          {showTitle ? title : ""}
        </h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <i
            ref={prevRef}
            className="bi bi-arrow-left-circle"
            style={iconStyle}
          />

          <i
            ref={nextRef}
            className="bi bi-arrow-right-circle"
            style={iconStyle}
          />
        </div>
      </div>

      <Swiper
        loop
        modules={[Navigation, Pagination]}
        spaceBetween={30}
        slidesPerView={3}
        slidesPerGroup={3}
        pagination={{
          clickable: true,
          el: ".custom-pagination",
        }}
        onBeforeInit={(swiper: SwiperType) => {
          // @ts-ignore
          swiper.params.navigation.prevEl = prevRef.current;

          // @ts-ignore
          swiper.params.navigation.nextEl = nextRef.current;
        }}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        breakpoints={{
          0: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: {
            slidesPerView: desktopSlides,
          },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <ProductCard
              name={product.name}
              price={Number(product.pricing.price)}
              originalPrice={
                product.pricing.originalPrice
                  ? Number(product.pricing.originalPrice)
                  : undefined
              }
              image={normalizeImageUrl(product.media.image)}
              link={`${product.metadata.link}`}
              isNew={!!product.flags.new}
              isSale={!!product.pricing.discountPercent}
              discountPercent={product.pricing.discountPercent ?? undefined}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div
        className="custom-pagination"
        style={{ textAlign: "center", marginTop: "0px" }}
      />
    </div>
  );
}
