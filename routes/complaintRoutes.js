const express = require("express");
const router = express.Router();

const {
    createComplaint,
    getAllComplaints,
    getComplaintById,
    updateComplaint,
    deleteComplaint,
    getNearbyComplaints,
    upvoteComplaint,
    holdComplaint,
    releaseComplaint,
    addComplaintComment,
    getComplaintComments,
    addCompletionReport,
    addChatMessage,
    getChatMessages,
    getComplaintLedger,
    getAdminStream,
} = require("../controllers/complaintController");
const upload = require("../middleware/uploadMiddleware");

// Create Complaint
router.post("/", upload.array("attachments", 8), createComplaint);

// Get All Complaints
router.get("/", getAllComplaints);

// Nearby Complaints (keep this BEFORE "/:id")
router.get("/nearby", getNearbyComplaints);
router.get("/admin/stream", getAdminStream);

router.post("/:id/upvote", upvoteComplaint);
router.post("/:id/hold", holdComplaint);
router.post("/:id/release", releaseComplaint);
router.post("/:id/comments", addComplaintComment);
router.get("/:id/comments", getComplaintComments);
router.post("/:id/messages", addChatMessage);
router.get("/:id/messages", getChatMessages);
router.get("/:id/ledger", getComplaintLedger);
router.post(
    "/:id/reports",
    upload.fields([
        { name: "beforeImages", maxCount: 5 },
        { name: "afterImages", maxCount: 5 },
    ]),
    addCompletionReport
);

// Get Single Complaint
router.get("/:id", getComplaintById);

// Update Complaint
router.put("/:id", updateComplaint);

// Delete Complaint
router.delete("/:id", deleteComplaint);

module.exports = router;