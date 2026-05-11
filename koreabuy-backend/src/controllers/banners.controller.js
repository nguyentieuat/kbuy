// controllers/banners.controller.js
const bannersService = require("../services/banners.service");

const getBanners = async (req, res) => {
  try {
    const { type, position } = req.query;

    const data = await bannersService.getBanners({ type, position });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getBanners
};
