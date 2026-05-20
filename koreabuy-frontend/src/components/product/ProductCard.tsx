// components/product/ProductCard.tsx

type Props = {
  name: string
  price: number         // giá hiện tại
  originalPrice?: number // giá gốc (tùy chọn)
  image: string
  link?: string         // link tới trang chi tiết
  isNew?: boolean       // có label New không
  isSale?: boolean      // có label Sale không
  discountPercent?: number | null 
}

export default function ProductCard({
  name,
  price,
  originalPrice,
  image,
  link = '#',
  isNew = false,
  isSale = false,
  discountPercent,
}: Props) {
  return (
    <div className="product-item" style={{ position: 'relative', textAlign: 'center'}}>
      <a href={link} className="product-img">
        {isNew && (
          <div className="label new top-right">
            <div className="content">New</div>
          </div>
        )}
        {isSale && discountPercent && (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "#e53935",
              color: "#fff",
              borderRadius: 6,
              padding: "3px 10px",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            -{discountPercent}%
          </span>
        )}
        <img src={image} alt={name} className="img-fluid" />
      </a>
      <h3 className="title">
        <a href={link}>{name}</a>
      </h3>
       <div className="mb-4 d-flex align-items-baseline gap-3">
        <span style={{ fontSize: "1.9rem", fontWeight: 700, color: "#e53935" }}>
          {price.toLocaleString("vi-VN")}₫
        </span>

        {originalPrice && originalPrice > price && (
          <s style={{ color: "#aaa" }}>
            {originalPrice.toLocaleString("vi-VN")}₫
          </s>
        )}
      </div>
    </div>
  )
}
