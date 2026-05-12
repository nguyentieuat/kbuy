// utils/phone.ts

export const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;

  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("84")) {
    return "+" + cleaned;
  }

  return "+84" + cleaned;
};
