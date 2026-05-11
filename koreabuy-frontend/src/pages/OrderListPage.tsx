// pages/OrderListPage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Order = {
  id: number;
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string;
  final_price: number;
  created_at: string;
  items: {
    product_name: string;
    image: string | null;
    quantity: number;
  }[];
};

const fmt = (n: number) => n.toLocaleString("vi-VN") + "₫";

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};

// Trạng thái đơn hàng
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Chờ xác nhận", color: "#e59335", bg: "#fff8e1" },
  confirmed:  { label: "Đã xác nhận",  color: "#007bff", bg: "#e8f4ff" },
  processing: { label: "Đang xử lý",   color: "#7b3fe4", bg: "#f3eeff" },
  shipped:    { label: "Đang giao",    color: "#ff6b00", bg: "#fff3e8" },
  delivered:  { label: "Đã giao",      color: "#27ae60", bg: "#f0fff4" },
  cancelled:  { label: "Đã huỷ",       color: "#e53935", bg: "#fff0f0" },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid:   { label: "Chưa thanh toán", color: "#e53935" },
  paid:     { label: "Đã thanh toán",   color: "#27ae60" },
  refunded: { label: "Đã hoàn tiền",    color: "#888" },
};

// Các bước tracking
const TRACKING_STEPS = [
  { key: "pending",    icon: "📋", label: "Chờ xác nhận" },
  { key: "confirmed",  icon: "✅", label: "Xác nhận" },
  { key: "processing", icon: "📦", label: "Đóng gói" },
  { key: "shipped",    icon: "🚚", label: "Đang giao" },
  { key: "delivered",  icon: "🏠", label: "Đã giao" },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4,
};

function TrackingBar({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div style={{
        padding: "8px 12px", borderRadius: 6,
        background: "#fff0f0", fontSize: 12,
        color: "#e53935", textAlign: "center",
      }}>
        ❌ Đơn hàng đã bị huỷ
      </div>
    );
  }

  const currentIdx = STATUS_INDEX[status] ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12 }}>
      {TRACKING_STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            {/* Step node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: "50%",
                background: isDone || isCurrent ? "#007bff" : "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
                border: isCurrent ? "2px solid #007bff" : "none",
                boxShadow: isCurrent ? "0 0 0 3px #e8f0fe" : "none",
                transition: "all 0.3s",
              }}>
                {isDone ? (
                  <span style={{ color: "#fff", fontSize: 12 }}>✓</span>
                ) : (
                  <span style={{ fontSize: 14 }}>{step.icon}</span>
                )}
              </div>
              <span style={{
                fontSize: 10,
                marginTop: 4,
                color: isDone || isCurrent ? "#007bff" : "#aaa",
                fontWeight: isCurrent ? 700 : 400,
                whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < TRACKING_STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: idx < currentIdx ? "#007bff" : "#eee",
                marginBottom: 20,
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const paymentCfg = PAYMENT_STATUS_CONFIG[order.payment_status] ?? PAYMENT_STATUS_CONFIG.unpaid;
  const firstItem = order.items[0];
  const moreCount = order.items.length - 1;

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        border: "1px solid #eee",
        cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 12,
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>
            #{order.order_code}
          </span>
          <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0 0" }}>
            {new Date(order.created_at).toLocaleDateString("vi-VN", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            fontWeight: 600, background: statusCfg.bg, color: statusCfg.color,
          }}>
            {statusCfg.label}
          </span>
          <span style={{ fontSize: 11, color: paymentCfg.color, fontWeight: 500 }}>
            {paymentCfg.label}
          </span>
        </div>
      </div>

      {/* Sản phẩm đại diện */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          overflow: "hidden", background: "#f8f8f8", flexShrink: 0,
        }}>
          {firstItem?.image ? (
            <img
              src={normalizeImageUrl(firstItem.image)}
              alt={firstItem.product_name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18,
            }}>📦</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {firstItem?.product_name}
          </p>
          {moreCount > 0 && (
            <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
              +{moreCount} sản phẩm khác
            </p>
          )}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e53935", flexShrink: 0 }}>
          {fmt(order.final_price)}
        </span>
      </div>

      {/* Tracking bar */}
      <TrackingBar status={order.status} />
    </div>
  );
}

// Filter tabs
const FILTER_TABS = [
  { key: "all",       label: "Tất cả" },
  { key: "pending",   label: "Chờ xác nhận" },
  { key: "shipped",   label: "Đang giao" },
  { key: "delivered", label: "Đã giao" },
  { key: "cancelled", label: "Đã huỷ" },
];

export default function OrderListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetch("/api/orders/my")
      .then((r) => r.json())
      .then((data) => setOrders(data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === "all"
    ? orders
    : orders.filter((o) => o.status === activeTab);

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: "#f8f9fa" }}>
      <div className="container py-4" style={{ maxWidth: 720 }}>

        <h5 style={{ fontWeight: 700, marginBottom: 20 }}>Đơn hàng của tôi</h5>

        {/* Filter tabs */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 16,
          overflowX: "auto", paddingBottom: 4,
        }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: activeTab === tab.key ? "none" : "1px solid #eee",
                background: activeTab === tab.key ? "#007bff" : "#fff",
                color: activeTab === tab.key ? "#fff" : "#555",
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
              {tab.key !== "all" && (
                <span style={{
                  marginLeft: 4,
                  background: activeTab === tab.key ? "rgba(255,255,255,0.3)" : "#f0f0f0",
                  borderRadius: 10,
                  padding: "1px 6px",
                  fontSize: 11,
                }}>
                  {orders.filter((o) =>
                    tab.key === "all" ? true : o.status === tab.key
                  ).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 0",
            background: "#fff", borderRadius: 12, border: "1px solid #eee",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ color: "#888", fontSize: 14 }}>
              {activeTab === "all"
                ? "Bạn chưa có đơn hàng nào"
                : "Không có đơn hàng nào ở trạng thái này"}
            </p>
            <button
              onClick={() => navigate("/products")}
              className="btn btn-primary mt-2"
              style={{ borderRadius: 8 }}
            >
              Mua sắm ngay
            </button>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/order/${order.order_code}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
