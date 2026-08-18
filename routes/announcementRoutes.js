const express = require("express");
const {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  pinAnnouncementComment,
  getMayorDashboard,
  getAnnouncements,
  reactToAnnouncement,
  commentOnAnnouncement,
} = require("../controllers/announcementController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getAnnouncements);
router.get(
  "/dashboard",
  protect,
  authorize("mayor", "admin"),
  getMayorDashboard,
);
router.post(
  "/",
  protect,
  authorize("mayor", "councillor"),
  upload.array("attachments", 4),
  createAnnouncement,
);
router.patch(
  "/:id",
  protect,
  authorize("mayor", "councillor", "admin"),
  upload.array("attachments", 4),
  updateAnnouncement,
);
router.delete(
  "/:id",
  protect,
  authorize("mayor", "councillor", "admin"),
  deleteAnnouncement,
);
router.post("/:id/reactions", protect, reactToAnnouncement);
router.post("/:id/comments", protect, commentOnAnnouncement);
router.patch(
  "/:id/comments/:commentId/pin",
  protect,
  authorize("mayor", "councillor", "admin"),
  pinAnnouncementComment,
);

module.exports = router;
