// components/profile/OrderSection.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../../hooks/useOrders";
import { STATUS_CONFIG, ORDER_TABS } from "./constants/orders";
import { normalizeImageUrl } from "../../utils/image";

export default function OrderSection({
  authHeaders,
}: {
  authHeaders: Record<string, string>;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const { orders, loading, pagination, statusCounts, page, setPage } =
  useOrders(authHeaders, activeTab);

  const tabsRef = useRef<HTMLDivElement>(null);

  // Đếm số lượng theo từng status để hiện badge
  const countByStatus = statusCounts;

  return (
    <div>
      {/* Segmented tabs — scroll ngang */}
      <div
        ref={tabsRef}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 14,
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE
          WebkitOverflowScrolling: "touch", // iOS momentum scroll
        }}
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {ORDER_TABS.map((tab) => {
          const count =
            tab.key === "all" ? pagination.total : (countByStatus[tab.key] ?? 0);
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flexShrink: 0,
                padding: "7px 14px",
                borderRadius: 20,
                border: isActive ? "none" : "1px solid #eee",
                background: isActive ? "#007bff" : "#fff",
                color: isActive ? "#fff" : "#555",
                fontWeight: isActive ? 700 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
                boxShadow: isActive
                  ? "0 3px 10px rgba(0,123,255,0.25)"
                  : "none",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  style={{
                    background: isActive ? "rgba(255,255,255,0.3)" : "#f0f0f0",
                    color: isActive ? "#fff" : "#888",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 600,
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Danh sách đơn hàng */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : orders.length === 0? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            border: "1px solid #eee",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>
            {activeTab === "all"
              ? "Bạn chưa có đơn hàng nào"
              : "Không có đơn hàng ở trạng thái này"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const firstItem = order.items[0];
            const moreCount = order.items.length - 1;

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/order/${order.orderCode}`)}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: "1px solid #eee",
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 4px 16px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                {/* Ảnh sản phẩm đại diện */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#f8f8f8",
                    flexShrink: 0,
                  }}
                >
                  {firstItem?.image ? (
                    <img
                      src={normalizeImageUrl(firstItem.image)}
                      alt={firstItem.product_name}
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
                        fontSize: 22,
                      }}
                    >
                      📦
                    </div>
                  )}
                </div>

                {/* Thông tin */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Mã đơn + trạng thái */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{ fontWeight: 700, fontSize: 13, color: "#333" }}
                    >
                      #{order.orderCode}
                    </span>
                    <span
                      style={{
                        padding: "2px 9px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: cfg.bg,
                        color: cfg.color,
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Tên sản phẩm */}
                  <p
                    style={{
                      fontSize: 12,
                      color: "#555",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {firstItem?.product_name}
                    {moreCount > 0 && (
                      <span style={{ color: "#aaa" }}>
                        {" "}
                        +{moreCount} sản phẩm
                      </span>
                    )}
                  </p>

                  {/* Ngày + giá */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 5,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#aaa" }}>
                      {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#e53935",
                      }}
                    >
                      {Number(order.finalPrice).toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ color: "#ccc", fontSize: 16, flexShrink: 0 }}>
                  ›
                </span>
              </div>
            );
          })}
        </div>
      )}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            marginTop: 16,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #dee2e6",
              background: "#fff",
              fontSize: 13,
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            ← Trước
          </button>

          {Array.from({ length: pagination.totalPages }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  fontSize: 13,
                  border: page === p ? "none" : "1px solid #dee2e6",
                  background: page === p ? "#007bff" : "#fff",
                  color: page === p ? "#fff" : "#333",
                  cursor: "pointer",
                  fontWeight: page === p ? 700 : 400,
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #dee2e6",
              background: "#fff",
              fontSize: 13,
              cursor: page >= pagination.totalPages ? "not-allowed" : "pointer",
              opacity: page >= pagination.totalPages ? 0.5 : 1,
            }}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
