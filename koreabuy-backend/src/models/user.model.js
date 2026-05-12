// models/user.model.js

const db = require("../config/db.config");
const { normalizePhone } = require("../utils/phone.util");

const UserModel = {
  async findById(id) {
    const user = await db("users").where("users.id", id).first();

    if (!user) return null;

    const phoneVer = await db("phone_verifications")
      .where("phone", user.phone)
      .first();

    const emailVer = await db("email_verifications")
      .where("email", user.email)
      .first();

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },

  async findByEmail(email) {
    const user = await db("users")
      .whereRaw("LOWER(email) = LOWER(?)", [email])
      .first();
    if (!user) return null;

    const phoneVer = await db("phone_verifications")
      .where("phone", user.phone)
      .first();

    const emailVer = await db("email_verifications")
      .where("email", user.email)
      .first();

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },

  async findByUsername(username) {
    const user = await db("users")
      .whereRaw("LOWER(username) = LOWER(?)", [username])
      .first();
    if (!user) return null;

    const phoneVer = await db("phone_verifications")
      .where("phone", user.phone)
      .first();

    const emailVer = await db("email_verifications")
      .where("email", user.email)
      .first();

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },

  async findByPhone(phone) {
    const user = await db("users").where({ phone }).first();
    if (!user) return null;

    const phoneVer = await db("phone_verifications")
      .where("phone", user.phone)
      .first();

    const emailVer = await db("email_verifications")
      .where("email", user.email)
      .first();

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },

  async findByCredential(credential) {
    if (!credential) return null;

    const user = await db("users")
      .where((q) => {
        q.whereRaw("LOWER(email) = LOWER(?)", [credential])
          .orWhereRaw("LOWER(username) = LOWER(?)", [credential])
          .orWhere("phone", normalizePhone(credential));
      })
      .first();

    if (!user) return null;

    let phoneVer = null;
    let emailVer = null;

    if (user.phone) {
      phoneVer = await db("phone_verifications")
        .where("phone", user.phone)
        .first();
    }

    if (user.email) {
      emailVer = await db("email_verifications")
        .where("email", user.email)
        .first();
    }

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },

  async create(data) {
    const [user] = await db("users").insert(data).returning("*");

    if (!user) return null;

    const phoneVer = await db("phone_verifications")
      .where("phone", user.phone)
      .first();

    const emailVer = await db("email_verifications")
      .where("email", user.email)
      .first();

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },

  async update(id, data) {
    const [user] = await db("users")
      .where({ id })
      .update({
        ...data,
        updated_at: new Date(),
      })
      .returning("*");

    if (!user) return null;

    const phoneVer = await db("phone_verifications")
      .where("phone", user.phone)
      .first();

    const emailVer = await db("email_verifications")
      .where("email", user.email)
      .first();

    return {
      ...user,
      phone_verified: !!phoneVer?.verified,
      email_verified: !!emailVer?.verified,
    };
  },
};

module.exports = UserModel;
