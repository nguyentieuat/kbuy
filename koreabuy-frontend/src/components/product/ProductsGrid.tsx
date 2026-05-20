// components/product/ProductsGrid.tsx

import type { Product } from "../../types/product";
import { normalizeImageUrl } from "../../utils/image";
import ProductCard from "../product/ProductCard";

interface Props {
  products: Product[];
  isHome?: boolean;
}

export default function ProductListGrid({ products, isHome = false }: Props) {
  const colClassName = isHome
    ? "col-6 col-md-6 mb-4 col-lg-4"
    : "col-6 col-md-6 mb-4 col-lg-3";

  return (
    <div className="row">
      {products.map((product) => (
        <div key={product.id} className={colClassName}>
          <ProductCard
            name={product.name}
            price={Number(product.pricing.price)}
            originalPrice={
              product.pricing.originalPrice
                ? Number(product.pricing.originalPrice)
                : undefined
            }
            image={normalizeImageUrl(product.media.image)}
            link={`${product.metadata.link}`}
            isNew={!!product.flags.new}
            isSale={!!product.pricing.discountPercent}
            discountPercent={product.pricing.discountPercent ?? undefined}
          />
        </div>
      ))}
    </div>
  );
}
