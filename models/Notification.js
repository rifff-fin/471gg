const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    title: {
      type: String,

      required: true,
    },

    message: {
      type: String,

      required: true,
    },

    type: {
      type: String,
      enum: ["fine", "official_post"],
      default: "fine",
    },

    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      default: null,
    },

    read: {
      type: Boolean,

      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Notification", notificationSchema);
