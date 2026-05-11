// components/HeroSlider.tsc

import { useEffect, useState } from "react";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectFade, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import DOMPurify from "dompurify";

export default function HeroSlider() {
  const [slides, setSlides] = useState<any[]>([]);

  useEffect(() => {
    axios
      .get("/api/banners?type=slide")
      .then((res) => setSlides(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
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
          <div
            className="untree_co-hero"
            style={{
              backgroundImage: `url(${slide.image_url})`,
              width: "100%",
            }}
          >
            <div className="container">
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <h1
                    className="mb-4 heading"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(slide.title),
                    }}
                  ></h1>

                  <p className="mb-0">
                    <a href={slide.link} className="btn btn-outline-black">
                      Explore now
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
