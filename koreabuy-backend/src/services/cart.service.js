// services/cart.service.js

const CartModel = require("../models/cart.model");
const CartItemModel = require("../models/cartItem.model");
const CartMapper = require("../mappers/cart.mapper");
const { getKrwToVndRate } = require("./currency.service");

async function getOrCreateCart(userId) {
  let cart = await CartModel.findByUserId(userId);

  if (!cart) {
    cart = await CartModel.create(userId);
  }
  return cart;
}

async function getCart(userId) {
  const cart = await getOrCreateCart(userId);

  const items = await CartItemModel.findItems(cart.id);

  const rate = await getKrwToVndRate();
  
  return CartMapper.toCartItems(items, rate);
}

async function addItem(userId, data) {
  const cart = await getOrCreateCart(userId);

  const existing = await CartItemModel.findExisting(
    cart.id,
    data.productId,
    data.variantId,
  );

  if (existing) {
    await CartItemModel.updateQuantity(
      existing.id,
      existing.quantity + data.quantity,
    );
  } else {
    await CartItemModel.create({
      cart_id: cart.id,
      product_id: data.productId,
      variant_id: data.variantId ?? null,
      quantity: data.quantity,
    });
  }

  return getCart(userId);
}

async function updateQuantity(userId, itemId, quantity) {
  const cart = await getOrCreateCart(userId);

  const item = await CartItemModel.findById(
    cart.id,
    itemId,
  );

  if (!item) {
    throw new Error("Cart item not found");
  }

  if (quantity <= 0) {
    await CartItemModel.deleteById(itemId);
  } else {
    await CartItemModel.updateQuantity(
      itemId,
      quantity,
    );
  }

  return getCart(userId);
}

async function removeItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);

  const item = await CartItemModel.findById(
    cart.id,
    itemId,
  );

  if (!item) {
    throw new Error("Cart item not found");
  }

  await CartItemModel.deleteById(itemId);

  return getCart(userId);
}

module.exports = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
};
