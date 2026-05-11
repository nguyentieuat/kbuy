// components/product/ProductsCarousel.tsx

import type { Product } from "../../types/product";
import ProductCard from "../product/ProductCard";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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
}

export default function ProductsCarousel({
  products,
  title = "Sản phẩm mới",
  isHome = false,
}: Props) {
  const desktopSlides = isHome ? 3 : 4;
  return (
    <div className="product-carousel-container container">
      {/* Header — title + custom nav buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="text-muted" style={{ cursor: "pointer" }}>
          {title}
        </h2>

        <div className="nav-buttons" style={{ display: "flex", gap: "8px" }}>
          <i className="bi bi-arrow-left-circle prev-btn" style={iconStyle} />
          <i className="bi bi-arrow-right-circle next-btn" style={iconStyle} />
        </div>
      </div>

      <Swiper
        loop={true}
        modules={[Navigation, Pagination]}
        spaceBetween={30}
        slidesPerView={3}
        slidesPerGroup={3}
        navigation={{
          nextEl: ".next-btn",
          prevEl: ".prev-btn",
        }}
        pagination={{
          clickable: true,
          el: ".custom-pagination",
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
              price={Number(product.price)}
              originalPrice={
                product.originalPrice
                  ? Number(product.originalPrice)
                  : undefined
              }
              image={product.image || ""}
              link={`${product.link}`}
              isNew={!!product.newArrivalUntil}
              isSale={!!product.discountPercent}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Pagination dots */}
      <div
        className="custom-pagination"
        style={{ textAlign: "center", marginTop: "20px" }}
      />
    </div>
  );
}
