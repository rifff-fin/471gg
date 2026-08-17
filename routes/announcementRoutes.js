const express = require("express");
const {
  createAnnouncement,
  getAnnouncements,
  reactToAnnouncement,
  commentOnAnnouncement,
} = require("../controllers/announcementController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAnnouncements);
router.post("/", protect, authorize("mayor", "councillor"), createAnnouncement);
router.post("/:id/reactions", protect, reactToAnnouncement);
router.post("/:id/comments", protect, commentOnAnnouncement);

module.exports = router;
