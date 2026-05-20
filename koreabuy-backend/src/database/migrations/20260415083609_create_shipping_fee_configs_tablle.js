exports.up = async function (knex) {
  await knex.schema.createTable("shipping_fee_configs", (table) => {
    table.increments("id").primary();

    // ── BASIC ──
    table.string("name", 255).notNullable();

    // international | local
    table.string("shipping_type", 50).notNullable();

    // standard | fast | express
    table.string("shipping_mode", 50).notNullable();


    // weight_rate | base_step
    table.string("pricing_mode", 50).notNullable();

    // system | ghn | ghtk | jt | viettelpost
    table.string("carrier", 100).defaultTo("system");

    // ── REGION ──
    // noi_vung | noi_vung_tinh | lien_vung | lien_tinh | lien_vung_dac_biet
    table.string("region", 50).nullable();
    table.string("province_code", 50).nullable();
    table.string("ward_code", 50).nullable();

    // ── WEIGHT ──
    table.integer("min_weight_grams").defaultTo(0);
    table.integer("max_weight_grams").nullable(); // null = không giới hạn

    // ── PRICING: weight_rate mode ──
    table.decimal("rate_per_kg", 12, 2).nullable();

    // ── PRICING: base_step mode ──
    table.decimal("base_fee", 12, 2).nullable();
    table.integer("step_weight_grams").nullable();
    table.decimal("step_fee", 12, 2).nullable();

    // ── CONDITIONS ──
    table.boolean("is_active").defaultTo(true);

    // ── TIME ──
    table.timestamp("start_at").nullable();
    table.timestamp("end_at").nullable();
    table.timestamps(true, true);

    // ── INDEXES ──
    table.index(["shipping_type"]);
    table.index(["pricing_mode"]);
    table.index(["carrier"]);
    table.index(["region"]);
    table.index(["is_active"]);
    table.index(["min_weight_grams", "max_weight_grams"]);

    // ── UNIQUE ──
    table.unique([
      "shipping_type",
      "carrier",
      "region",
      "province_code",
      "ward_code",
      "min_weight_grams",
    ]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("shipping_fee_configs");
};

