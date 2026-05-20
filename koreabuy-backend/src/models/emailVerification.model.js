// models/emailVerification.model.js

const db = require("../config/db.config");

const EmailVerificationModel = {
  async findByEmail(email) {
    return db("email_verifications").where({ email }).first();
  },

  async upsert(email) {
    const existing = await this.findByEmail(email);
    if (existing) {
      await db("email_verifications")
        .where({ email })
        .update({ updated_at: new Date() });
      return this.findByEmail(email);
    }
    const [created] = await db("email_verifications")
      .insert({
        email,
        verified: false,
      })
      .returning("*");

    return created;
  },

  async saveOtp(email, otpHash, expiresAt) {
    await db("email_verifications").where({ email }).update({
      verify_token: otpHash,
      attempt_count: 0,
      last_attempt_at: new Date(),
      updated_at: new Date(),
    });
  },

  async incrementAttempt(email) {
    await db("email_verifications")
      .where({ email })
      .update({
        attempt_count: db.raw("attempt_count + 1"),
        last_attempt_at: new Date(),
        updated_at: new Date(),
      });
  },

  async markVerified(email) {
    await db("email_verifications").where({ email }).update({
      verified: true,
      verified_at: new Date(),
      verify_token: null,
      updated_at: new Date(),
    });

    // Cập nhật luôn vào bảng users
    await db("users")
      .where({ email })
      .update({ email_verified: true, updated_at: new Date() });
  },

  async resetOtp(email) {
    await db("email_verifications").where({ email }).update({
      verify_token: null,
      attempt_count: 0,
      updated_at: new Date(),
    });
  },
};

module.exports = EmailVerificationModel;
