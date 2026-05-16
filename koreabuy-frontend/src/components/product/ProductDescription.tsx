// components/product/ProductDescription.tsx

import { useRef } from "react";

export default function ProductDescription({
  description,
  showFullDescription,
  setShowFullDescription,
}: any) {
  const descRef = useRef<HTMLDivElement | null>(null);
  if (!description) return null;

  return (
    <div
      ref={descRef}
      style={{ marginTop: 60, borderTop: "1px solid #eee", paddingTop: 40 }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>Thông tin sản phẩm</h2>

      <div
        style={{
          maxHeight: showFullDescription ? "none" : 320,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{ color: "#555", lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: description }}
        />
      </div>

      {!showFullDescription && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            height: 100,
            width: "100%",
            background: "linear-gradient(to bottom, transparent, #fff)",
            pointerEvents: "none", 
          }}
        />
      )}

      <button
        onClick={() => {
          setShowFullDescription((v: boolean) => {
            const next = !v;

            if (!next && descRef.current) {
              descRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }

            return next;
          });
        }}
        style={{
          marginTop: 20,
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          padding: "10px 20px",
          borderRadius: 999,
          border: "1px solid #ddd",
          background: "#fff",
        }}
      >
        {showFullDescription ? "Thu gọn" : "Xem thêm"}
      </button>
    </div>
  );
}
