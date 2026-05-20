// knexfile.js
require("dotenv").config();

/**
 * @type {import('knex').Knex.Config}
 */
module.exports = {
  client: "pg",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "kbuy_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "123456",
  },
  pool: {
    min: 2,
    max: 10,
  },
  
};
