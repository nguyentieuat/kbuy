// controllers/newsletter.controller.js

const NewsletterService = require(
  "../services/newsletter.service",
);

class NewsletterController {
  static async subscribe(req, res) {
    try {
      const result =
        await NewsletterService.subscribe(req.body);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  static async unsubscribe(req, res) {
    try {
      const result =
        await NewsletterService.unsubscribe(
          req.body.email,
        );

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }
}

module.exports = NewsletterController;
