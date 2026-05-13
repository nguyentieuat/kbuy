// mappers/order.mapper.js

function mapOrderItem(item) {
  return {
    id: item.id,
    productId: item.product_id,
    variantId: item.variant_id,

    productName: item.product_name,
    variantName: item.variant_name,

    image: item.image,
    sku: item.sku,

    price: Number(item.price),
    originalPrice: item.original_price ? Number(item.original_price) : null,

    quantity: item.quantity,
    totalPrice: Number(item.total_price),

    productLink: item.product_link,
  };
}

function mapOrderLog(log) {
  return {
    id: log.id,
    status: log.status,
    note: log.note,
    location: log.location,
    handlerName: log.handler_name,

    createdAt: log.created_at,

    updatedBy: log.updated_by,
  };
}

function mapOrderDetail(order) {
  return {
    id: order.id,

    orderCode: order.order_code,

    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,

    totalPrice: Number(order.total_price),
    shippingFee: Number(order.shipping_fee),
    serviceFee: Number(order.service_fee),
    discountAmount: Number(order.discount_amount),
    finalPrice: Number(order.final_price),

    receiverName: order.receiver_name,
    receiverPhone: order.receiver_phone,
    receiverEmail: order.receiver_email,

    receiverAddress: order.receiver_address,
    receiverWard: order.receiver_ward,
    receiverProvince: order.receiver_province,

    shippingMethod: order.shipping_method,
    shippingRegion: order.shipping_region,

    note: order.note,

    createdAt: order.created_at,
    confirmedAt: order.confirmed_at,

    items: order.items.map(mapOrderItem),

    logs: order.status_logs.map(mapOrderLog),
  };
}

function mapOrderSummary(order) {
  return {
    id: order.id,

    orderCode: order.order_code,

    status: order.status,
    paymentStatus: order.payment_status,

    finalPrice: Number(order.final_price),

    createdAt: order.created_at,

    items: (order.items || []).map(mapOrderItem),

    logs: (order.status_logs || []).map(mapOrderLog),

    latestLog: order.status_logs?.[0]
      ? mapOrderLog(order.status_logs[0])
      : null,
  };
}

module.exports = {
  mapOrderItem,
  mapOrderLog,
  mapOrderDetail,
  mapOrderSummary,
};
