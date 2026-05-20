// scripts/testEmail.js

require("dotenv").config();
const { emailQueue } = require("../../queues");

async function test() {
  await emailQueue.add("test", {
    type: "order_confirmed",
    to: "thanhluan.kma@gmail.com",
    data: {
      orderCode: "KB2605ABCD",
      receiverName: "Nguyễn Văn A",
      items: [
        { product_name: "Kem chống nắng", variant_name: "50ml", quantity: 2, price: 150000 },
      ],
      totalFinal: 350000,
      shippingFee: 50000,
    },
  });

  console.log("✅ Job added to queue");
  process.exit(0);
}

test();