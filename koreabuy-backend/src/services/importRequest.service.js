// services/importRequest.service.js

const ImportRequestModel = require("../models/importRequest.model");

const {
  hashUrl,
  generateRequestCode,
  detectSource,
} = require("../utils/importRequest.util");

class ImportRequestService {
  static async createRequest({
    source_url,
    note,
    email,
    phone,
    userId,
  }) {
    if (!source_url) {
      throw new Error("Thiếu link sản phẩm");
    }

    const hash = hashUrl(source_url);
    const source = detectSource(source_url);
    const request_code = generateRequestCode();

    const id = await ImportRequestModel.create({
      user_id: userId ?? null,
      email: email ?? null,
      phone: phone ?? null,
      source,
      source_url,
      source_url_hash: hash,
      request_code,
      note: note ?? null,
      status: "pending",
      requested_at: new Date(),
    });

    return { id, request_code };
  }
}

module.exports = ImportRequestService;
