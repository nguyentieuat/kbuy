// queues/index.js

const { Queue } = require("bullmq");
const connection = require("../config/redis.config");

const emailQueue = new Queue("email", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100, // giữ 100 job completed gần nhất
    removeOnFail: 200,     // giữ 200 job failed để debug
  },
});

module.exports = { emailQueue };
