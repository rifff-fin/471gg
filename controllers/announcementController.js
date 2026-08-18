const Announcement = require("../models/Announcement");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitOfficialNotification } = require("../services/realtime");

const getAnnouncements = async (req, res) => {
  try {
    const query = req.query.jurisdiction
      ? { jurisdiction: req.query.jurisdiction }
      : {};
    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("complaint", "title");

    res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    // VIVA: Server-side validation makes the official-post policy enforceable.
    const { title, body, type = "announcement", complaintId } = req.body;
    const jurisdiction = req.user.jurisdiction?.trim();

    if (!body?.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Write a message before publishing.",
        });
    }

    if (!jurisdiction) {
      return res.status(400).json({
        success: false,
        message: "Your official account needs a jurisdiction before posting.",
      });
    }

    if (complaintId) {
      // VIVA: An official cannot attach a complaint from another jurisdiction.
      const complaint = await Complaint.findById(complaintId);
      if (!complaint)
        return res
          .status(404)
          .json({ success: false, message: "Complaint not found." });
      if (complaint.ward && complaint.ward !== jurisdiction) {
        return res.status(403).json({
          success: false,
          message: "You can only respond within your jurisdiction.",
        });
      }
    }

    const announcement = await Announcement.create({
      author: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      jurisdiction,
      title: title?.trim() || "",
      body: body.trim(),
      type,
      complaint: complaintId || null,
    });

    const populatedAnnouncement = await announcement.populate(
      "complaint",
      "title",
    );
    const citizens = await User.find({ role: "citizen" }).select("_id").lean();
    if (citizens.length) {
      await Notification.insertMany(
        citizens.map((citizen) => ({
          user: citizen._id,
          announcement: announcement._id,
          title: `New post from ${req.user.name}`,
          message: title?.trim() || body.trim().slice(0, 120),
          type: "official_post",
        })),
        { ordered: false },
      );
    }
    // VIVA: Persisted notifications work after refresh; Socket.IO updates live users.
    emitOfficialNotification({
      announcement: populatedAnnouncement,
      message: `${req.user.name} shared a new post for ${jurisdiction}.`,
    });

    res.status(201).json({ success: true, data: populatedAnnouncement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reactToAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    const existingReaction = announcement.reactions.find(
      (reaction) => String(reaction.user) === req.user.id,
    );
    if (existingReaction) announcement.reactions.pull(existingReaction._id);
    else announcement.reactions.push({ user: req.user.id, type: "support" });
    await announcement.save();
    res
      .status(200)
      .json({
        success: true,
        data: {
          reactions: announcement.reactions.length,
          supported: !existingReaction,
        },
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const commentOnAnnouncement = async (req, res) => {
  try {
    const body = req.body.body?.trim();
    if (!body)
      return res
        .status(400)
        .json({ success: false, message: "Write a comment before posting." });
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    announcement.comments.push({
      author: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      body,
    });
    await announcement.save();
    res
      .status(201)
      .json({
        success: true,
        data: announcement.comments[announcement.comments.length - 1],
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  reactToAnnouncement,
  commentOnAnnouncement,
};
