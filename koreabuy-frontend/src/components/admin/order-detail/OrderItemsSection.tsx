// components/admin/order-detail/OrderItemsSection.tsx

import type { OrderItem } from "../types/adminOrder";

import Section from "./Section";

import { normalizeImageUrl } from "../../../utils/image";
import { fmt } from "../../../utils/format";

type Props = {
  items?: OrderItem[];
};

export default function OrderItemsSection({ items = [] }: Props) {
  return (
    <Section title={`🛍️ Sản phẩm (${items.length})`}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: 8,
              background: "#f8f9fa",
              border: "1px solid #f0f0f0",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                overflow: "hidden",
                background: "#eee",
                flexShrink: 0,
              }}
            >
              {item.image ? (
                <img
                  src={normalizeImageUrl(item.image)}
                  alt={item.product_name}
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
                    fontSize: 18,
                  }}
                >
                  📦
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <a
                  href={`${item.product_link}`}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  {" "}
                  {item.product_name}
                </a>
              </p>

              {(item.variant_name ?? item.variant_name_kr) && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#888",
                    margin: "2px 0 0",
                  }}
                >
                  {item.variant_name ?? item.variant_name_kr}

                  {item.sku && (
                    <span style={{ color: "#bbb" }}> · {item.sku}</span>
                  )}
                </p>
              )}
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "#888",
                  margin: 0,
                }}
              >
                x{item.quantity}
              </p>

              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#e53935",
                  margin: "2px 0 0",
                }}
              >
                {fmt(item.total_price)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
