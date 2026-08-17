const express = require("express");
const router = express.Router();
const {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getNearbyComplaints,
  upvoteComplaint,
  voteComplaint,
  holdComplaint,
  releaseComplaint,
  addComplaintComment,
  replyToComment,
  getComplaintComments,
  addCompletionReport,
  addChatMessage,
  getChatMessages,
  getComplaintLedger,
  getAdminStream,
} = require("../controllers/complaintController");
const upload = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", getAllComplaints);
router.get("/nearby", getNearbyComplaints);
router.get("/my", protect, getMyComplaints);
router.get("/admin/stream", protect, authorize("admin"), getAdminStream);
router.post("/:id/upvote", protect, upvoteComplaint);
router.post("/:id/vote", protect, voteComplaint);
router.post("/:id/hold", protect, authorize("officer", "councillor", "mayor", "admin"), holdComplaint);
router.post("/:id/release", protect, authorize("officer", "councillor", "mayor", "admin"), releaseComplaint);
router.post("/:id/comments", protect, addComplaintComment);
router.post("/:id/comments/:commentId/replies", protect, replyToComment);
router.get("/:id/comments", getComplaintComments);
router.post("/:id/messages", protect, addChatMessage);
router.get("/:id/messages", protect, getChatMessages);
router.get("/:id/ledger", getComplaintLedger);
// Completion reports route removed (feature reverted)

router.post("/", protect, authorize("citizen"), upload.array("attachments", 8), createComplaint);
router.get("/:id", getComplaintById);
router.put("/:id", protect, authorize("citizen"), updateComplaint);
router.delete("/:id", protect, authorize("citizen"), deleteComplaint);

module.exports = router;
