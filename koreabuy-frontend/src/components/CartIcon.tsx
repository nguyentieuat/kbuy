// components/CartIcon.tsx

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import MiniCart from "./MiniCart";

export default function CartIcon() {
  const { totalCount } = useCart();
  const navigate = useNavigate();
  const [showMini, setShowMini] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = window.innerWidth < 992;

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowMini(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    hideTimer.current = setTimeout(() => setShowMini(false), 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobile) {
      navigate("/cart");
    } else {
      navigate("/cart");
    }
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a href="/cart" className="cart" onClick={handleClick}>
        {totalCount > 0 && (
          <span className="item-in-cart">{totalCount}</span>
        )}
        <svg width="1em" height="1em" viewBox="0 0 16 16"
          className="bi bi-cart" fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path fillRule="evenodd" d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
        </svg>
      </a>

      {/* MiniCart — chỉ hiện trên desktop khi hover */}
      {showMini && !isMobile && (
        <MiniCart onClose={() => setShowMini(false)} />
      )}
    </div>
  );
}
