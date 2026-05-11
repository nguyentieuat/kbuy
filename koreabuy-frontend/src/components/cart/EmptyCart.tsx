// components/cart/EmptyCart.tsx

import { useNavigate } from "react-router-dom";

export default function EmptyCart() {
  const navigate = useNavigate();

  return (
    <div
      className="untree_co-section"
      style={{ paddingTop: 120 }}
    >
      <div className="container text-center py-5">
        <div style={{ fontSize: 64 }}>🛒</div>

        <h3>Giỏ hàng trống</h3>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/products")}
        >
          Tiếp tục mua sắm
        </button>
      </div>
    </div>
  );
}
