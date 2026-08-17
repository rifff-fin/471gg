const express = require("express");
const {
  createAnnouncement,
  getAnnouncements,
} = require("../controllers/announcementController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAnnouncements);
router.post("/", protect, authorize("mayor", "councillor"), createAnnouncement);

module.exports = router;
