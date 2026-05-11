// components/product/ProductDetailSkeleton.tsx

export default function ProductDetailSkeleton() {
  const Bone = ({ w, h, r = 8 }: { w: string; h: number; r?: number }) => (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,

        // nền shimmer
        background:
          "linear-gradient(90deg, #f0f0f0 25%, #eaeaea 37%, #f0f0f0 63%)",
        backgroundSize: "400% 100%",

        // animation
        animation: "shimmer 1.2s ease infinite",
      }}
    />
  );

  return (
    <div className="untree_co-section" style={{ paddingTop: "120px" }}>
      <div className="container">
        <div className="row g-5">
          <div className="col-lg-6">
            <Bone w="100%" h={480} r={12} />
            <div className="d-flex gap-2 mt-3">
              {[1, 2, 3, 4].map((i) => (
                <Bone key={i} w="72px" h={72} />
              ))}
            </div>
          </div>

          <div className="col-lg-6 d-flex flex-column gap-3">
            <Bone w="85%" h={30} />
            <Bone w="40%" h={18} />
            <Bone w="35%" h={40} />
            <Bone w="55%" h={18} />
            <Bone w="100%" h={50} />
            <Bone w="100%" h={50} />
          </div>
        </div>
      </div>
    </div>
  );
}
