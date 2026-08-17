const express = require("express");

const router = express.Router();

const {
  createCompletionReport,
  getReportsByComplaint,
} = require("../controllers/completionReportController");

const { protect, authorize } = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

router.post(
  "/",

  protect,

  authorize("field_worker"),

  upload.fields([
    {
      name: "beforeImage",
      maxCount: 1,
    },

    {
      name: "afterImage",
      maxCount: 1,
    },
  ]),

  createCompletionReport,
);

router.get(
  "/:id",

  protect,

  getReportsByComplaint,
);

module.exports = router;
