// models/importRequest.model.js

const db = require("../config/db.config");

class ImportRequestModel {
  static async create(data) {
    const [row] = await db("import_requests").insert(data).returning("id");

    return row.id;
  }
}

module.exports = ImportRequestModel;
