
// components/product/ProductCard.tsx

type Props = {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  link?: string;
  isNew?: boolean;
  isSale?: boolean;
  discountPercent?: number;
};

export default function ProductCard({
  name,
  price,
  originalPrice,
  image,
  link = "#",
  isNew = false,
  isSale = false,
  discountPercent,
}: Props) {
  return (
    <div
      className="product-item"
      style={{ position: "relative", textAlign: "center" }}
    >
      {/* ── Ảnh + Labels ── */}
      <a
        href={link}
        className="product-img"
        style={{ position: "relative", display: "block" }}
      >
        {/* Labels — góc trên trái, cùng hàng */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            flexDirection: "row", // ✅ cùng hàng
            gap: 6,
            zIndex: 1,
          }}
        >
          {isNew && (
            <span
              style={{
                background: "#1d4ed8",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 10px",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              New
            </span>
          )}

          {isSale && discountPercent && (
            <span
              style={{
                background: "#e53935",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 10px",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              -{discountPercent}%
            </span>
          )}
        </div>
        <img src={image} alt={name} className="img-fluid" />
      </a>

      {/* ── Tên sản phẩm ── */}
      <h3 className="title" style={{ marginTop: 10, marginBottom: 6 }}>
        <a href={link}>{name}</a>
      </h3>

      {/* ── Giá ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {/* Giá sale nổi bật */}
        <span
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: isSale ? "#e53935" : "#333",
          }}
        >
          {price.toLocaleString("vi-VN")}₫
        </span>

        {/* Giá gốc gạch ngang */}
        {originalPrice && originalPrice > price && (
          <s style={{ color: "#aaa", fontSize: "0.9rem" }}>
            {originalPrice.toLocaleString("vi-VN")}₫
          </s>
        )}
      </div>
    </div>
  );
}
