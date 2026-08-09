const express = require("express");
const router = express.Router();

const {
    createComplaint,
    getAllComplaints,
    getComplaintById,
    updateComplaint,
    deleteComplaint,
    getNearbyComplaints,
} = require("../controllers/complaintController");

// Create Complaint
router.post("/", createComplaint);

// Get All Complaints
router.get("/", getAllComplaints);

// Nearby Complaints (keep this BEFORE "/:id")
router.get("/nearby", getNearbyComplaints);

// Get Single Complaint
router.get("/:id", getComplaintById);

// Update Complaint
router.put("/:id", updateComplaint);

// Delete Complaint
router.delete("/:id", deleteComplaint);

module.exports = router;