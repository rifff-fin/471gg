const Fine = require("../models/Fine");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { uploadBuffer } = require("../services/cloudinary");

const uploadFineEvidence = async (file, folder) => {
  if (!file) return "";
  const result = await uploadBuffer(file.buffer, { folder: `ekotro/fines/${folder}` });
  return result.secure_url;
};

// ===============================
// Police create fine
// ===============================

const createFine = async (req, res) => {
  try {
    console.log("CREATE FINE API HIT");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication user missing",
      });
    }

    const { citizenEmail, violationType, description, fineAmount, location } =
      req.body;

    if (!citizenEmail || !violationType || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Find citizen using email

    const citizen = await User.findOne({
      email: citizenEmail.trim(),
    });

    if (!citizen) {
      return res.status(404).json({
        success: false,
        message: "Citizen not found",
      });
    }

    console.log("CITIZEN FOUND:", citizen._id);

    // Create Fine

    const evidence = await uploadFineEvidence(req.file, "issued-evidence");
    const fine = await Fine.create({
      citizen: citizen._id,

      officer: req.user.id,

      violationType,

      description,

      fineAmount: Number(fineAmount) || 0,

      location,

      evidence,
    });

    console.log("FINE CREATED:", fine._id);

    // Create Citizen Notification

    await Notification.create({
      user: citizen._id,

      title: "New Digital Fine Issued",

      message: `A fine of ৳${fineAmount || 0} has been issued for ${violationType}. Location: ${location}`,

      type: "fine",
    });

    console.log("NOTIFICATION CREATED");

    return res.status(201).json({
      success: true,

      message: "Digital fine issued successfully",

      data: fine,
    });
  } catch (error) {
    console.error("CREATE FINE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// ===============================
// Police view issued fines
// ===============================

const getMyIssuedFines = async (req, res) => {
  try {
    const fines = await Fine.find({
      officer: req.user.id,
    })

      .populate("citizen", "name email")

      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      count: fines.length,

      data: fines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// ===============================
// Citizen view received fines
// ===============================

const getMyFines = async (req, res) => {
  try {
    const fines = await Fine.find({
      citizen: req.user.id,
    })

      .populate("officer", "name email")

      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      count: fines.length,

      data: fines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const disputeFine = async (req, res) => {
  try {
    const reason = req.body.reason?.trim();
    if (!reason || reason.length < 10) return res.status(400).json({ success: false, message: "Explain the dispute in at least 10 characters." });
    const fine = await Fine.findOne({ _id: req.params.id, citizen: req.user.id });
    if (!fine) return res.status(404).json({ success: false, message: "Fine not found." });
    if (fine.status === "Paid" || fine.status === "Cancelled") return res.status(400).json({ success: false, message: "This fine can no longer be disputed." });
    if (fine.disputeStatus === "Submitted") return res.status(409).json({ success: false, message: "This fine already has an open dispute." });
    fine.disputeReason = reason;
    fine.disputeEvidence = await uploadFineEvidence(req.file, "disputes");
    fine.disputeStatus = "Submitted";
    fine.disputedAt = new Date();
    fine.reviewNote = "";
    fine.reviewedAt = null;
    fine.status = "Disputed";
    await fine.save();
    await Notification.create({ user: fine.officer, title: "Fine dispute submitted", message: `${req.user.name || "A citizen"} disputed the fine for ${fine.violationType}.`, type: "fine" });
    return res.status(200).json({ success: true, message: "Your dispute was submitted for police review.", data: fine });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

const reviewDispute = async (req, res) => {
  try {
    const { decision, reviewNote = "" } = req.body;
    if (!["accept", "reject"].includes(decision)) return res.status(400).json({ success: false, message: "Choose whether to accept or reject the dispute." });
    const fine = await Fine.findOne({ _id: req.params.id, officer: req.user.id });
    if (!fine) return res.status(404).json({ success: false, message: "Fine not found." });
    if (fine.disputeStatus !== "Submitted") return res.status(400).json({ success: false, message: "This fine has no dispute awaiting review." });
    const accepted = decision === "accept";
    fine.disputeStatus = accepted ? "Accepted" : "Rejected";
    fine.status = accepted ? "Cancelled" : "Unpaid";
    fine.reviewNote = reviewNote.trim();
    fine.reviewedAt = new Date();
    await fine.save();
    await Notification.create({ user: fine.citizen, title: `Fine dispute ${accepted ? "accepted" : "rejected"}`, message: accepted ? `Your fine for ${fine.violationType} was cancelled after review.` : `Your fine for ${fine.violationType} remains unpaid after review.`, type: "fine" });
    return res.status(200).json({ success: true, message: "Dispute review recorded.", data: fine });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

module.exports = {
  createFine,

  getMyIssuedFines,

  getMyFines,
  disputeFine,
  reviewDispute,
};
