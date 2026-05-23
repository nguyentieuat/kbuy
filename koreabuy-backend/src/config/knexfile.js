// config/knexfile.js

require("dotenv").config();

const baseConfig = {
  client: "pg",

  connection: {
    host: process.env.DB_HOST || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "123456",
    database: process.env.DB_NAME || "kbuy_db",
    port: process.env.DB_PORT || 5432,
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
