// models/userAddress.model.js

const db = require("../config/db.config");

async function findByUserId(userId) {
  return db("user_addresses")
    .where({ user_id: userId })
    .orderBy("is_default", "desc")
    .orderBy("created_at", "desc");
}

module.exports = {
  findByUserId,
};
