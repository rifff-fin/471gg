const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");

const { protect } = require("../middleware/authMiddleware");

// Get logged in user notifications
router.get("/", protect, async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.query.unread === "true") query.read = false;
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate("complaint", "title")
      .populate("announcement", "title")
      .populate("serviceRequest", "serviceType");

    res.status(200).json({
      success: true,

      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
});

router.get("/summary", protect, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });
    res.status(200).json({ success: true, data: { unreadCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true },
    );
    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found." });
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
