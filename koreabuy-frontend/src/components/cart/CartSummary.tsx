// components/cart/CartSummary.tsx

import { useNavigate } from "react-router-dom";
import { calculateCartTotals } from "../../utils/cartTotals";
import { calculateOrderTotal } from "../../utils/order";
import type { CartItem } from "../../types/cart";
import styles from "./CartSummary.module.css";

interface CartSummaryProps {
  items: CartItem[];
}

export default function CartSummary({ items }: CartSummaryProps) {
  const navigate = useNavigate();

  const { totalChargeableWeight, totalOriginal, totalFinal, totalDiscount, totalQuantity } =
    calculateCartTotals(items);

  const { shippingFee, estimatedTotal } = calculateOrderTotal({
    totalFinal,
    totalChargeableWeight,
  });

  return (
    <div className="col-lg-4">
      <div className={styles.wrapper}>
        <h5 className={styles.title}>Tóm tắt đơn hàng</h5>

        <div className={styles.row}>
          <span>Giá sản phẩm ({totalQuantity} sản phẩm)</span>
          <span>
            {totalOriginal > 0 ? `${totalOriginal.toLocaleString("vi-VN")}₫` : "—"}
          </span>
        </div>

        {totalDiscount > 0 && (
          <div className={styles.rowDiscount}>
            <span>Khuyến mãi</span>
            <span>-{totalDiscount.toLocaleString("vi-VN")}₫</span>
          </div>
        )}

        <div className={styles.row}>
          <span>Vận chuyển Hàn Quốc → Việt Nam (ước tính)</span>
          <span>{shippingFee.toLocaleString("vi-VN")}₫</span>
        </div>

        <p className={styles.weightNote}>
          Khối lượng tạm tính: {(totalChargeableWeight / 1000).toFixed(2)}kg
        </p>

        <div className={styles.divider} />

        <div className={styles.totalRow}>
          <span>Tạm tính đơn hàng</span>
          <span className={styles.totalAmount}>
            {estimatedTotal > 0 ? `${estimatedTotal.toLocaleString("vi-VN")}₫` : "Liên hệ"}
          </span>
        </div>

        <p className={styles.note}>
          * Phí vận chuyển quốc tế được ước tính theo khối lượng sản phẩm và có thể chênh lệch
          nhẹ khi đóng gói thực tế.
          <br />* Phí giao hàng nội địa Việt Nam sẽ được tính ở bước thanh toán.
        </p>

        {totalDiscount > 0 && (
          <p className={styles.saveNote}>
            Tiết kiệm {totalDiscount.toLocaleString("vi-VN")}₫
          </p>
        )}

        <button
          className={`btn btn-primary w-100 mt-4 ${styles.btnCheckout}`}
          onClick={() => navigate("/checkout")}
        >
          Đặt hàng
        </button>
        <button
          className="btn btn-outline-secondary w-100 mt-2"
          style={{ padding: "12px 0", borderRadius: 8 }}
          onClick={() => navigate("/products")}
        >
          Tiếp tục mua sắm
        </button>
      </div>
    </div>
  );
}
