// services/address.service.js

const AddressModel = require("../models/address.model");

const AddressService = {
  async getList(userId) {
    return AddressModel.findByUserId(userId);
  },

  async create(userId, data) {
    return AddressModel.create(userId, {
      ...data,
      is_default: false,
    });
  },

  async update(userId, id, data) {
    return AddressModel.update(id, userId, data);
  },

  async delete(userId, id) {
    return AddressModel.remove(id, userId);
  },

  async setDefault(userId, id) {
    return AddressModel.setDefault(id, userId);
  },
};

module.exports = AddressService;
