// config/firebaseAdmin.config.js

const admin = require("firebase-admin");
const serviceAccount = require("./kbuy-d1e1e-firebase-adminsdk-fbsvc-3a7e555201.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();

module.exports = { auth, admin };
