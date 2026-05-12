// utils/phone.util.js

function normalizePhone(phone) {
  if (!phone) return null;

  // chỉ giữ số
  let cleaned = String(phone).replace(/\D/g, "");

  // bỏ mã quốc gia nếu có
  if (cleaned.startsWith("84")) {
    cleaned = cleaned.slice(2);
  }

  // bỏ số 0 đầu
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

//   // validate cơ bản VN mobile: 9 số
//   if (!/^(3|5|7|8|9)\d{8}$/.test(cleaned)) {
//     return null;
//   }

  // format chuẩn lưu DB
  return `+84${cleaned}`;
}

module.exports = {
  normalizePhone,
};
