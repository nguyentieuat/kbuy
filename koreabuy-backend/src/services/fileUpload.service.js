// services/fileUpload.service.js

exports.uploadAvatar = (file) => {
  if (!file) return null;

  return `/uploads/avatars/${file.filename}`;
};
