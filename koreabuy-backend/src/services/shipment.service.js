// services/shipment.service.js
const db = require("../config/db.config");

const OrderModel = require("../models/order.model");
const ShipmentModel = require("../models/shipment.model");
const OrderStatusLogModel = require("../models/orderStatusLog.model");
const DomesticShipmentsModel = require("../models/domesticShipments.model");

const VALID_STATUSES = [
  "preparing",
  "shipped",
  "arrived_kr",
  "customs",
  "arrived_vn",
  "completed",
];

function mapShipmentStatusToOrderStatus(status) {
  switch (status) {
    case "preparing":
    case "shipped":
    case "arrived_kr":
    case "customs":
    case "arrived_vn":
      return "processing";

    case "completed":
      return "shipped";

    default:
      return "processing";
  }
}

const ShipmentService = {
  async createInternationalShipment(orderId, data, user = null) {
    orderId = Number(orderId);

    if (Number.isNaN(orderId)) {
      throw new Error("Invalid order id");
    }

    return db.transaction(async (trx) => {
      const order = await OrderModel.findOrderById(orderId, trx);
      if (!order) {
        throw new Error("Order not found");
      }

      const existedShipment = await ShipmentModel.findByOrderId(orderId, trx);

      if (existedShipment) {
        throw new Error("Order already assigned to shipment");
      }

      if (!["confirmed", "processing"].includes(order.status)) {
        throw new Error(`Cannot create shipment from status: ${order.status}`);
      }

      const shipment = await ShipmentModel.createShipment(
        {
          tracking_code: data.tracking_code,
          carrier: data.carrier || null,
          from_warehouse: data.from_warehouse || null,
          to_warehouse: data.to_warehouse || null,
          note: data.note || null,
          status: "shipped",
          shipped_at: trx.fn.now(),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        },
        trx,
      );

      await ShipmentModel.createShipmentOrder(
        {
          shipment_id: shipment.id,
          order_id: orderId,
          order_code: order.order_code,
          created_at: trx.fn.now(),
        },
        trx,
      );

      await OrderModel.updateOrderStatus(
        orderId,
        {
          status: "shipped",
          updated_at: trx.fn.now(),
        },
        trx,
      );

      await OrderStatusLogModel.create(
        {
          order_id: orderId,
          order_code: order.order_code,
          status: "shipped",
          note: data.note || "Created international shipment",
          location: "Korea Warehouse",
          handler_name: user?.name || "admin",
          updated_by: user?.id || null,
          created_at: trx.fn.now(),
        },
        trx,
      );

      return {
        success: true,
        shipment,
      };
    });
  },

  async createInternationalShipments({
    tracking_code,
    carrier,
    from_warehouse,
    to_warehouse,
    note,
    order_ids,
    user,
  }) {
    return db.transaction(async (trx) => {
      if (!order_ids?.length) {
        throw new Error("order_ids is required");
      }

      // 1. create shipment
      const [row] = await trx("international_shipments")
        .insert({
          tracking_code,
          carrier,
          from_warehouse,
          to_warehouse,
          note,
        })
        .returning("id");

      const shipmentId = row.id;

      // 2. validate orders
      const orders = await OrderModel.findOrderByIds(order_ids, trx);
      if (orders.length !== order_ids.length) {
        throw new Error("Some orders not found");
      }

      // 3. insert pivot
      await orders.map((order) => {
        console.log(order);
        ShipmentModel.createShipmentOrder(
          {
            shipment_id: shipmentId,
            order_id: order.id,
            order_code: order.order_code,
            created_at: trx.fn.now(),
          },
          trx,
        );
      });

      // 4. update orders status
      OrderModel.updateOrderStatusList(
        order_ids,
        {
          status: "shipped",
          updated_at: trx.fn.now(),
        },
        trx,
      );

      await orders.map((order) => {
        OrderStatusLogModel.create(
          {
            order_id: order.id,
            order_code: order.order_code,
            status: "shipped",
            note: note || "Created international shipment",
            location: "Korea Warehouse",
            handler_name: user?.name || "admin",
            updated_by: user?.id || null,
            created_at: trx.fn.now(),
          },
          trx,
        );
      });

      return {
        shipment_id: shipmentId,
        order_ids,
      };
    });
  },

  async updateInternationalShipmentStatus(shipmentId, status, user) {
    if (!status) {
      throw new Error("Missing status");
    }

    if (!VALID_STATUSES.includes(status)) {
      const err = new Error("Invalid status");
      err.code = "INVALID_STATUS";
      throw err;
    }

    const shipment = await ShipmentModel.findById(shipmentId);

    if (!shipment) {
      const err = new Error("Shipment not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    await ShipmentModel.updateStatus(shipmentId, status);

    const orders = await ShipmentModel.findOrdersByShipmentId(shipmentId);

    await Promise.all(
      orders.map((order) =>
        OrderStatusLogModel.create({
          order_id: order.order_id,
          order_code: order.order_code,
          status: mapShipmentStatusToOrderStatus(status),
          note: `International shipment: ${status}`,
          location: "International logistics",
          handler_name: user?.name || "system",
          updated_by: user?.id || null,
          created_at: new Date(),
        }),
      ),
    );

    return ShipmentModel.findById(shipmentId);
  },

  async createDomesticShipment({
    orderId,
    tracking_code,
    carrier,
    tracking_url,
    shipping_fee,
    note,
    user,
  }) {
    return db.transaction(async (trx) => {
      const order = await OrderModel.findById(orderId, trx);
      if (!order) throw new Error("Order not found");

      // check existed
      const existed = await DomesticShipmentsModel.findByOrderId(orderId, trx);
      if (existed) {
        throw new Error("Order already has domestic shipment");
      }
      // 1. create shipment
      const [shipmentId] = await DomesticShipmentsModel.createDomesticShipments(
        {
          order_id: orderId,
          order_code: order.order_code,
          tracking_code,
          carrier,
          tracking_url,
          shipping_fee,
          note,
          status: "shipping",
          shipped_at: trx.fn.now(),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        },
        trx,
      );

      // 2. update order status (FIX BUG: order_ids → orderId)
      await OrderModel.updateOrderStatusList(
        [orderId],
        {
          status: "shipped",
          updated_at: trx.fn.now(),
        },
        trx,
      );

      // 3. log order status
      await OrderStatusLogModel.create(
        {
          order_id: orderId,
          order_code: order.order_code,
          status: "shipped",
          note: note || "Created domestic shipment",
          location: "Vietnam Warehouse",
          handler_name: user?.name || "system",
          updated_by: user?.id || null,
          created_at: trx.fn.now(),
        },
        trx,
      );

      return {
        shipment_id: shipmentId,
        order_id: orderId,
      };
    });
  },
};

module.exports = ShipmentService;
