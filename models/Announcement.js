const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true, trim: true },
    authorRole: { type: String, enum: ["mayor", "councillor"], required: true },
    jurisdiction: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    type: {
      type: String,
      enum: ["announcement", "progress_update", "official_response"],
      default: "announcement",
    },
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },
  },
  { timestamps: true },
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ jurisdiction: 1, createdAt: -1 });

module.exports = mongoose.model("Announcement", announcementSchema);
