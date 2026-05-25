// components/HeroSlider.tsx

import { useEffect, useState } from "react";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectFade, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";

export default function HeroSlider() {
  const [slides, setSlides] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get("/api/banners?type=slide")
      .then((res) => setSlides(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <>
      <style>{`
        .hero-slide-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;

          /* Desktop */
          aspect-ratio: 19 / 10;
          max-height: 90vh;
        }

        .hero-slide-image {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;
          object-position: center center;

          display: block;
        }

        /* Tablet */
        @media (max-width: 992px) {
          .hero-slide-wrap {
            aspect-ratio: 16 / 9;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .hero-slide-wrap {
            aspect-ratio: 4 / 3;
          }

          .hero-slide-image {
            object-position: left center;
          }
        }

        @media (max-width: 480px) {
          .hero-slide-wrap {
            aspect-ratio: 1 / 1;
          }

          .hero-slide-image {
            object-position: left center;
          }
        }
      `}</style>

      <Swiper
        modules={[Pagination, EffectFade, Autoplay]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        slidesPerView={1}
        loop={slides.length > 1}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        speed={1000}
        pagination={{
          clickable: true,
        }}
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className="hero-slide-wrap">
              <img
                src={slide.image_url}
                alt={slide.alt || slide.title || "Kbuy banner"}
                className="hero-slide-image"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}