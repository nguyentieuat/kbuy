// components/common/ScrollToTopButton.tsx

import { useEffect, useState } from "react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 999,

        width: "48px",
        height: "48px",

        borderRadius: "999px",
        border: "none",

        background: "#111",
        color: "#fff",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",

        cursor: "pointer",

        transition: "all 0.2s ease",
      }}
    >
      <i className="bi bi-arrow-up" />
    </button>
  );
}
