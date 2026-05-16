// components/admin/order-detail/OrderDetailDrawer.tsx

import { useState, useEffect } from "react";

import type { Order } from "../types/adminOrder";

import { fmtDate } from "../../../utils/format";

import StatusBadge from "./StatusBadge";
import Skeleton from "./Skeleton";
import { AdminOrderAPI } from "../../../api/adminOrder.api";
import OrderStatusSection from "./OrderStatusSection";
import PaymentSection from "./OrderPaymentSection";
import OrderShipmentSection from "./OrderShipmentSection";
import OrderDomShipmentSection from "./OrderDomShipmentSection";
import OrderReceiverSection from "./OrderReceiverSection";
import OrderItemsSection from "./OrderItemsSection";
import OrderSummarySection from "./OrderSummarySection";
import OrderLogsSection from "./OrderLogsSection";

export default function OrderDetailDrawer({
  order,
  onClose,
  onUpdated,
}: {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Status
  const [statusLoading, setStatusLoading] = useState(false);

  // Payment
  const [payLoading, setPayLoading] = useState(false);

  // International shipment
  const [showIntForm, setShowIntForm] = useState(false);
  const [intTracking, setIntTracking] = useState("");
  const [intCarrier, setIntCarrier] = useState("");
  const [intFrom, setIntFrom] = useState("");
  const [intTo, setIntTo] = useState("");
  const [intNote, setIntNote] = useState("");
  const [intLoading, setIntLoading] = useState(false);

  // Domestic shipment
  const [showDomForm, setShowDomForm] = useState(false);
  const [domTracking, setDomTracking] = useState("");
  const [domCarrier, setDomCarrier] = useState("");
  const [domUrl, setDomUrl] = useState("");
  const [domFee, setDomFee] = useState("");
  const [domNote, setDomNote] = useState("");
  const [domLoading, setDomLoading] = useState(false);

  const [intStatusLoading, setIntStatusLoading] = useState(false);

  const refetchDetail = async () => {
    setLoading(true);

    try {
      const data = await AdminOrderAPI.getOrderDetail(order.id);

      setDetail(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await refetchDetail();
    })();
  }, [order.id]);

  const handleUpdateIntStatus = async (newStatus: string) => {
    setIntStatusLoading(true);
    try {
      await AdminOrderAPI.updateInternationalShipmentStatus(d.intShipment!.id, {
        status: newStatus,
      });
      await refetchDetail();
    } catch {}
    setIntStatusLoading(false);
  };

  const handleMarkPaid = async () => {
    setPayLoading(true);
    try {
      await AdminOrderAPI.updatePayment(order.id, {
        payment_status: "paid",
      });
      onUpdated();
      await refetchDetail();
    } catch {}
    setPayLoading(false);
  };

  const handleCreateIntShipment = async () => {
    if (!intTracking.trim()) return;
    setIntLoading(true);
    try {
      await AdminOrderAPI.createShipment(order.id, {
        tracking_code: intTracking,
        carrier: intCarrier || undefined,
        from_warehouse: intFrom || undefined,
        to_warehouse: intTo || undefined,
        note: intNote || undefined,
      });
      setShowIntForm(false);
      setIntTracking("");
      setIntCarrier("");
      setIntNote("");
      await refetchDetail();
    } catch {}
    setIntLoading(false);
  };

  const handleCreateDomShipment = async () => {
    if (!domTracking.trim()) return;
    setDomLoading(true);
    try {
      await AdminOrderAPI.createDomesticShipment(order.id, {
        tracking_code: domTracking,
        carrier: domCarrier || undefined,
        tracking_url: domUrl || undefined,
        shipping_fee: domFee ? Number(domFee) : 0,
        note: domNote || undefined,
      });
      setShowDomForm(false);
      setDomTracking("");
      setDomCarrier("");
      setDomUrl("");
      setDomFee("");
      setDomNote("");
      await refetchDetail();
    } catch {}
    setDomLoading(false);
  };

  const d = detail ?? order;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(700px,100vw)",
          background: "#fff",
          zIndex: 201,
          overflowY: "auto",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
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
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "#888",
                marginLeft: 8,
              }}
            >
              ✕
            </button>
          </div>
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
            {[200, 100, 150, 80].map((w, i) => (
              <Skeleton key={i} w={`${w}px`} h={16} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Trạng thái */}
            <OrderStatusSection
              status={d.status}
              loading={statusLoading}
              onSubmit={async ({ status, note, location }) => {
                setStatusLoading(true);

                try {
                  await AdminOrderAPI.updateStatus(order.id, {
                    status,
                    note,
                    location,
                  });

                  onUpdated();

                  await refetchDetail();
                } catch (err) {
                  console.error(err);
                } finally {
                  setStatusLoading(false);
                }
              }}
            />

            {/* Thanh toán */}
            <PaymentSection
              paymentMethod={d.payment_method}
              paymentStatus={d.payment_status}
              payLoading={payLoading}
              onMarkPaid={handleMarkPaid}
            />

            {/* Vận chuyển quốc tế */}
            <OrderShipmentSection
              intShipment={d.intShipment}
              showIntForm={showIntForm}
              intTracking={intTracking}
              intCarrier={intCarrier}
              intFrom={intFrom}
              intTo={intTo}
              intNote={intNote}
              intLoading={intLoading}
              intStatusLoading={intStatusLoading}
              setShowIntForm={setShowIntForm}
              setIntTracking={setIntTracking}
              setIntCarrier={setIntCarrier}
              setIntFrom={setIntFrom}
              setIntTo={setIntTo}
              setIntNote={setIntNote}
              onCreateShipment={handleCreateIntShipment}
              onUpdateStatus={handleUpdateIntStatus}
            />
            {/* Vận chuyển nội địa */}
            <OrderDomShipmentSection
              domShipment={d.domShipment}
              showDomForm={showDomForm}
              domTracking={domTracking}
              domCarrier={domCarrier}
              domUrl={domUrl}
              domFee={domFee}
              domNote={domNote}
              domLoading={domLoading}
              setShowDomForm={setShowDomForm}
              setDomTracking={setDomTracking}
              setDomCarrier={setDomCarrier}
              setDomUrl={setDomUrl}
              setDomFee={setDomFee}
              setDomNote={setDomNote}
              onCreateShipment={handleCreateDomShipment}
            />

            {/* Thông tin người nhận */}
            <OrderReceiverSection
              receiver_name={d.receiver_name}
              receiver_phone={d.receiver_phone}
              receiver_email={d.receiver_email}
              receiver_address={d.receiver_address}
              shipping_method={d.shipping_method}
              note={d.note}
            />

            {/* Sản phẩm */}
            <OrderItemsSection items={d.items} />

            {/* Tổng tiền */}
            <OrderSummarySection
              total_price={d.total_price}
              discount_amount={d.discount_amount}
              coupon_code={d.coupon_code}
              shipping_fee={d.shipping_fee}
              service_fee={d.service_fee}
              final_price={d.final_price}
            />

            {/* Lịch sử */}
            <OrderLogsSection logs={d.logs} />
          </div>
        )}
      </div>
    </>
  );
}
