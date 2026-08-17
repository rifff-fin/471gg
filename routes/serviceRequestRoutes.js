const express = require("express");

const router = express.Router();

const {
  createServiceRequest,

  getMyServiceRequests,

  updateServiceRequest,
  getOfficerServiceRequests,
} = require("../controllers/serviceRequestController");

const {
  protect,

  authorize,
} = require("../middleware/authMiddleware");

// Citizen submit request

router.post(
  "/",

  protect,

  authorize("citizen"),

  createServiceRequest,
);

// Citizen track requests

router.get(
  "/my",

  protect,

  authorize("citizen"),

  getMyServiceRequests,
);

// Officer/Admin update

router.patch(
  "/:id",

  protect,

  authorize("officer", "admin"),

  updateServiceRequest,
);

router.get(
  "/officer",
  protect,
  authorize("officer", "admin"),
  getOfficerServiceRequests,
);

module.exports = router;
