// components/cart/CartSummary.tsx

import { useNavigate } from "react-router-dom";
import { calculateCartTotals } from "../../utils/cartTotals";
import type { CartItem } from "../../types/cart";
import styles from "./CartSummary.module.css";
import { useShippingFee } from "../../hooks/useShippingFee";

interface CartSummaryProps {
  items: CartItem[];
}

export default function CartSummary({ items }: CartSummaryProps) {
  const navigate = useNavigate();

  const {
    totalOriginal,
    totalFinal,
    totalDiscount,
    totalQuantity,
    totalChargeableWeight,
  } = calculateCartTotals(items);

  // Chỉ tính phí quốc tế, không có địa chỉ
  const { result: shippingResult, loading: shippingLoading } = useShippingFee({
    items,
    provinceCode: null,
    wardCode: null,
    method: "standard", // dùng standard để ước tính
    orderTotal: totalFinal,
  });

  const internationalFee = shippingResult?.internationalFee ?? 0;
  const estimatedTotal = totalFinal + internationalFee;

  return (
    <div className="col-lg-4">
      <div className={styles.wrapper}>
        <h5 className={styles.title}>Tóm tắt đơn hàng</h5>

        <div className={styles.row}>
          <span>Giá sản phẩm ({totalQuantity} sản phẩm)</span>
          <span>
            {totalOriginal > 0
              ? `${totalOriginal.toLocaleString("vi-VN")}₫`
              : "—"}
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
          <span>
            {shippingLoading
              ? "Đang tính..."
              : `${internationalFee.toLocaleString("vi-VN")}₫`}
          </span>
        </div>

        <p className={styles.weightNote}>
          Khối lượng tạm tính:{" "}
          {(Number(shippingResult?.weightGrams ?? 0) / 1000).toFixed(2)}kg
        </p>

        <div className={styles.divider} />

        <div className={styles.totalRow}>
          <span>Tạm tính đơn hàng</span>
          <span className={styles.totalAmount}>
            {shippingLoading
              ? "Đang tính..."
              : estimatedTotal > 0
                ? `${estimatedTotal.toLocaleString("vi-VN")}₫`
                : "Liên hệ"}
          </span>
        </div>

        <p className={styles.note}>
          * Phí vận chuyển quốc tế được ước tính theo khối lượng và có thể chênh
          lệch khi đóng gói thực tế.
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
