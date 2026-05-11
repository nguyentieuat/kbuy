// services/banners.service.js
const bannersModel = require("../models/banners.model");

const getBanners = async ({ type, position } = {}) => {
  return bannersModel.getActiveBanners({ type, position });
};

module.exports = {
  getBanners
};
