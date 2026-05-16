// controllers/cart.controller.js

const CartService = require("../services/cart.service");

async function getCart(req, res) {
  try {
    const data = await CartService.getCart(req.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

async function addItem(req, res) {
  try {
    await CartService.addItem(req.user.id, req.body);

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

async function updateQuantity(req, res) {
  try {
    await CartService.updateQuantity(
      req.user.id,
      req.params.id,
      req.body.quantity,
    );

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

async function removeItem(req, res) {
  try {
    await CartService.removeItem(
      req.user.id,
      req.params.id,
    );

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

module.exports = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
};
