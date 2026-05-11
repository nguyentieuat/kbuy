// components/product/ProductCard.tsx

type Props = {
  name: string
  price: number         // giá hiện tại
  originalPrice?: number // giá gốc (tùy chọn)
  image: string
  link?: string         // link tới trang chi tiết
  isNew?: boolean       // có label New không
  isSale?: boolean      // có label Sale không
}

export default function ProductCard({
  name,
  price,
  originalPrice,
  image,
  link = '#',
  isNew = false,
  isSale = false,
}: Props) {
  return (
    <div className="product-item" style={{ position: 'relative', textAlign: 'center'}}>
      <a href={link} className="product-img">
        {isNew && (
          <div className="label new top-right">
            <div className="content">New</div>
          </div>
        )}
        {isSale && (
          <div className="label sale top-right second">
            <div className="content">Sale</div>
          </div>
        )}
        <img src={image} alt={name} className="img-fluid" />
      </a>
      <h3 className="title">
        <a href={link}>{name}</a>
      </h3>
      <div className="price">
        {originalPrice && <del>£{originalPrice.toLocaleString()}</del>} &mdash;{' '}
        <span>£{price.toLocaleString()}</span>
      </div>
    </div>
  )
}
