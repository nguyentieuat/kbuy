// services/fileUpload.service.js

const fs = require("fs");
const crypto = require("crypto");
const { Upload } = require("@aws-sdk/lib-storage");

const r2 = require("../config/r2Cloudflare.config");

const BUCKET = "kbuy";

function generateKey(file) {
  const hash = crypto.randomBytes(8).toString("hex");
  return `images/avatar/${hash}-${file.originalname}`;
}

exports.uploadAvatar = async (file) => {
  if (!file) return null;

  const key = generateKey(file);

  const upload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype,
    },
  });

  await upload.done();

  return `${process.env.R2_PUBLIC_URL}/${key}`;
};
