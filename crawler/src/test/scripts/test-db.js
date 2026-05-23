const knex = require("knex")(require("../../../config/knexfile"));

async function main() {
  const rows = await knex("categories").select("*");

  console.log(rows);

  await knex.destroy();
}

main();