const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    stage: {
      type: String,
      enum: ["complaint", "before", "after"],
      default: "complaint",
    },
  },
  { _id: false },
);

const ledgerEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    message: { type: String, required: true },
    actor: { type: String, default: "System" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false, timestamps: true },
);

const replySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: "citizen" },
    body: { type: String, required: true },
  },
  { timestamps: true },
);

const commentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true },
    authorRole: { type: String, default: "citizen" },
    body: { type: String, required: true },
    channel: {
      type: String,
      enum: ["public", "internal", "private"],
      default: "public",
    },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true },
);

const voteSchema = new mongoose.Schema(
  {
    supporterKey: { type: String, required: true },
    supporterLabel: { type: String, default: "Anonymous" },
    supporterRole: { type: String, default: "citizen" },
    voteType: { type: String, enum: ["up", "down"], required: true },
    actor: { type: String, default: "Citizen" },
  },
  { _id: false, timestamps: true },
);

const reportSchema = new mongoose.Schema(
  {
    note: { type: String, default: "" },
    submittedBy: { type: String, default: "Field Worker" },
    submittedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    beforeImages: { type: [mediaSchema], default: [] },
    afterImages: { type: [mediaSchema], default: [] },
    verificationStatus: {
      type: String,
      enum: ["Submitted", "Verified", "Returned"],
      default: "Submitted",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    verificationNote: { type: String, default: "" },
  },
  { timestamps: true },
);

const officerNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    action: { type: String, required: true },
    body: { type: String, required: true, trim: true, maxlength: 1500 },
    signature: { type: String, required: true },
  },
  { timestamps: true },
);

const complaintSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    citizenName: { type: String, required: true },
    citizenEmail: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "General" },
    description: { type: String, required: true, trim: true },
    ward: { type: String, default: "" },
    department: { type: String, default: "Pending" },
    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Resolved",
        "Closed",
        "Held Pending",
        "Rejected",
      ],
      default: "Pending",
    },
    assigned: { type: Boolean, default: false },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    holdState: {
      type: String,
      enum: ["ACTIVE", "HELD_PENDING", "RELEASED"],
      default: "ACTIVE",
    },
    holdReason: { type: String, default: "" },
    priorityLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    priorityScore: { type: Number, default: 0 },
    severityCoefficient: { type: Number, default: 1 },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    supporters: { type: [String], default: [] },
    votes: { type: [voteSchema], default: [] },
    images: { type: [mediaSchema], default: [] },
    beforeAfterReports: { type: [reportSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    chatMessages: { type: [commentSchema], default: [] },
    crewChatMessages: { type: [commentSchema], default: [] },
    publicLedger: { type: [ledgerEntrySchema], default: [] },
    officerNotes: { type: [officerNoteSchema], default: [] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
  },
  { timestamps: true },
);

complaintSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Complaint", complaintSchema);
