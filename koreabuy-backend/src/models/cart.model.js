// models/cart.model.js

const db = require("../config/db.config");

async function findByUserId(userId) {
  return db("carts")
    .where("user_id", userId)
    .first();
}

async function create(userId) {
  const [id] = await db("carts").insert({
    user_id: userId,
  });

  return db("carts")
    .where("id", id)
    .first();
}

module.exports = {
  findByUserId,
  create,
};
