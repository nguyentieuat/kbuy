// knexfile.js
require("dotenv").config();

/**
 * @type {import('knex').Knex.Config}
 */
module.exports = {
  // client: "pg",
  // connection: {
  //   host: process.env.DB_HOST || "54.253.93.224",
  //   port: process.env.DB_PORT || 5432,
  //   database: process.env.DB_NAME || "kbuy_db",
  //   user: process.env.DB_USER || "postgres",
  //   password: process.env.DB_PASSWORD || "123456",
  // },
  // pool: {
  //   min: 2,
  //   max: 10,
  // },

  client: "pg",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "123456",
    database: process.env.DB_NAME || "kbuy_db",
    port: Number(process.env.DB_PORT || 5432),
  },
  pool: { min: 0, max: 5 },
  searchPath: ["public", "knex"],
  options: {
    searchPath: ["public"],
  },
  
};
