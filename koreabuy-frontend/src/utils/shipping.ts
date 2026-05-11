// utils/shipping.ts

import type { CartItem } from "../types/cart";

export type ShippingMethod = "fast" | "standard";

// ── Dữ liệu thực từ provinces.open-api.vn/api/v2/p/ (34 tỉnh sau sáp nhập 2025) ──

// Miền Bắc (code: 1,4,8,11,12,14,15,19,20,22,24,25,31,33,37)
const MIEN_BAC = new Set([
  1, // Thành phố Hà Nội
  4, // Tỉnh Cao Bằng
  8, // Tỉnh Tuyên Quang
  11, // Tỉnh Điện Biên
  12, // Tỉnh Lai Châu
  14, // Tỉnh Sơn La
  15, // Tỉnh Lào Cai
  19, // Tỉnh Thái Nguyên
  20, // Tỉnh Lạng Sơn
  22, // Tỉnh Quảng Ninh
  24, // Tỉnh Bắc Ninh
  25, // Tỉnh Phú Thọ
  31, // Thành phố Hải Phòng
  33, // Tỉnh Hưng Yên
  37, // Tỉnh Ninh Bình
]);

// Miền Trung (code: 38,40,42,44,46,48,51,52,56,66,68)
const MIEN_TRUNG = new Set([
  38, // Tỉnh Thanh Hóa
  40, // Tỉnh Nghệ An
  42, // Tỉnh Hà Tĩnh
  44, // Tỉnh Quảng Trị
  46, // Thành phố Huế
  48, // Thành phố Đà Nẵng
  51, // Tỉnh Quảng Ngãi
  52, // Tỉnh Gia Lai
  56, // Tỉnh Khánh Hòa
  66, // Tỉnh Đắk Lắk
  68, // Tỉnh Lâm Đồng
]);

// Miền Nam (code: 75,79,80,82,86,91,92,96)
const MIEN_NAM = new Set([
  75, // Tỉnh Đồng Nai
  79, // Thành phố Hồ Chí Minh
  80, // Tỉnh Tây Ninh
  82, // Tỉnh Đồng Tháp
  86, // Tỉnh Vĩnh Long
  91, // Tỉnh An Giang
  92, // Thành phố Cần Thơ
  96, // Tỉnh Cà Mau
]);

export type Region = "mien_bac" | "mien_trung" | "mien_nam" | "unknown";

export function getRegion(provinceCode: number): Region {
  if (MIEN_BAC.has(provinceCode)) return "mien_bac";
  if (MIEN_TRUNG.has(provinceCode)) return "mien_trung";
  if (MIEN_NAM.has(provinceCode)) return "mien_nam";
  return "unknown";
}

export function calculateKoreaShipping(weightGrams: number) {
  if (weightGrams <= 0) return 0;

  if (weightGrams <= 500) return 95000;
  if (weightGrams <= 1000) return 140000;
  if (weightGrams <= 2000) return 220000;

  return 220000 + Math.ceil((weightGrams - 2000) / 500) * 45000;
}

const LOCAL_SHIPPING_FEE = {
  mien_bac: {
    fast: 25000,
    standard: 15000,
  },
  mien_trung: {
    fast: 30000,
    standard: 18000,
  },
  mien_nam: {
    fast: 35000,
    standard: 20000,
  },
  unknown: {
    fast: 35000,
    standard: 25000,
  },
} as const;

export function calculateLocalShipping(region: Region, method: ShippingMethod) {
  return LOCAL_SHIPPING_FEE[region][method];
}

export function calculateShippingTotal({
  items,
  method,
  region,
}: {
  items: CartItem[];
  method: ShippingMethod;
  region: Region;
}) {
  let totalWeight = 0;

  let hasBulky = false;

  for (const item of items) {
    const weight = item.product.shipping?.chargeableWeightGrams ?? 0;

    totalWeight += weight * item.quantity;

    if (item.product.shipping?.isBulky) {
      hasBulky = true;
    }
  }

  // FAST → round kg
  if (method === "fast") {
    totalWeight = Math.ceil(totalWeight / 1000) * 1000;
  }

  // KR → VN
  const internationalFee = calculateKoreaShipping(totalWeight);

  // VN local
  const localFee = calculateLocalShipping(region, method);

  // bulky surcharge
  const internationalBulkyFee = hasBulky ? 30000 : 0;
  const localBulkyFee = hasBulky ? 15000 : 0;

  const bulkyFee =
    internationalBulkyFee + localBulkyFee;

  return {
    weightGrams: totalWeight,

    internationalFee,
    localFee,

    internationalBulkyFee,
    localBulkyFee,

    bulkyFee,

    total:
      internationalFee +
      localFee +
      bulkyFee,

    hasBulky,
  };
}