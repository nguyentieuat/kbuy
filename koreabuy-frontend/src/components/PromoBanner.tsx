// components/PromoBanner.tsx

import { useEffect, useState } from "react";
import axios from "axios";

type Banner = {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
};

export default function PromoBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    axios
      .get("/api/banners?type=promo_banner")
      .then((res) => {
        // lấy banner đầu tiên
        setBanner(res.data[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  if (!banner) return null;

  return (
    <div className="untree_co-section" style={{ paddingTop: "13px", paddingBottom: "53px" }}>
      <div className="container">
        <div
          className="deal-hero overlay"
          style={{
            backgroundImage: `url(${banner.image_url})`,
          }}
        >
          <div className="deal-contents">
            <span className="subtitle">{banner.subtitle}</span>
            <h2 className="title mb-4">{banner.title}</h2>

            <a href={banner.link || "#"} className="btn btn-black">
              Shop Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}