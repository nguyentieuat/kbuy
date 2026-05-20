// pages/admin/AdminOrderPage.tsx

import { useState } from "react";
import type { Order } from "./types/adminOrder";
import { fmt, fmtDate } from "../../utils/format";
import { useAdminOrders } from "./hooks/useAdminOrders";
import StatusBadge from "./order-detail/StatusBadge";
import Skeleton from "./order-detail/Skeleton";
import BulkIntShipmentModal from "./order-detail/BulkIntShipmentModal";
import OrderDetailDrawer from "./order-detail/OrderDetailDrawer";

export default function AdminOrderPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingFilter, setShippingFilter] = useState("");

  // Bulk select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { orders, pagination, loading, refetch } = useAdminOrders({
    page,
    status: statusFilter,
    search,
    payment: paymentFilter,
    shipping_method: shippingFilter,
  });

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setSearch(searchInput);
      setPage(1);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o.id)));
  };

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));

  const STATUS_FILTERS = [
    { value: "", label: "Tất cả" },
    { value: "pending", label: "Chờ xác nhận" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "processing", label: "Đang xử lý" },
    { value: "shipped", label: "Đang giao" },
    { value: "delivered", label: "Hoàn thành" },
    { value: "cancelled", label: "Đã huỷ" },
  ];

  const COLS = selectMode
  ? "40px 140px 1fr 160px 60px 90px 110px 110px 100px"
  : "140px 1fr 160px 60px 90px 110px 110px 100px";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .order-row:hover { background: #f8f9ff !important; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h5 style={{ fontWeight: 700, margin: 0, fontSize: 18 }}>
            Quản lý đơn hàng
          </h5>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#888" }}>
            {pagination.total} đơn hàng
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedIds(new Set());
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: selectMode ? "none" : "1px solid #dee2e6",
              background: selectMode ? "#1d4ed8" : "#fff",
              color: selectMode ? "#fff" : "#555",
              cursor: "pointer",
            }}
          >
            {selectMode ? "✕ Huỷ chọn" : "☐ Chọn nhiều đơn"}
          </button>

          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn btn-primary"
              style={{ borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              🌏 Tạo kiện quốc tế ({selectedIds.size} đơn)
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Filters */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 16,
            border: "1px solid #eee",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid #dee2e6",
              borderRadius: 8,
              padding: "6px 12px",
              flex: "1 1 200px",
            }}
          >
            <span style={{ color: "#aaa" }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm mã đơn, tên, SĐT..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
              style={{
                border: "none",
                outline: "none",
                fontSize: 13,
                width: "100%",
              }}
            />
          </div>
          <select
            value={shippingFilter}
            onChange={(e) => {
              setShippingFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: "1px solid #dee2e6",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              outline: "none",
              background: "#fff",
            }}
          >
            <option value="">Giao hàng: Tất cả</option>
            <option value="fast">⚡ Nhanh</option>
            <option value="standard">📦 Tiêu chuẩn</option>
          </select>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: statusFilter === f.value ? "none" : "1px solid #eee",
                  background: statusFilter === f.value ? "#1d4ed8" : "#fff",
                  color: statusFilter === f.value ? "#fff" : "#555",
                  fontWeight: statusFilter === f.value ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            style={{
              border: "1px solid #dee2e6",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              outline: "none",
              background: "#fff",
            }}
          >
            <option value="">Thanh toán: Tất cả</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="refunded">Hoàn tiền</option>
          </select>
        </div>

        {/* Select all bar */}
        {selectMode && orders.length > 0 && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.size === orders.length && orders.length > 0}
              onChange={toggleSelectAll}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ color: "#1e40af", fontWeight: 600 }}>
              {selectedIds.size === 0
                ? "Chọn tất cả đơn trên trang này"
                : `Đã chọn ${selectedIds.size} đơn`}
            </span>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{
                  border: "none",
                  background: "none",
                  color: "#888",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #eee",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COLS,
              padding: "10px 16px",
              background: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
              fontSize: 11,
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              gap: 8,
            }}
          >
            {selectMode && <div />}
            <div>Mã đơn</div>
            <div>Khách hàng</div>
            <div>Ngày tạo</div>
            <div style={{ textAlign: "center" }}>SP</div>
            <div>Giao hàng</div>
            <div>Trạng thái</div>
            <div>Thanh toán</div>
            <div style={{ textAlign: "right" }}>Thành tiền</div>
          </div>

          {loading ? (
            <div
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 160px 60px 90px 110px 110px 100px",
                    gap: 8,
                  }}
                >
                  {[1, 1, 1, 0.6, 0.9, 0.7, 0.8].map((w, j) => (
                    <Skeleton key={j} w={`${w * 100}%`} h={14} />
                  ))}
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "48px 0", color: "#aaa" }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 14 }}>Không có đơn hàng nào</p>
            </div>
          ) : (
            orders.map((order, idx) => {
              const isSelected = selectedIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className="order-row"
                  onClick={() => {
                    if (selectMode) toggleSelect(order.id);
                    else setSelectedOrder(order);
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COLS,
                    padding: "12px 16px",
                    borderBottom:
                      idx < orders.length - 1 ? "1px solid #f5f5f5" : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                    alignItems: "center",
                    gap: 8,
                    background: isSelected ? "#eff6ff" : undefined,
                  }}
                >
                  {selectMode && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </div>
                  )}
                  <div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#1d4ed8",
                      }}
                    >
                      #{order.order_code}
                    </span>
                  </div>
                  <div>
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
                      {order.receiver_name}
                    </p>
                    <p
                      style={{ fontSize: 11, color: "#888", margin: "2px 0 0" }}
                    >
                      +84 {order.receiver_phone}
                    </p>
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {fmtDate(order.created_at)}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#666", textAlign: "center" }}
                  >
                    {(order as any).item_count ?? "—"}
                  </div>
                  <div>
                    {order.shipping_method === "fast" ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "#fef3c7",
                          color: "#92400e",
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⚡ Nhanh
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: "#f0f0f0",
                          color: "#666",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
                        📦 Tiêu chuẩn
                      </span>
                    )}
                  </div>
                  <div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div>
                    <StatusBadge status={order.payment_status} type="payment" />
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#e53935",
                    }}
                  >
                    {fmt(order.final_price)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
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
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              ← Trước
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 7) }).map(
              (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      fontSize: 13,
                      border: page === p ? "none" : "1px solid #dee2e6",
                      background: page === p ? "#1d4ed8" : "#fff",
                      color: page === p ? "#fff" : "#333",
                      cursor: "pointer",
                      fontWeight: page === p ? 700 : 400,
                    }}
                  >
                    {p}
                  </button>
                );
              },
            )}
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
                cursor:
                  page >= pagination.totalPages ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: page >= pagination.totalPages ? 0.5 : 1,
              }}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {/* Bulk International Shipment Modal */}
      {showBulkModal && (
        <BulkIntShipmentModal
          selectedOrders={selectedOrders}
          onClose={() => setShowBulkModal(false)}
          onDone={() => {
            setShowBulkModal(false);
            setSelectMode(false);
            setSelectedIds(new Set());
            refetch();
          }}
        />
      )}

      {/* Detail Drawer */}
      {selectedOrder && !selectMode && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  );
}
