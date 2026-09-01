const express = require("express");
const router = express.Router();
const {
  createComplaint,
  getAllComplaints,
  getOfficerComplaints,
  reviewComplaintByOfficer,
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
  verifyCompletionReport,
  addChatMessage,
  getChatMessages,
  addCrewChatMessage,
  getCrewChatMessages,
  assignCrewToComplaint,
  getComplaintLedger,
  getAdminStream,
  getAdminAnalytics,
} = require("../controllers/complaintController");
const upload = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", getAllComplaints);
router.get("/nearby", getNearbyComplaints);
router.get("/my", protect, getMyComplaints);
router.get(
  "/officer/cases",
  protect,
  authorize("officer", "admin"),
  getOfficerComplaints,
);
router.post(
  "/:id/review",
  protect,
  authorize("officer", "admin"),
  reviewComplaintByOfficer,
);
router.get("/admin/stream", protect, authorize("admin"), getAdminStream);
router.get("/admin/analytics", protect, authorize("admin", "officer"), getAdminAnalytics);
router.post("/:id/upvote", protect, upvoteComplaint);
router.post("/:id/vote", protect, voteComplaint);
router.post(
  "/:id/hold",
  protect,
  authorize("officer", "councillor", "mayor", "admin"),
  holdComplaint,
);
router.post(
  "/:id/release",
  protect,
  authorize("officer", "councillor", "mayor", "admin"),
  releaseComplaint,
);
router.post("/:id/comments", protect, addComplaintComment);
router.post("/:id/comments/:commentId/replies", protect, replyToComment);
router.get("/:id/comments", getComplaintComments);
router.post("/:id/messages", protect, addChatMessage);
router.get("/:id/messages", protect, getChatMessages);
router.post("/:id/crew-messages", protect, authorize("officer", "admin", "field_worker"), addCrewChatMessage);
router.get("/:id/crew-messages", protect, authorize("officer", "admin", "field_worker"), getCrewChatMessages);
router.post("/:id/assignments", protect, authorize("officer", "admin"), assignCrewToComplaint);
router.get("/:id/ledger", getComplaintLedger);
router.post(
  "/:id/reports",
  protect,
  authorize("field_worker", "officer", "admin"),
  upload.fields([
    { name: "beforeImages", maxCount: 5 },
    { name: "afterImages", maxCount: 5 },
  ]),
  addCompletionReport,
);
router.post(
  "/:id/reports/:reportId/verify",
  protect,
  authorize("officer", "admin"),
  verifyCompletionReport,
);

router.post(
  "/",
  protect,
  authorize("citizen"),
  upload.array("attachments", 8),
  createComplaint,
);
router.get("/:id", getComplaintById);
router.put("/:id", protect, authorize("citizen"), updateComplaint);
router.delete("/:id", protect, authorize("citizen"), deleteComplaint);

module.exports = router;
