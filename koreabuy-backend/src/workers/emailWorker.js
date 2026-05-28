// workers/emailWorker.js

const { Worker } = require("bullmq");
const { Resend } = require("resend");

const connection = require("../config/redis.config");

const {
  buildOrderConfirmedTemplate,
  buildTrackingTemplate,
  buildArrivedVnTemplate,
  buildDeliveredTemplate,
  buildAdminOrderTemplate
} = require("../services/email/templates");

// ── Resend ───────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Map type → template ──────────────────────
const EMAIL_TEMPLATES = {
  order_confirmed: {
    subject: (data) =>
      `[KoreaBuy] Đơn hàng #${data.orderCode} đã được xác nhận`,
    html: (data) => buildOrderConfirmedTemplate(data),
  },

  order_tracking: {
    subject: (data) =>
      `[KoreaBuy] Đơn hàng #${data.orderCode} đang trên đường về`,
    html: (data) => buildTrackingTemplate(data),
  },

  order_arrived_vn: {
    subject: (data) => `[KoreaBuy] Đơn hàng #${data.orderCode} đã về Việt Nam`,
    html: (data) => buildArrivedVnTemplate(data),
  },

  order_delivered: {
    subject: (data) =>
      `[KoreaBuy] Đơn hàng #${data.orderCode} đã giao thành công`,
    html: (data) => buildDeliveredTemplate(data),
  },

  admin_order_alert: {
    subject: (data) => `[ADMIN] New Order #${data.orderCode}`,
    html: (data) => buildAdminOrderTemplate(data),
  },
};

// ── Worker ───────────────────────────────────
const emailWorker = new Worker(
  "email",
  async (job) => {
    const { type, to, data } = job.data;

    console.log(
      `[Email Worker] Processing job ${job.id} — type: ${type} → ${to}`,
    );

    if (!to) {
      console.warn(`[Email Worker] Skipping job ${job.id}: no email address`);
      return;
    }

    const template = EMAIL_TEMPLATES[type];

    if (!template) {
      throw new Error(`Unknown email type: ${type}`);
    }

    // ── SEND EMAIL ───────────────────────────
    const result = await resend.emails.send({
      from: `KoreaBuy <${process.env.MAIL_FROM}>`,
      to,
      subject: template.subject(data),
      html: template.html(data),
    });

    console.log(`[Email Worker] ✅ Sent ${type} to ${to}`, result);
  },
  {
    connection,
    concurrency: 5,
  },
);

// ── Events ───────────────────────────────────
emailWorker.on("completed", (job) => {
  console.log(`[Email Worker] ✅ Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(
    `[Email Worker] ❌ Job ${job.id} failed (attempt ${job.attemptsMade}):`,
    err,
  );
});

emailWorker.on("error", (err) => {
  console.error("[Email Worker] Worker error:", err);
});

// ── Graceful shutdown ─────────────────────────
async function shutdown() {
  console.log("[Email Worker] Closing...");

  await emailWorker.close();

  console.log("[Email Worker] Closed");
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = emailWorker;
