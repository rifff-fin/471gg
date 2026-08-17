const multer = require("multer");

const storage = multer.memoryStorage();

const imageOnly = (req, file, callback) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return callback(null, true);
  }

  return callback(
    new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname),
  );
};

const upload = multer({
  storage,
  fileFilter: imageOnly,
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 8,
  },
});

module.exports = upload;
