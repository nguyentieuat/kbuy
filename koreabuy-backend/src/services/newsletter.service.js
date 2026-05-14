// services/newsletter.service.js

const NewsletterSubscriberModel = require(
  "../models/newsletterSubscriber.model",
);

class NewsletterService {
  static async subscribe({ email, source }) {
    if (!email) {
      throw new Error("Email là bắt buộc");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists =
      await NewsletterSubscriberModel.findByEmail(
        normalizedEmail,
      );

    // đã subscribe
    if (exists && exists.status === "active") {
      return {
        message: "Email đã đăng ký trước đó",
        subscriber: exists,
      };
    }

    // đã unsubscribe → active lại
    if (exists && exists.status === "unsubscribed") {
      const subscriber =
        await NewsletterSubscriberModel.reactivate(
          exists.id,
        );

      return {
        message: "Đăng ký nhận tin thành công",
        subscriber,
      };
    }

    // tạo mới
    const subscriber =
      await NewsletterSubscriberModel.create({
        email: normalizedEmail,
        source: source || null,
      });

    return {
      message: "Đăng ký nhận tin thành công",
      subscriber,
    };
  }

  static async unsubscribe(email) {
    if (!email) {
      throw new Error("Email là bắt buộc");
    }

    const subscriber =
      await NewsletterSubscriberModel.unsubscribe(
        email,
      );

    if (!subscriber) {
      throw new Error("Email không tồn tại");
    }

    return {
      message: "Đã hủy đăng ký",
    };
  }
}

module.exports = NewsletterService;
