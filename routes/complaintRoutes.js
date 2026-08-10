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
} = require("../controllers/complaintController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");


// ================= PUBLIC ROUTES =================

// Browse all public complaints
router.get("/", getAllComplaints);

// Nearby complaints
// Must remain BEFORE "/:id"
router.get("/nearby", getNearbyComplaints);


// ================= CITIZEN ROUTES =================

// Create complaint
router.post(
  "/",
  protect,
  authorize("citizen"),
  createComplaint
);

// Get logged-in citizen's complaints
// Must remain BEFORE "/:id"
router.get(
  "/my",
  protect,
  authorize("citizen"),
  getMyComplaints
);


// ================= SINGLE COMPLAINT =================

router.get("/:id", getComplaintById);


// ================= OWNERSHIP-PROTECTED ROUTES =================

router.put(
  "/:id",
  protect,
  authorize("citizen"),
  updateComplaint
);

router.delete(
  "/:id",
  protect,
  authorize("citizen"),
  deleteComplaint
);


module.exports = router;