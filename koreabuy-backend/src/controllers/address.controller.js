// controllers/address.controller.js

const AddressService = require("../services/address.service");

async function getAddresses(req, res) {
  try {
    const data = await AddressService.getList(req.user.id);
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

async function createAddress(req, res) {
  try {
    const data = await AddressService.create(req.user.id, req.body);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

async function updateAddress(req, res) {
  try {
    const data = await AddressService.update(
      req.user.id,
      req.params.id,
      req.body,
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

async function deleteAddress(req, res) {
  try {
    await AddressService.delete(req.user.id, req.params.id);

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

async function setDefault(req, res) {
  try {
    const data = await AddressService.setDefault(
      req.user.id,
      req.params.id,
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
};
