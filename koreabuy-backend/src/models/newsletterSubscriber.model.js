// models/newsletterSubscriber.model.js

const db = require("../config/db.config");

class NewsletterSubscriberModel {
  static async findByEmail(email) {
    return db("newsletter_subscribers")
      .whereRaw("LOWER(email) = LOWER(?)", [email])
      .first();
  }

  static async create(data) {
    const [subscriber] = await db("newsletter_subscribers")
      .insert(data)
      .returning("*");

    return subscriber;
  }

  static async reactivate(id) {
    const [subscriber] = await db("newsletter_subscribers")
      .where({ id })
      .update({
        status: "active",
        unsubscribed_at: null,
        updated_at: new Date(),
      })
      .returning("*");

    return subscriber;
  }

  static async unsubscribe(email) {
    const [subscriber] = await db("newsletter_subscribers")
      .whereRaw("LOWER(email) = LOWER(?)", [email])
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");

    return subscriber;
  }
}

module.exports = NewsletterSubscriberModel;
