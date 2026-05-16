// components/admin/order-detail/Skeleton.ts

export default function Skeleton({ w = "100%", h = 16 }: { w?: string; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        background:
          "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}
