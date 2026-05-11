// utils/image.ts

export function normalizeImageUrl(url?: string | null) {
  if (!url) return "";

  if (url.startsWith("http")) {
    return url;
  }

  return url.startsWith("/") ? url : `/${url}`;
}
