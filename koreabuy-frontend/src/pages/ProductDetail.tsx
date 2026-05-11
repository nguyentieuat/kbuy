// pages/ProductDetail.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import type { ProductVariant } from "../types/product";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import ProductGallery from "../components/product/ProductGallery";
import ProductInfoPanel from "../components/product/ProductInfoPanel";
import ProductDetailSkeleton from "../components/product/ProductDetailSkeleton";

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

  // Derived data
  const images = product?.images ?? [];

  // Chỉ lấy variants active
  const activeVariants = (product?.variants ?? []).filter((v) => v.is_active);

  // Khi đổi variant thì đổi luôn ảnh chính
  useEffect(() => {
    if (!selectedVariant && activeVariants.length > 0) {
      const firstAvailable =
        activeVariants.find((v) => !v.is_soldout) ?? activeVariants[0];

      setSelectedVariant(firstAvailable);
    }
  }, [product?.id]);

  useEffect(() => {
    if (!variantSelectedByUser) return;
    if (!selectedVariant?.image_url) return;

    const imageIndex = images.findIndex(
      (img) => img.url === selectedVariant.image_url,
    );

    if (imageIndex >= 0) {
      setSelectedImage(imageIndex);
    }
  }, [selectedVariant, images, variantSelectedByUser]);

  // Loading / Error
  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return <div className="container py-5">Không tìm thấy sản phẩm.</div>;
  }

  // Giá hiện tại
  const currentPrice = selectedVariant?.price ?? product.price ?? 0;

  // Giá gốc
  const originalPrice =
    selectedVariant?.original_price ?? product.originalPrice ?? null;

  // % giảm giá
  const discountPercent =
    selectedVariant?.discount_percent ??
    product.discountPercent ??
    (originalPrice && originalPrice > currentPrice
      ? Math.round((1 - currentPrice / originalPrice) * 100)
      : null);

  // Ảnh hiển thị chính
  const mainImageUrl = variantSelectedByUser
    ? selectedVariant?.image_url ||
      images[selectedImage]?.url ||
      product.image ||
      images[0]?.url
    : images[selectedImage]?.url ||
      product.image ||
      images[0]?.url ||
      selectedVariant?.image_url;

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
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

