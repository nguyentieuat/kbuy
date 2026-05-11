// models/phoneVerification.model.js

const db = require("../config/db.config");

const TABLE = "phone_verifications";

const PhoneVerificationModel = {
  async findByPhone(phone) {
    return db(TABLE)
      .where({ phone })
      .first();
  },

  async upsertVerified({
    phone,
    uid = null,
    method = "firebase",
  }) {
    const existing = await this.findByPhone(phone);

    const payload = {
      verified: true,
      verified_at: new Date(),
      last_verified_uid: uid,
      verify_method: method,
      attempt_count: 0,
      updated_at: db.fn.now(),
    };

    if (existing) {
      return db(TABLE)
        .where({ phone })
        .update(payload);
    }

    return db(TABLE).insert({
      phone,
      ...payload,
      created_at: db.fn.now(),
      risk_level: 0,
      cod_blocked: false,
    });
  },

  async incrementAttempt({
    phone,
    method = "firebase",
  }) {
    return db(TABLE)
      .insert({
        phone,
        verify_method: method,
        attempt_count: 1,
        last_attempt_at: new Date(),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .onConflict("phone")
      .merge({
        verify_method: method,
        attempt_count: db.raw("attempt_count + 1"),
        last_attempt_at: new Date(),
        updated_at: db.fn.now(),
      });
  },
};

module.exports = PhoneVerificationModel;
