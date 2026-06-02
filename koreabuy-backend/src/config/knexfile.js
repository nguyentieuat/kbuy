// config/knexfile.js

require("dotenv").config();

const baseConfig = {
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
module.exports = {
  development: {
    ...baseConfig,

    migrations: {
      directory: "../database/migrations",
      loadExtensions: [".js"],
    },

    seeds: {
      directory: "../database/seeds",
      loadExtensions: [".js"],
    },
  },

  production: {
    ...baseConfig,

    migrations: {
      directory: "../database/migrations",
      loadExtensions: [".js"],
    },

    seeds: {
      directory: "../database/seeds",
      loadExtensions: [".js"],
    },
  },
};
