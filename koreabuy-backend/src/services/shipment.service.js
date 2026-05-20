// services/shipment.service.js
const db = require("../config/db.config");

const OrderModel = require("../models/order.model");
const ShipmentModel = require("../models/shipment.model");
const OrderStatusLogModel = require("../models/orderStatusLog.model");
const DomesticShipmentsModel = require("../models/domesticShipments.model");
const { getKrwToVndRate, convertPrice } = require("./currency.service");
const EmailQueueService = require("./emailQueue.service");

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
    try {
      orderId = Number(orderId);

      if (Number.isNaN(orderId)) {
        throw new Error("Invalid order id");
      }

      const rate = await getKrwToVndRate();

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
          throw new Error(
            `Cannot create shipment from status: ${order.status}`,
          );
        }

        const shipment = await ShipmentModel.createShipment(
          {
            shipment_code: data.tracking_code,
            carrier: data.carrier || "unknown",
            from_warehouse: data.from_warehouse || "Korean warehouse",
            to_warehouse: data.to_warehouse || "VietNam warehouse",
            actual_cost_krw: data.actual_cost_krw || null,
            total_actual_weight_grams: data.actual_weight_grams || null,
            total_billed_weight_grams: order.chargeable_weight_grams,
            exchange_rate_used: rate,
            total_collected_fee: order.international_shipping_fee,
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
            handler_name: user?.username || "admin",
            updated_by: user?.id || null,
            created_at: trx.fn.now(),
          },
          trx,
        );

        // Gửi email cho order sau transaction
        if (order.receiver_email) {
          await EmailQueueService.sendOrderTracking(order, shipment);
        }
        return {
          success: true,
          shipment,
        };
      });
    } catch (error) {
      console.log(error);
      throw new Error("Some error found");
    }
  },

  async createInternationalShipments(data, user = null) {
    try {
      const rate = await getKrwToVndRate();

      return db.transaction(async (trx) => {
        if (!data.order_ids?.length) {
          throw new Error("order_ids is required");
        }
        const orders = await OrderModel.findOrderByIds(data.order_ids, trx);
        if (orders.length !== data.order_ids.length) {
          throw new Error("Some orders not found");
        }
        // Tính tổng phí quốc tế khách đã trả
        const totalCollectedFee = orders.reduce((sum, order) => {
          return sum + Number(order.international_shipping_fee ?? 0);
        }, 0);

        // Tổng cân tính phí
        const totalBillWeight = orders.reduce((sum, order) => {
          return sum + Number(order.chargeable_weight_grams ?? 0);
        }, 0);

        // 1. create shipment
        const shipment = await ShipmentModel.createShipment(
          {
            shipment_code: data.tracking_code,
            carrier: data.carrier || "unknown",
            from_warehouse: data.from_warehouse || "Korean warehouse",
            to_warehouse: data.to_warehouse || "VietNam warehouse",
            actual_cost_krw: data.actual_cost_krw || null,
            total_actual_weight_grams: data.actual_weight_grams || null,
            exchange_rate_used: rate,
            actual_cost_vnd: convertPrice(data.actual_cost_krw, rate),

            total_collected_fee: totalCollectedFee,
            total_billed_weight_grams: totalBillWeight,
            note: data.note || null,
            status: "shipped",
            shipped_at: trx.fn.now(),
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          },
          trx,
        );

        const shipmentId = shipment.id;

        // 3. insert pivot
        await Promise.all(
          orders.map((order) =>
            ShipmentModel.createShipmentOrder(
              {
                shipment_id: shipmentId,
                order_id: order.id,
                order_code: order.order_code,
                created_at: trx.fn.now(),
              },
              trx,
            ),
          ),
        );

        // 4. update orders status
        OrderModel.updateOrderStatusList(
          data.order_ids,
          {
            status: "shipped",
            updated_at: trx.fn.now(),
          },
          trx,
        );

        await Promise.all(
          orders.map((order) =>
            OrderStatusLogModel.create(
              {
                order_id: order.id,
                order_code: order.order_code,
                status: "shipped",
                note: data.note || "Created international shipment",
                location: "Korea Warehouse",
                handler_name: user?.username || "admin",
                updated_by: user?.id || null,
                created_at: trx.fn.now(),
              },
              trx,
            ),
          ),
        );

        // Gửi email cho từng order sau transaction
        await Promise.all(
          orders
            .filter((o) => o.receiver_email)
            .map((order) =>
              EmailQueueService.sendOrderTracking(order, {
                shipment_code: data.tracking_code,
                carrier: data.carrier,
              }),
            ),
        );

        return {
          shipment_id: shipmentId,
          order_ids: data.order_ids,
        };
      });
    } catch (error) {
      console.log(error);
      throw new Error("Some error found");
    }
  },

  async updateInternationalShipmentStatus(
    shipmentId,
    status,
    additional_fee_krw,
    user = null,
  ) {
    try {
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

      let actual_cost_krw = shipment.actual_cost_krw;
      let actual_cost_vnd = shipment.actual_cost_vnd;

      if (additional_fee_krw != null) {
        const rate = await getKrwToVndRate();

        actual_cost_krw =
          Number(shipment.actual_cost_krw || 0) + Number(additional_fee_krw);

        actual_cost_vnd =
          Number(shipment.actual_cost_vnd || 0) +
          convertPrice(additional_fee_krw, rate);
      }

      await ShipmentModel.updateStatus(
        shipmentId,
        status,
        actual_cost_krw,
        actual_cost_vnd,
      );

      await ShipmentModel.updateStatus(
        shipmentId,
        status,
        actual_cost_krw,
        actual_cost_vnd,
      );

      const orders = await ShipmentModel.findOrdersByShipmentId(shipmentId);

      await Promise.all(
        orders.map((order) =>
          OrderStatusLogModel.create({
            order_id: order.order_id,
            order_code: order.order_code,
            status: mapShipmentStatusToOrderStatus(status),
            note: `International shipment: ${status}`,
            location: "International logistics",
            handler_name: user?.username || "admin",
            updated_by: user?.id || null,
            created_at: new Date(),
          }),
        ),
      );

      // Gửi email theo status
      await Promise.all(
        orders
          .filter((o) => o.receiver_email)
          .map(async (order) => {
            if (status === "arrived_vn") {
              await EmailQueueService.sendOrderArrivedVn(order);
            }
          }),
      );
    } catch (error) {
      console.log(error);
      throw new Error("Some error found");
    }
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
          handler_name: user?.username || "admin",
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
