const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 8,
  },
});

module.exports = upload;