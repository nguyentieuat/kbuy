// pages/ProductDetail.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProduct, useRecommendedProducts } from "../hooks/useProducts";
import type { ProductVariant } from "../types/product";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import ProductGallery from "../components/product/ProductGallery";
import ProductInfoPanel from "../components/product/ProductInfoPanel";
import ProductDetailSkeleton from "../components/product/ProductDetailSkeleton";
import ProductsCarousel from "../components/product/ProductsCarousel";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { product, loading, error } = useProduct(slug);
  // Global hooks
  const { addToCart } = useCart();
  const { toast, show } = useToast();

  // Local states
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [variantSelectedByUser, setVariantSelectedByUser] = useState(false);

  const category = product?.category.slug;
  const excludeIds = product?.id ? [product.id] : [];

  const [mainImageUrl, setMainImage] = useState<string>("");

  const { products: recommendedProducts } = useRecommendedProducts({
    category,
    excludeIds,
  });
  // Derived data
  const images = product?.media.images ?? [];

  // Chỉ lấy variants active
  const activeVariants = (product?.variants ?? []).filter(
    (v) => v.flags.isActive,
  );

  // Ảnh hiển thị chính
  useEffect(() => {
    if (!product) return;

    const defaultImage =
      images[selectedImage]?.url || product.media.image || images[0]?.url || "";

    setMainImage(defaultImage);
  }, [product, selectedImage]);

  // Khi đổi variant thì đổi luôn ảnh chính
  useEffect(() => {
    if (!variantSelectedByUser || !selectedVariant) return;

    const variantImages = selectedVariant.media.images ?? [];

    const newImage =
      variantImages[0]?.url ||
      selectedVariant.media.image ||
      images[0]?.url ||
      "";

    if (newImage) {
      setMainImage(newImage);
    }
  }, [selectedVariant, variantSelectedByUser, images]);

  // Loading / Error
  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return <div className="container py-5">Không tìm thấy sản phẩm.</div>;
  }

  // Giá hiện tại
  const currentPrice =
    selectedVariant?.pricing.price ?? product.pricing.price ?? 0;

  // Giá gốc
  const originalPrice =
    selectedVariant?.pricing.originalPrice ??
    product.pricing.originalPrice ??
    null;

  // % giảm giá
  const discountPercent =
    selectedVariant?.pricing.discountPercent ??
    product.pricing.discountPercent ??
    (originalPrice && originalPrice > currentPrice
      ? Math.round((1 - currentPrice / originalPrice) * 100)
      : null);

  // Chuẩn hóa image url
  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return "";

    // Absolute URL
    if (url.startsWith("http")) return url;

    // Relative URL
    return url.startsWith("/") ? url : `/${url}`;
  };

  // Mua ngay
  const handleBuyNow = () => {
    if (activeVariants.length > 0 && !selectedVariant) {
      alert("Vui lòng chọn phân loại sản phẩm");
      return;
    }

    addToCart(product, selectedVariant, quantity);
    navigate("/checkout");
  };

  // Thêm vào giỏ
  const handleAddToCart = () => {
    if (activeVariants.length > 0 && !selectedVariant) {
      alert("Vui lòng chọn phân loại sản phẩm");
      return;
    }

    addToCart(product, selectedVariant, quantity);

    // Hiện toast success
    show("Đã thêm vào giỏ hàng");
  };

  return (
    <div className="untree_co-section" style={{ paddingTop: "120px" }}>
      <div className="container">
        <div className="row g-5">
          {/* ===== LEFT: ẢNH ===== */}
          <ProductGallery
            productName={product.name}
            images={images}
            activeVariants={activeVariants}
            mainImageUrl={mainImageUrl ?? ""}
            discountPercent={discountPercent}
            selectedImage={selectedImage}
            selectedVariant={selectedVariant}
            setSelectedImage={setSelectedImage}
            setVariantSelectedByUser={setVariantSelectedByUser}
            normalizeImageUrl={normalizeImageUrl}
          />

          {/* ===== RIGHT: THÔNG TIN ===== */}
          <ProductInfoPanel
            product={product}
            currentPrice={currentPrice}
            originalPrice={originalPrice}
            activeVariants={activeVariants}
            selectedVariant={selectedVariant}
            setSelectedVariant={setSelectedVariant}
            setVariantSelectedByUser={setVariantSelectedByUser}
            quantity={quantity}
            setQuantity={setQuantity}
            handleAddToCart={handleAddToCart}
            handleBuyNow={handleBuyNow}
            showFullDescription={showFullDescription}
            setShowFullDescription={setShowFullDescription}
            normalizeImageUrl={normalizeImageUrl}
          />
        </div>
      </div>

      <div style={{ margin: "53px 0 29px 0", textAlign: "center" }}>
        <div
          style={{
            height: 1,
            background: "#eee",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -10,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#fff",
              padding: "0 12px",
              fontWeight: 600,
              color: "#888",
            }}
          >
            Sản phẩm gợi ý
          </span>
        </div>
      </div>
      <ProductsCarousel products={recommendedProducts} title="" />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
