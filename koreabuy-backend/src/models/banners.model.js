// models/banners.model.js
const db = require("../config/db.config");

const getActiveBanners = ({ type, position } = {}) => {
  let query = db("banners")
    .where("is_active", true)
    .andWhere(function () {
      this.whereNull("start_date").orWhere("start_date", "<=", db.fn.now());
    })
    .andWhere(function () {
      this.whereNull("end_date").orWhere("end_date", ">=", db.fn.now());
    });

  if (type) {
    query.andWhere("type", type.toLowerCase());
  }

  if (position) {
    query.andWhere("position", position);
  }

  return query.orderBy("sort_order", "asc");
};

module.exports = {
  getActiveBanners,
};
