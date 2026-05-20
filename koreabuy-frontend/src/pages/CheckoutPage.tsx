// pages/CheckoutPage.tsx

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import AddressModal from "../components/AddressModal";
import { useRegion } from "../hooks/useAddress";
import { calculateShippingTotal, type Region } from "../utils/shipping";
import OtpModal from "../components/OtpModal";
import PayQrModal from "../components/PayQrModal";
import { useOtpCheck } from "../hooks/useOtpCheck";
import {
  useSubmitOrder,
  type SubmitOrderPayload,
} from "../hooks/useSubmitOrder";
import RadioCard from "../components/checkout/RadioCard";
import type {
  FormData,
  FormErrors,
  PaymentMethod,
  SelectedAddress,
  ShippingMethod,
} from "../components/checkout/types";
import { PAYMENT_OPTIONS } from "../components/checkout/constants";
import ReceiverInfoSection from "../components/checkout/ReceiverInfoSection";
import ShippingMethodSection from "../components/checkout/ShippingMethodSection";
import OrderNoteSection from "../components/checkout/OrderNoteSection";
import CouponSection from "../components/checkout/CouponSection";
import OrderItemList from "../components/checkout/OrderItemList";
import OrderSummary from "../components/checkout/OrderSummary";
import { useAuth } from "../contexts/AuthContext";
import { useValidateCoupon } from "../hooks/useValidateCoupon";
import { normalizeImageUrl } from "../utils/image";
import { fmt } from "../utils/format";
import type { AppliedCoupon } from "../types/coupon";
import { calculateCartTotals } from "../utils/cartTotals";
import { useShippingFee } from "../hooks/useShippingFee";

export default function CheckoutPage() {
  const { items, clearCart } = useCart();

  const navigate = useNavigate();

  const { toast, show: showToast } = useToast();

  const { checkOtp } = useOtpCheck();

  const { user } = useAuth();

  const { validateCoupon, loading: validatingCoupon } = useValidateCoupon();

  // Form
  const [form, setForm] = useState<FormData>({
    gender: "male",
    full_name: "",
    phone: "",
    email: "",
    note: "",

    province: null,
    ward: null,
    detail: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const [showAddressModal, setShowAddressModal] = useState(false);

  const [selectedAddress, setSelectedAddress] =
    useState<SelectedAddress | null>(null);

  // Chỉ chạy 1 lần khi user load xong và có default_address
  useEffect(() => {
    if (!user?.default_address) return;

    const selected = user.default_address;

    setForm((prev) => ({
      ...prev,
      full_name:
        prev.full_name || selected.receiver_name || user.full_name || "",
      phone: prev.phone || selected.receiver_phone || user.phone || "",
      email: prev.email || user.email || "",
      gender: prev.gender || selected.receiver_gender || "other",
      province: prev.province || selected.province || null,
      ward: prev.ward || selected.ward || null,
      detail: prev.detail || selected.detail || "",
    }));
  }, [user?.default_address]); // trigger khi default_address thay đổi

  // Auto fill default address
  useEffect(() => {
    if (!user?.default_address) return;

    setSelectedAddress(user.default_address);
  }, [user]);
  // Pay
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingOrderPayload, setPendingOrderPayload] = useState<any>(null);

  // Shipping
  const [shipping, setShipping] = useState<ShippingMethod>("fast");

  // Coupon
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<AppliedCoupon | null>(
    null,
  );
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Submit
  const {
    submitOrder,
    submitting,
    error: submitError,
  } = useSubmitOrder((result) => {
    // Callback khi QR — hiện QR modal
    setPendingOrderPayload({
      orderId: result.orderId,
      orderCode: result.orderCode,
      grandTotal: result.finalPrice,
      phone: form.phone,
      txnRef: result.payment!.txnRef,
      qrUrl: result.payment!.qrUrl,
      bankInfo: result.payment!.bankInfo,
    });
    setShowPayModal(true);
  });

  useEffect(() => {
    if (submitError) showToast(submitError, "error");
  }, [submitError]);

  useEffect(() => {
    if (!couponApplied) return;

    handleRemoveCoupon();
  }, [shipping]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const {
    totalChargeableWeight,
    totalOriginal,
    totalFinal,
    totalDiscount,
    totalQuantity,
  } = calculateCartTotals(items);

  const provinceCode = selectedAddress?.province?.code ?? null;
  const wardCode = selectedAddress?.ward?.code ?? null;

  const { result: shippingResult, loading: shippingLoading } = useShippingFee({
    items,
    provinceCode,
    wardCode,
    method: shipping,
    orderTotal: totalFinal,
  });

  const fastShipping = useShippingFee({
    items,
    provinceCode,
    wardCode,
    method: "fast",
    orderTotal: totalFinal,
  });

  const standardShipping = useShippingFee({
    items,
    provinceCode,
    wardCode,
    method: "standard",
    orderTotal: totalFinal,
  });

  const shippingFee = shippingResult?.total ?? 0;
  const region = (shippingResult?.region ?? "unknown") as Region;

  const serviceFee = useMemo(() => {
    if (paymentMethod === "cod") {
      return (
        Math.round(totalFinal * 0.08) +
        Math.max(5000, Math.round(totalFinal * 0.01))
      ); // // phí nền tảng + 1%, tối thiểu 5,000₫
    }
    return Math.round(totalFinal * 0.08); // phí nền tảng
  }, [paymentMethod, totalFinal]);

  const totalProductDiscount = totalOriginal - totalFinal;
  const grandTotal =
    totalFinal + serviceFee + shippingFee - couponDiscount - shippingDiscount;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;

    try {
      setCouponError("");

      const result = await validateCoupon({
        code: coupon.trim().toUpperCase(),
        userId: user?.id,
        email: form.email || undefined,
        phone: normalizePhone(form.phone),
        orderAmount: totalFinal,
        shippingFee,
      });

      setCouponApplied(result.coupon);
      setCouponDiscount(result.discount);

      if (result.coupon.discountType === "freeship") {
        setShippingDiscount(shippingFee);

        setCouponDiscount(0);
      } else {
        setShippingDiscount(0);
        setCouponDiscount(result.discount);
      }
    } catch (err: any) {
      setCouponApplied(null);
      setCouponDiscount(0);

      setCouponError(err.message || "Không thể áp dụng mã giảm giá");
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon("");
    setCouponApplied(null);
    setCouponDiscount(0);
    setShippingDiscount(0);
    setCouponError("");
  };

  const normalizePhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "").replace(/^\+84/, "0");

    if (cleaned.startsWith("0")) {
      return cleaned.slice(1);
    }

    return cleaned;
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.full_name.trim()) errs.full_name = "Vui lòng nhập họ tên";

    if (!form.phone.trim()) {
      errs.phone = "Vui lòng nhập số điện thoại";
    } else {
      const normalized = normalizePhone(form.phone);

      if (!/^\d{9}$/.test(normalized)) {
        errs.phone = errs.phone =
          "Số điện thoại không hợp lệ (VD: 0912345678 hoặc 912345678)";
      }
    }

    if (!selectedAddress) errs.address = "Vui lòng chọn địa chỉ nhận hàng";
    return errs;
  };

  const buildPayload = (verifyToken?: string): SubmitOrderPayload => {
    const fullAddress = selectedAddress
      ? [
          selectedAddress.detail,
          selectedAddress.ward.name,
          selectedAddress.province.name,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    return {
      // user login
      userId: user?.id ?? undefined,

      customer: {
        // receiver info
        full_name: form.full_name,

        phone: normalizePhone(form.phone),

        email: form.email || undefined,

        gender: selectedAddress?.receiver_gender ?? form.gender,

        // address
        address: fullAddress,

        detailAddress: selectedAddress?.detail,

        province: selectedAddress?.province.name,
        provinceCode: selectedAddress?.province.code,

        ward: selectedAddress?.ward.name,
        wardCode: selectedAddress?.ward.code,
        region: region,
      },

      items: items.map((i) => ({
        productId: i.product.id,

        variantId: i.variant?.id ?? null,

        productName: i.product.name ?? i.product.nameKr,

        variantName: i.variant?.name ?? i.variant?.nameKr,

        sku: i.variant?.sku ?? null,

        image: i.variant?.media.image ?? i.product.media.image,

        originalPrice: Number(
          i.variant?.pricing.originalPrice ??
            i.product.pricing.originalPrice ??
            0,
        ),

        price: Number(i.variant?.pricing.price ?? i.product.pricing.price ?? 0),

        quantity: i.quantity,

        weightGrams:
          i.variant?.shipping?.weightGrams ??
          i.product.shipping?.weightGrams ??
          0,
        chargeableWeightGrams:
          i.variant?.shipping?.chargeableWeightGrams ??
          i.product.shipping?.chargeableWeightGrams ??
          0,
        isBulky:
          i.variant?.shipping?.isBulky ?? i.product.shipping?.isBulky ?? false,
      })),

      shipping,
      shippingFee,
      shippingRegion: region,

      paymentMethod,

      couponId: couponApplied?.id ?? null,

      couponCode: couponApplied?.code ?? null,
      couponDiscount,

      serviceFee,
      totalFinal,
      grandTotal,

      note: form.note,

      verifyToken: verifyToken ?? null,
    };
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      document
        .querySelector("[data-error='true']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const payload = buildPayload();
    setPendingOrderPayload(payload);

    const requireOtp = await checkOtp({
      phone: normalizePhone(form.phone),
      paymentMethod,
      grandTotal,
    });

    if (requireOtp) {
      setShowOtpModal(true);
      return;
    }

    await submitOrder(payload);
  };
  const localFee = shippingResult?.localFee ?? 0;
  const localBaseFee = shippingResult?.localBaseFee ?? 0;
  const internationalFee = shippingResult?.internationalFee ?? 0;
  // ── Empty cart ────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="untree_co-section" style={{ paddingTop: 120 }}>
        <div className="container text-center py-5">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <p style={{ color: "#888", marginBottom: 16 }}>Giỏ hàng trống</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/products")}
            style={{ borderRadius: 8, padding: "10px 32px" }}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}>
      {/* ── Top header ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "14px 0",
          position: "sticky",
          top: 0,
          //   zIndex: 10,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => navigate("/cart")}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#555",
              padding: 4,
            }}
          >
            ← Quay lại giỏ hàng
          </button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            Xác nhận đặt hàng
          </span>
          <div style={{ width: 120 }} />
        </div>
      </div>

      <div className="container py-4">
        <div className="row g-4">
          {/* ════════════════════════════════════
              LEFT COLUMN
          ════════════════════════════════════ */}
          <div className="col-lg-7">
            {/* ── 1. Thông tin người nhận ── */}
            <ReceiverInfoSection
              form={form}
              errors={errors}
              selectedAddress={selectedAddress}
              onChange={handleChange}
              onOpenAddress={() => setShowAddressModal(true)}
            />

            {/* ── 2. Phương thức vận chuyển ── */}
            <ShippingMethodSection
              shipping={shipping}
              setShipping={setShipping}
              fastResult={fastShipping}
              fastLoading={fastShipping.loading}
              standardResult={standardShipping}
              standardLoading={standardShipping.loading}
              provinceCode={provinceCode}
              wardCode={wardCode}
              shippingDiscount={shippingDiscount}
              fmt={fmt}
            />

            {/* ── 3. Ghi chú ── */}
            <OrderNoteSection
              note={form.note}
              onChange={(v) => handleChange("note", v)}
            />
          </div>

          {/* ════════════════════════════════════
                    RIGHT COLUMN — Order Summary
              ════════════════════════════════════ */}
          <div className="col-lg-5">
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 24,
                border: "1px solid #eee",
                position: "sticky",
                top: 80,
              }}
            >
              {/* ── Mã khuyến mãi ── */}
              <CouponSection
                coupon={coupon}
                setCoupon={setCoupon}
                couponApplied={couponApplied}
                couponDiscount={couponDiscount}
                couponError={couponError}
                couponLoading={validatingCoupon}
                onApply={handleApplyCoupon}
                onRemove={handleRemoveCoupon}
                fmt={fmt}
              />

              {/* ── Phương thức thanh toán ── */}
              <h6 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>
                Phương thức thanh toán
              </h6>
              <div className="d-flex flex-column gap-2 mb-4">
                {PAYMENT_OPTIONS.map((opt) => (
                  <div key={opt.id}>
                    <RadioCard
                      selected={paymentMethod === opt.id}
                      onClick={() => setPaymentMethod(opt.id)}
                      icon={opt.icon}
                      name={opt.name}
                      desc={opt.desc}
                    />
                    {/* Note phí dịch vụ COD */}
                    {opt.id === "cod" && paymentMethod === "cod" && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#fff8e1",
                          border: "1px solid #f5c542",
                          fontSize: 12,
                          color: "#8a6d1d",
                        }}
                      >
                        ℹ️ COD tính thêm phí dịch vụ <strong>1%</strong> (tối
                        thiểu 5.000₫) — hiện tại:{" "}
                        <strong>
                          {Math.max(
                            5000,
                            Math.round(totalFinal * 0.01),
                          ).toLocaleString("vi-VN")}
                          ₫
                        </strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Divider ── */}
              <div style={{ borderTop: "1px solid #eee", marginBottom: 16 }} />

              {/* ── Chi tiết đơn hàng ── */}
              <h6 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>
                Chi tiết đơn hàng ({totalQuantity} sản phẩm)
              </h6>

              {/* Danh sách sản phẩm */}
              <OrderItemList
                items={items}
                fmt={fmt}
                normalizeImageUrl={normalizeImageUrl}
              />

              {/* Tổng tiền */}
              <OrderSummary
                totalQuantity={totalQuantity}
                totalOriginal={totalOriginal}
                totalProductDiscount={totalProductDiscount}
                couponApplied={couponApplied}
                shippingDiscount={shippingDiscount}
                couponDiscount={couponDiscount}
                shippingResult={shippingResult}
                shippingFee={shippingFee}
                localFee={localFee}
                localBaseFee={localBaseFee}
                internationalFee={internationalFee}
                serviceFee={serviceFee}
                grandTotal={grandTotal}
                fmt={fmt}
              />

              {/* Nút đặt hàng */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary w-100 mt-4"
                style={{
                  padding: "14px 0",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                {submitting ? (
                  <span>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Đang xử lý...
                  </span>
                ) : (
                  "Đặt hàng →"
                )}
              </button>

              <p
                style={{
                  fontSize: 12,
                  color: "#aaa",
                  textAlign: "center",
                  marginTop: 10,
                  marginBottom: 0,
                }}
              >
                Bằng cách đặt hàng, bạn đồng ý với{" "}
                <a href="#" style={{ color: "#007bff" }}>
                  Điều khoản sử dụng
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Address Modal ── */}
      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          initialData={
            selectedAddress
              ? {
                  province: selectedAddress.province,
                  ward: selectedAddress.ward,
                  detail: selectedAddress.detail,

                  receiver_gender: selectedAddress.receiver_gender,

                  receiver_name: selectedAddress.receiver_name,
                  receiver_phone: selectedAddress.receiver_phone,
                }
              : undefined
          }
          onConfirm={(result) => {
            setSelectedAddress(result);
            setShowAddressModal(false);
          }}
        />
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <OtpModal
          phone={form.phone}
          onClose={() => setShowOtpModal(false)}
          onVerified={async (verifyToken) => {
            setShowOtpModal(false);
            await submitOrder(buildPayload(verifyToken));
          }}
        />
      )}

      {/* QR Modal */}
      {showPayModal && pendingOrderPayload && (
        <PayQrModal
          orderPayload={pendingOrderPayload}
          onClose={() => setShowPayModal(false)}
          onSuccess={async () => {
            setShowPayModal(false);

            clearCart();
            navigate(`/order/${pendingOrderPayload.orderCode}`, {
              state: {
                fromCheckout: true,
              },
            });
            // navigate("/order-success", {
            //   state: {
            //     orderId: pendingOrderPayload.orderId,
            //   },
            // });
          }}
        />
      )}

      {/* ── Toast ── */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
