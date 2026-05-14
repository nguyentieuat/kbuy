// components/admin/AdminOrderPage.tsx

// pages/admin/AdminOrderPage.tsx
import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled";

type PaymentStatus = "unpaid" | "paid" | "refunded";

type OrderLog = {
  id: number;
  status: string;
  note: string | null;
  location: string | null;
  handler_name: string | null;
  created_at: string;
};

type OrderItem = {
  id: number;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  image: string | null;
  price: number;
  quantity: number;
  total_price: number;
};

type Order = {
  id: number;
  order_code: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_email: string | null;
  receiver_address: string;
  receiver_province: string | null;
  receiver_ward: string | null;
  shipping_method: string | null;
  shipping_region: string | null;
  total_price: number;
  service_fee: number;
  shipping_fee: number;
  discount_amount: number;
  final_price: number;
  coupon_code: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  logs?: OrderLog[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: "Chờ xác nhận", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  confirmed:  { label: "Đã xác nhận",  color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  processing: { label: "Đang xử lý",   color: "#6b21a8", bg: "#f3e8ff", dot: "#9333ea" },
  shipped:    { label: "Đang giao",    color: "#9a3412", bg: "#ffedd5", dot: "#f97316" },
  delivered:  { label: "Hoàn thành",   color: "#166534", bg: "#dcfce7", dot: "#22c55e" },
  cancelled:  { label: "Đã huỷ",       color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:   { label: "Chưa TT",     color: "#991b1b", bg: "#fee2e2" },
  paid:     { label: "Đã TT",       color: "#166534", bg: "#dcfce7" },
  refunded: { label: "Hoàn tiền",   color: "#1e40af", bg: "#dbeafe" },
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"
];

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped:    ["delivered"],
  delivered:  [],
  cancelled:  [],
};

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return url.startsWith("/") ? url : `/${url}`;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAdminOrders(filters: {
  page: number; status: string; search: string; payment: string;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:    String(filters.page),
        limit:   "20",
        ...(filters.status  && { status:  filters.status }),
        ...(filters.search  && { search:  filters.search }),
        ...(filters.payment && { payment: filters.payment }),
      });
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.status, filters.search, filters.payment]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { orders, pagination, loading, refetch: fetch_ };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, type = "order" }: {
  status: string; type?: "order" | "payment";
}) {
  const cfg = type === "order"
    ? (STATUS_CONFIG[status] ?? { label: status, color: "#555", bg: "#f0f0f0", dot: "#888" })
    : (PAYMENT_STATUS_CONFIG[status] ?? { label: status, color: "#555", bg: "#f0f0f0" });

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11,
      fontWeight: 600, background: cfg.bg, color: cfg.color,
      whiteSpace: "nowrap",
    }}>
      {"dot" in cfg && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: (cfg as any).dot, flexShrink: 0,
        }} />
      )}
      {cfg.label}
    </span>
  );
}

function Skeleton({ w = "100%", h = 16 }: { w?: string; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function OrderDetailDrawer({
  order, onClose, onUpdated,
}: {
  order: Order; onClose: () => void; onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Status update
  const [statusLoading, setStatusLoading] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusNote, setStatusNote] = useState("");
  const [statusLocation, setStatusLocation] = useState("");

  // Shipment
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("");
  const [shipNote, setShipNote] = useState("");
  const [shipLoading, setShipLoading] = useState(false);

  // Payment
  const [payLoading, setPayLoading] = useState(false);

  const token = localStorage.getItem("token");
  const authH = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/orders/${order.id}`, { headers: authH });
        const data = await res.json();
        setDetail(data.data);
      } catch {}
      setLoading(false);
    })();
  }, [order.id]);

  const handleUpdateStatus = async () => {
    setStatusLoading(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PUT",
        headers: authH,
        body: JSON.stringify({
          status:   newStatus,
          note:     statusNote || null,
          location: statusLocation || null,
        }),
      });
      setShowStatusForm(false);
      setStatusNote("");
      setStatusLocation("");
      onUpdated();
      // refetch detail
      const res = await fetch(`/api/admin/orders/${order.id}`, { headers: authH });
      const data = await res.json();
      setDetail(data.data);
    } catch {}
    setStatusLoading(false);
  };

  const handleMarkPaid = async () => {
    setPayLoading(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/payment`, {
        method: "PUT",
        headers: authH,
        body: JSON.stringify({ payment_status: "paid" }),
      });
      onUpdated();
      const res = await fetch(`/api/admin/orders/${order.id}`, { headers: authH });
      const data = await res.json();
      setDetail(data.data);
    } catch {}
    setPayLoading(false);
  };

  const handleCreateShipment = async () => {
    if (!trackingCode.trim()) return;
    setShipLoading(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "POST",
        headers: authH,
        body: JSON.stringify({
          tracking_code: trackingCode,
          carrier:       carrier || null,
          note:          shipNote || null,
        }),
      });
      setShowShipForm(false);
      setTrackingCode("");
      setCarrier("");
      setShipNote("");
      const res = await fetch(`/api/admin/orders/${order.id}`, { headers: authH });
      const data = await res.json();
      setDetail(data.data);
    } catch {}
    setShipLoading(false);
  };

  const d = detail ?? order;
  const nextStatuses = STATUS_FLOW[d.status] ?? [];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.4)", zIndex: 200,
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0,
        width: "min(680px, 100vw)", background: "#fff",
        zIndex: 201, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        overflowY: "auto",
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #f0f0f0",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", position: "sticky", top: 0,
          background: "#fff", zIndex: 10,
        }}>
          <div>
            <h6 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>
              #{d.order_code}
            </h6>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
              {fmtDate(d.created_at)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge status={d.status} />
            <StatusBadge status={d.payment_status} type="payment" />
            <button onClick={onClose} style={{
              border: "none", background: "none",
              fontSize: 20, cursor: "pointer", color: "#888",
              marginLeft: 8,
            }}>✕</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {[200, 100, 150, 80].map((w, i) => <Skeleton key={i} w={`${w}px`} h={16} />)}
          </div>
        ) : (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Cập nhật trạng thái ── */}
            <Section title="🔄 Cập nhật trạng thái">
              {nextStatuses.length > 0 ? (
                <>
                  {!showStatusForm ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {nextStatuses.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            onClick={() => { setNewStatus(s); setShowStatusForm(true); }}
                            style={{
                              padding: "8px 16px", borderRadius: 8,
                              border: `2px solid ${cfg.dot}`,
                              background: cfg.bg, color: cfg.color,
                              fontWeight: 600, fontSize: 13, cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            → {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      background: "#f8f9fa", borderRadius: 10,
                      padding: 16, border: "1px solid #eee",
                    }}>
                      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                        Chuyển sang: <StatusBadge status={newStatus} />
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Ghi chú (VD: Đơn đã được đóng gói xong)"
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          style={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Vị trí (VD: Kho HCM, Bưu cục Quận 1)"
                          value={statusLocation}
                          onChange={(e) => setStatusLocation(e.target.value)}
                          style={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={handleUpdateStatus}
                            disabled={statusLoading}
                            className="btn btn-primary btn-sm"
                            style={{ borderRadius: 8, fontWeight: 600 }}
                          >
                            {statusLoading ? "Đang lưu..." : "Xác nhận cập nhật"}
                          </button>
                          <button
                            onClick={() => setShowStatusForm(false)}
                            className="btn btn-outline-secondary btn-sm"
                            style={{ borderRadius: 8 }}
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
                  {d.status === "delivered" ? "✅ Đơn đã hoàn thành" : "❌ Đơn đã huỷ"}
                </p>
              )}
            </Section>

            {/* ── Thanh toán ── */}
            <Section title="💳 Thanh toán">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13 }}>
                  <p style={{ margin: 0, color: "#555" }}>
                    Phương thức:{" "}
                    <strong>
                      {d.payment_method === "cod" ? "💵 COD"
                        : d.payment_method === "vietqr" ? "🏦 VietQR"
                        : d.payment_method ?? "—"}
                    </strong>
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#555" }}>
                    Trạng thái: <StatusBadge status={d.payment_status} type="payment" />
                  </p>
                </div>
                {d.payment_status === "unpaid" && (
                  <button
                    onClick={handleMarkPaid}
                    disabled={payLoading}
                    className="btn btn-success btn-sm"
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    {payLoading ? "..." : "✓ Đánh dấu đã TT"}
                  </button>
                )}
              </div>
            </Section>

            {/* ── Vận chuyển quốc tế ── */}
            <Section title="🌏 Vận chuyển quốc tế">
              {(d as any).shipment ? (
                <div style={{ fontSize: 13 }}>
                  <InfoRow label="Mã tracking" value={(d as any).shipment.tracking_code} mono />
                  <InfoRow label="Đơn vị" value={(d as any).shipment.carrier ?? "—"} />
                  <InfoRow label="Trạng thái" value={(d as any).shipment.status} />
                  {(d as any).shipment.note && (
                    <InfoRow label="Ghi chú" value={(d as any).shipment.note} />
                  )}
                </div>
              ) : (
                <>
                  {!showShipForm ? (
                    <button
                      onClick={() => setShowShipForm(true)}
                      className="btn btn-outline-primary btn-sm"
                      style={{ borderRadius: 8 }}
                    >
                      + Thêm tracking quốc tế
                    </button>
                  ) : (
                    <div style={{
                      background: "#f8f9fa", borderRadius: 10,
                      padding: 16, border: "1px solid #eee",
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Mã tracking quốc tế *"
                          value={trackingCode}
                          onChange={(e) => setTrackingCode(e.target.value)}
                          style={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Đơn vị vận chuyển (VD: Korea Post, CJ)"
                          value={carrier}
                          onChange={(e) => setCarrier(e.target.value)}
                          style={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Ghi chú"
                          value={shipNote}
                          onChange={(e) => setShipNote(e.target.value)}
                          style={{ borderRadius: 8, fontSize: 13 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={handleCreateShipment}
                            disabled={shipLoading || !trackingCode.trim()}
                            className="btn btn-primary btn-sm"
                            style={{ borderRadius: 8 }}
                          >
                            {shipLoading ? "Đang lưu..." : "Lưu"}
                          </button>
                          <button
                            onClick={() => setShowShipForm(false)}
                            className="btn btn-outline-secondary btn-sm"
                            style={{ borderRadius: 8 }}
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>

            {/* ── Thông tin người nhận ── */}
            <Section title="📦 Thông tin người nhận">
              <InfoRow label="Tên" value={d.receiver_name} />
              <InfoRow label="SĐT" value={`+84 ${d.receiver_phone}`} />
              {d.receiver_email && <InfoRow label="Email" value={d.receiver_email} />}
              <InfoRow label="Địa chỉ" value={d.receiver_address} />
              {d.shipping_method && (
                <InfoRow
                  label="Vận chuyển"
                  value={d.shipping_method === "fast" ? "⚡ Nhanh" : "📦 Tiết kiệm"}
                />
              )}
              {d.note && <InfoRow label="Ghi chú KH" value={d.note} />}
            </Section>

            {/* ── Sản phẩm ── */}
            <Section title={`🛍️ Sản phẩm (${d.items?.length ?? 0})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(d.items ?? []).map((item) => (
                  <div key={item.id} style={{
                    display: "flex", gap: 10, alignItems: "center",
                    padding: "10px 12px", borderRadius: 8,
                    background: "#f8f9fa", border: "1px solid #f0f0f0",
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 6,
                      overflow: "hidden", background: "#eee", flexShrink: 0,
                    }}>
                      {item.image ? (
                        <img src={normalizeImageUrl(item.image)} alt={item.product_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
                          {item.variant_name}
                          {item.sku && <span style={{ color: "#bbb" }}> · {item.sku}</span>}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 12, color: "#888", margin: 0 }}>x{item.quantity}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#e53935", margin: "2px 0 0" }}>
                        {fmt(item.total_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Tổng tiền ── */}
            <Section title="💰 Tổng tiền">
              <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                <SumRow label="Tổng giá gốc" value={fmt(d.total_price)} />
                {d.discount_amount > 0 && <SumRow label="Giảm giá" value={`-${fmt(d.discount_amount)}`} green />}
                {d.coupon_code && <SumRow label={`Mã: ${d.coupon_code}`} value="" />}
                <SumRow label="Phí vận chuyển" value={fmt(d.shipping_fee)} />
                <SumRow label="Phí dịch vụ" value={fmt(d.service_fee)} />
                <div style={{ borderTop: "1px dashed #eee", paddingTop: 8, marginTop: 4 }}>
                  <SumRow label="Thành tiền" value={fmt(d.final_price)} bold red />
                </div>
              </div>
            </Section>

            {/* ── Lịch sử trạng thái ── */}
            {d.logs && d.logs.length > 0 && (
              <Section title="📋 Lịch sử trạng thái">
                <div style={{ position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 11, top: 16,
                    bottom: 16, width: 2, background: "#f0f0f0",
                  }} />
                  {[...d.logs].reverse().map((log, idx) => {
                    const cfg = STATUS_CONFIG[log.status] ?? { dot: "#888", label: log.status, color: "#555", bg: "#f0f0f0" };
                    return (
                      <div key={log.id} style={{
                        display: "flex", gap: 12, marginBottom: 16,
                        position: "relative", zIndex: 1,
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: idx === 0 ? cfg.bg : "#f5f5f5",
                          border: `2px solid ${idx === 0 ? cfg.dot : "#e0e0e0"}`,
                          display: "flex", alignItems: "center",
                          justifyContent: "center", flexShrink: 0, fontSize: 10,
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: idx === 0 ? cfg.dot : "#ccc",
                          }} />
                        </div>
                        <div style={{ flex: 1, paddingTop: 2 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: idx === 0 ? cfg.color : "#555" }}>
                              {cfg.label}
                            </span>
                            <span style={{ fontSize: 11, color: "#aaa" }}>
                              {fmtDate(log.created_at)}
                            </span>
                          </div>
                          {log.note && <p style={{ fontSize: 12, color: "#666", margin: "3px 0 0" }}>{log.note}</p>}
                          {log.location && (
                            <p style={{ fontSize: 11, color: "#999", margin: "2px 0 0" }}>📍 {log.location}</p>
                          )}
                          {log.handler_name && (
                            <p style={{ fontSize: 11, color: "#bbb", margin: "2px 0 0" }}>👤 {log.handler_name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

          </div>
        )}
      </div>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{
        padding: "10px 16px", background: "#fafafa",
        borderBottom: "1px solid #f0f0f0",
        fontSize: 13, fontWeight: 700, color: "#333",
      }}>
        {title}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "#888", minWidth: 90, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function SumRow({ label, value, bold, red, green }: {
  label: string; value: string;
  bold?: boolean; red?: boolean; green?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{
        fontWeight: bold ? 700 : 400,
        color: red ? "#e53935" : green ? "#27ae60" : "#333",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrderPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { orders, pagination, loading, refetch } = useAdminOrders({
    page, status: statusFilter, search, payment: paymentFilter,
  });

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setSearch(searchInput);
      setPage(1);
    }
  };

  const STATUS_FILTERS = [
    { value: "",           label: "Tất cả" },
    { value: "pending",    label: "Chờ xác nhận" },
    { value: "confirmed",  label: "Đã xác nhận" },
    { value: "processing", label: "Đang xử lý" },
    { value: "shipped",    label: "Đang giao" },
    { value: "delivered",  label: "Hoàn thành" },
    { value: "cancelled",  label: "Đã huỷ" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .order-row:hover { background: #f8f9ff !important; }
      `}</style>

      {/* Page header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h5 style={{ fontWeight: 700, margin: 0, fontSize: 18 }}>Quản lý đơn hàng</h5>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#888" }}>
            {pagination.total} đơn hàng
          </p>
        </div>
      </div>

      <div style={{ padding: 24 }}>

        {/* Filters */}
        <div style={{
          background: "#fff", borderRadius: 12,
          padding: "16px 20px", marginBottom: 16,
          border: "1px solid #eee",
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            border: "1px solid #dee2e6", borderRadius: 8,
            padding: "6px 12px", flex: "1 1 200px",
          }}>
            <span style={{ color: "#aaa", fontSize: 14 }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm mã đơn, tên, SĐT..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
              style={{ border: "none", outline: "none", fontSize: 13, width: "100%" }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12,
                  border: statusFilter === f.value ? "none" : "1px solid #eee",
                  background: statusFilter === f.value ? "#1d4ed8" : "#fff",
                  color: statusFilter === f.value ? "#fff" : "#555",
                  fontWeight: statusFilter === f.value ? 600 : 400,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            style={{
              border: "1px solid #dee2e6", borderRadius: 8,
              padding: "6px 12px", fontSize: 13, outline: "none",
              background: "#fff",
            }}
          >
            <option value="">Thanh toán: Tất cả</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="refunded">Hoàn tiền</option>
          </select>
        </div>

        {/* Table */}
        <div style={{
          background: "#fff", borderRadius: 12,
          border: "1px solid #eee", overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr 160px 100px 110px 110px 100px",
            padding: "10px 16px",
            background: "#fafafa", borderBottom: "1px solid #f0f0f0",
            fontSize: 11, fontWeight: 700, color: "#888",
            textTransform: "uppercase", letterSpacing: "0.5px",
            gap: 8,
          }}>
            <div>Mã đơn</div>
            <div>Khách hàng</div>
            <div>Ngày tạo</div>
            <div>Sản phẩm</div>
            <div>Trạng thái</div>
            <div>Thanh toán</div>
            <div style={{ textAlign: "right" }}>Thành tiền</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 160px 100px 110px 110px 100px", gap: 8 }}>
                  <Skeleton h={14} />
                  <Skeleton h={14} />
                  <Skeleton h={14} />
                  <Skeleton w="60px" h={14} />
                  <Skeleton w="90px" h={20} />
                  <Skeleton w="70px" h={20} />
                  <Skeleton w="80px" h={14} />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 14 }}>Không có đơn hàng nào</p>
            </div>
          ) : (
            orders.map((order, idx) => (
              <div
                key={order.id}
                className="order-row"
                onClick={() => setSelectedOrder(order)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 160px 100px 110px 110px 100px",
                  padding: "12px 16px",
                  borderBottom: idx < orders.length - 1 ? "1px solid #f5f5f5" : "none",
                  cursor: "pointer", transition: "background 0.1s",
                  alignItems: "center", gap: 8,
                }}
              >
                {/* Mã đơn */}
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#1d4ed8" }}>
                    #{order.order_code}
                  </span>
                </div>

                {/* Khách hàng */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {order.receiver_name}
                  </p>
                  <p style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}>
                    +84 {order.receiver_phone}
                  </p>
                </div>

                {/* Ngày tạo */}
                <div style={{ fontSize: 12, color: "#666" }}>
                  {fmtDate(order.created_at)}
                </div>

                {/* Số SP */}
                <div style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
                  {(order as any).item_count ?? "—"} SP
                </div>

                {/* Trạng thái */}
                <div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Thanh toán */}
                <div>
                  <StatusBadge status={order.payment_status} type="payment" />
                </div>

                {/* Thành tiền */}
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: "#e53935" }}>
                  {fmt(order.final_price)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: "flex", justifyContent: "center",
            gap: 6, marginTop: 16,
          }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #dee2e6",
                background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer",
                fontSize: 13, opacity: page <= 1 ? 0.5 : 1,
              }}
            >← Trước</button>

            {Array.from({ length: Math.min(pagination.totalPages, 7) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: 13,
                    border: page === p ? "none" : "1px solid #dee2e6",
                    background: page === p ? "#1d4ed8" : "#fff",
                    color: page === p ? "#fff" : "#333",
                    cursor: "pointer", fontWeight: page === p ? 700 : 400,
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #dee2e6",
                background: "#fff", cursor: page >= pagination.totalPages ? "not-allowed" : "pointer",
                fontSize: 13, opacity: page >= pagination.totalPages ? 0.5 : 1,
              }}
            >Sau →</button>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
