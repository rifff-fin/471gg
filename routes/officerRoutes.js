const express = require("express");
const {
  searchUsers,
  promoteUserToOfficer,
} = require("../controllers/officerController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/users", protect, authorize("officer", "admin"), searchUsers);
router.patch(
  "/users/:id/promote",
  protect,
  authorize("officer", "admin"),
  promoteUserToOfficer,
);

module.exports = router;
