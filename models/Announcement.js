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
    title: { type: String, trim: true, maxlength: 160, default: "" },
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
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: "" },
          originalName: { type: String, default: "" },
          mimeType: { type: String, default: "" },
        },
      ],
      default: [],
    },
    reactions: {
      type: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          type: { type: String, enum: ["support"], default: "support" },
        },
      ],
      default: [],
    },
    comments: {
      type: [
        {
          author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          authorName: { type: String, required: true },
          authorRole: { type: String, required: true },
          body: { type: String, required: true, trim: true, maxlength: 1000 },
        },
      ],
      default: [],
    },
    pinnedComment: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ jurisdiction: 1, createdAt: -1 });

module.exports = mongoose.model("Announcement", announcementSchema);
