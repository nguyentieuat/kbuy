// components/checkout/OrderItemList.tsx

type Props = {
  items: any[];
  fmt: (n: number) => string;
  normalizeImageUrl: (url?: string | null) => string;
};

export default function OrderItemList({
  items,
  fmt,
  normalizeImageUrl,
}: Props) {
  return (
    <div
      style={{
        maxHeight: 260,
        overflowY: "auto",
        marginBottom: 16,
        paddingRight: 4,
      }}
    >
      {items.map((item) => {
        const imageUrl = normalizeImageUrl(
          item.variant?.media?.image ?? item.product?.media?.image,
        );

        const price = Number(
          item.variant?.pricing?.price ?? item.product?.pricing?.price ?? 0,
        );

        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              marginTop: 10,
            }}
          >
            {/* Image + quantity */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#f8f8f8",
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    📦
                  </div>
                )}
              </div>

              {/* quantity badge */}
              <div
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "#555",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {item.quantity}
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: 1.4,
                }}
              >
                {item.product.name}
              </p>

              {item.variant && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#888",
                    margin: "2px 0 0",
                  }}
                >
                  {item.variant.name ?? item.variant.nameKr ?? item.variant.sku}
                </p>
              )}

              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#e53935",
                  margin: "3px 0 0",
                }}
              >
                {price > 0 ? fmt(price * item.quantity) : "Liên hệ"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
