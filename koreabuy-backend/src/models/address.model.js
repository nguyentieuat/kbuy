// models/address.model.js

const db = require("../config/db.config");

const AddressModel = {
  async findByUserId(userId) {
    console.log(userId)
    return db("user_addresses")
      .where({ user_id: userId })
      .orderBy("is_default", "desc")
      .orderBy("id", "desc");
  },

  async create(userId, data) {
    const [address] = await db("user_addresses")
      .insert({
        user_id: userId,
        ...data,
      })
      .returning("*");

    return address;
  },

  async update(id, userId, data) {
    const [address] = await db("user_addresses")
      .where({ id, user_id: userId })
      .update({
        ...data,
        updated_at: new Date(),
      })
      .returning("*");

    return address;
  },

  async remove(id, userId) {
    return db("user_addresses")
      .where({ id, user_id: userId })
      .del();
  },

  async unsetDefault(userId) {
    return db("user_addresses")
      .where({ user_id: userId })
      .update({ is_default: false });
  },

  async setDefault(id, userId) {
    await this.unsetDefault(userId);

    const [address] = await db("user_addresses")
      .where({ id, user_id: userId })
      .update({
        is_default: true,
        updated_at: new Date(),
      })
      .returning("*");

    return address;
  },
};

module.exports = AddressModel;
