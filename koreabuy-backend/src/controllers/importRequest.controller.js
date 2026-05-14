// controllers/importRequest.controller.js

const ImportRequestService = require("../services/importRequest.service");

async function createImportRequest(req, res) {
  try {
    const result = await ImportRequestService.createRequest({
      ...req.body,
      userId: req.userId ?? null,
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[createImportRequest]", err.message);

    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

module.exports = { createImportRequest };
