// routes/newsletter.routes.js

const router = require("express").Router();

const NewsletterController = require(
  "../controllers/newsletter.controller",
);

router.post(
  "/subscribe",
  NewsletterController.subscribe,
);

router.post(
  "/unsubscribe",
  NewsletterController.unsubscribe,
);

module.exports = router;
