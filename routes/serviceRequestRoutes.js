const express = require("express");

const router = express.Router();

const {
  createServiceRequest,

  getMyServiceRequests,

  updateServiceRequest,
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

  authorize("admin", "police"),

  updateServiceRequest,
);

module.exports = router;
