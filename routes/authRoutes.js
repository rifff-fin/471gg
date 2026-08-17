const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.get("/users/:id", getProfile);

module.exports = router;
