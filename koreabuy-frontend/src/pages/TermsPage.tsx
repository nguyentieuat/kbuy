// pages/TermsPage.tsx
import { useShippingRates } from "../hooks/useShippingRates";

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "₫";
}

function fmtKg(grams: number | null) {
  if (!grams) return "∞";
  return grams >= 1000 ? `${grams / 1000}kg` : `${grams}g`;
}

export default function TermsPage() {
  const { data, loading } = useShippingRates();

  return (
    <div style={{ maxWidth: 1020, margin: "0 auto", padding: "110px 20px" }}>

      {/* ══════════════════════════════════════ */}
      {/* ĐIỀU KHOẢN                            */}
      {/* ══════════════════════════════════════ */}
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Điều khoản sử dụng
      </h1>
      <p style={{ color: "#888", marginBottom: 32 }}>
        Cập nhật lần cuối: 01/06/2026
      </p>

      {[
        {
          title: "1. Giới thiệu",
          content:
            "KBuy là nền tảng mua hàng Hàn Quốc hộ tại Việt Nam. Khi sử dụng dịch vụ, bạn đồng ý với các điều khoản dưới đây.",
        },
        {
          title: "2. Quy trình đặt hàng",
          content:
            "Bạn đặt hàng trên KBuy → chúng tôi mua và vận chuyển về Việt Nam → giao đến địa chỉ của bạn. Thời gian vận chuyển quốc tế thường từ 5–10 ngày làm việc.",
        },
        {
          title: "3. Thanh toán",
          content:
            "Giá sản phẩm hiển thị đã quy đổi sang VND theo tỷ giá cập nhật hàng ngày. Phí dịch vụ và phí vận chuyển được tính riêng và hiển thị trước khi xác nhận đơn.",
        },
        {
          title: "4. Chính sách hoàn hàng",
          content:
            "Do đặc thù hàng nhập khẩu, chúng tôi chỉ hỗ trợ hoàn hàng trong trường hợp hàng bị lỗi từ nhà sản xuất hoặc giao sai sản phẩm. Vui lòng liên hệ trong vòng 48 giờ sau khi nhận hàng.",
        },
        {
          title: "5. Giới hạn trách nhiệm",
          content:
            "KBuy không chịu trách nhiệm về sự chậm trễ do hải quan, thiên tai, hoặc các yếu tố ngoài tầm kiểm soát. Chúng tôi sẽ thông báo kịp thời nếu có sự cố.",
        },
        {
          title: "6. Bảo mật thông tin",
          content:
            "Thông tin cá nhân của bạn được bảo mật và không chia sẻ với bên thứ ba trừ khi cần thiết cho việc giao hàng.",
        },
      ].map((section) => (
        <section key={section.title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
            {section.title}
          </h2>
          <p style={{ color: "#444", lineHeight: 1.7 }}>{section.content}</p>
        </section>
      ))}

      {/* ══════════════════════════════════════ */}
      {/* BIỂU PHÍ VẬN CHUYỂN                  */}
      {/* ══════════════════════════════════════ */}
      <hr style={{ margin: "40px 0", borderColor: "#eee" }} />

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        Biểu phí vận chuyển
      </h2>
      <p style={{ color: "#888", marginBottom: 28, fontSize: 14 }}>
        Phí vận chuyển được tính tự động theo cân nặng và khu vực giao hàng.
      </p>

      {loading ? (
        <p style={{ color: "#aaa" }}>Đang tải biểu phí...</p>
      ) : !data ? (
        <p style={{ color: "#e53935" }}>Không thể tải biểu phí.</p>
      ) : (
        <>
          {/* Quốc tế */}
          <section style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              🌏 Phí vận chuyển quốc tế (Hàn Quốc → Việt Nam)
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={th}>Khoảng cân nặng</th>
                  <th style={th}>Đơn giá / kg</th>
                  <th style={th}>Ví dụ (1kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.international.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={td}>
                      {fmtKg(row.minWeight)} – {fmtKg(row.maxWeight)}
                    </td>
                    <td style={td}>{fmt(row.ratePerKg)}</td>
                    <td style={{ ...td, color: "#888" }}>
                      {fmt(row.ratePerKg)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bulky fee */}
            {data.bulky.filter((b: any) => b.shippingType === "international").map((b: any) => (
              <p key="intl-bulky" style={{ fontSize: 13, color: "#e53935", marginTop: 10 }}>
                ⚠️ Phụ phí hàng cồng kềnh: +{fmt(b.fee)} / sản phẩm
              </p>
            ))}
          </section>

          {/* Nội địa */}
          <section style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              🏠 Phí giao hàng nội địa (trong Việt Nam)
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={th}>Khu vực</th>
                  <th style={th}>Phí cơ bản</th>
                  <th style={th}>Phí thêm / 500g</th>
                  <th style={th}>Miễn phí từ</th>
                </tr>
              </thead>
              <tbody>
                {data.local.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={td}>{row.region}</td>
                    <td style={td}>{fmt(row.baseFee)}</td>
                    <td style={td}>{fmt(row.stepFee)}</td>
                    <td style={{ ...td, color: "#2e7d32" }}>
                      {fmt(row.freeShippingThreshold)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.bulky.filter((b: any) => b.shippingType === "local").map((b: any) => (
              <p key="local-bulky" style={{ fontSize: 13, color: "#e53935", marginTop: 10 }}>
                ⚠️ Phụ phí hàng cồng kềnh nội địa: +{fmt(b.fee)} / sản phẩm
              </p>
            ))}
          </section>

          {/* Ưu đãi */}
          {data.discountRules.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                🎁 Ưu đãi phí vận chuyển
              </h3>
              <ul style={{ paddingLeft: 20 }}>
                {data.discountRules.map((rule: any, i: number) => (
                  <li key={i} style={{ marginBottom: 8, fontSize: 14, color: "#444" }}>
                    {rule.name}
                    {rule.minOrderAmount && (
                      <span style={{ color: "#888" }}>
                        {" "}(đơn từ {fmt(rule.minOrderAmount)})
                      </span>
                    )}
                    {rule.maxDiscountAmount && (
                      <span style={{ color: "#888" }}>
                        {" "}— tối đa {fmt(rule.maxDiscountAmount)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Ghi chú */}
          <section
            style={{
              background: "#f8f9fa",
              borderRadius: 10,
              padding: "16px 20px",
              fontSize: 13,
              color: "#555",
              lineHeight: 1.7,
            }}
          >
            <strong>Lưu ý:</strong>
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              <li>Phí vận chuyển quốc tế tính theo cân nặng thực tế hoặc cân thể tích (lấy giá trị lớn hơn).</li>
              <li>Cân thể tích = Dài × Rộng × Cao (cm) ÷ 6000.</li>
              <li>Phí có thể thay đổi theo tỷ giá và chính sách carrier.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

// Style helpers
const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  borderBottom: "2px solid #e0e0e0",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};
