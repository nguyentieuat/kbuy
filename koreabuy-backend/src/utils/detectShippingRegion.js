// utils/detectShippingRegion.js

const { WAREHOUSE } = require("../config/warehouse");

const MIEN_BAC = new Set([1, 4, 8, 11, 12, 14, 15, 19, 20, 22, 24, 25, 31, 33, 37]);
const MIEN_TRUNG = new Set([38, 40, 42, 44, 46, 48, 51, 52, 56, 66, 68]);
const MIEN_NAM = new Set([75, 79, 80, 82, 86, 91, 92, 96]);

function getMien(provinceCode) {
  if (MIEN_BAC.has(provinceCode)) return "mien_bac";
  if (MIEN_TRUNG.has(provinceCode)) return "mien_trung";
  if (MIEN_NAM.has(provinceCode)) return "mien_nam";
  return "unknown";
}

function detectShippingRegion({ provinceCode, wardCode }) {
  const warehouseMien = getMien(WAREHOUSE.provinceCode);
  const receiverMien = getMien(provinceCode);

  // Cùng tỉnh
  if (provinceCode === WAREHOUSE.provinceCode) {
    // Cùng quận/phường
    if (wardCode && wardCode === WAREHOUSE.wardCode) {
      return "noi_vung";
    }
    return "noi_vung_tinh";
  }

  // Khác tỉnh
  if (warehouseMien === receiverMien) {
    return "lien_tinh";
  }

  // Khác miền
  return "lien_vung";
}

module.exports = { detectShippingRegion };