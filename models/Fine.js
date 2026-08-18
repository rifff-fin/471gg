const mongoose = require("mongoose");

const fineSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    violationType: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    fineAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    location: {
      type: String,
      required: true,
    },

    evidence: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Unpaid", "Disputed", "Paid", "Cancelled"],
      default: "Unpaid",
    },
    disputeStatus: { type: String, enum: ["None", "Submitted", "Accepted", "Rejected"], default: "None" },
    disputeReason: { type: String, trim: true, maxlength: 1000, default: "" },
    disputeEvidence: { type: String, default: "" },
    disputedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Fine", fineSchema);
