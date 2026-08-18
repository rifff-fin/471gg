const Announcement = require("../models/Announcement");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { uploadBuffer } = require("../services/cloudinary");
const {
  emitOfficialNotification,
  emitAnnouncementEvent,
  emitUserNotification,
} = require("../services/realtime");

const canManageAnnouncement = (announcement, user) =>
  user?.role === "admin" || String(announcement.author) === String(user?.id);

const uploadAnnouncementImages = async (files = []) => {
  const uploads = [];
  for (const file of files) {
    const result = await uploadBuffer(file.buffer, {
      folder: "ekotro/announcements",
      mimeType: file.mimetype,
    });
    uploads.push({
      url: result.secure_url,
      publicId: result.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }
  return uploads;
};

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
      return res.status(400).json({
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

    const images = await uploadAnnouncementImages(req.files || []);
    const announcement = await Announcement.create({
      author: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      jurisdiction,
      title: title?.trim() || "",
      body: body.trim(),
      type,
      complaint: complaintId || null,
      images,
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

const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    if (!canManageAnnouncement(announcement, req.user))
      return res.status(403).json({
        success: false,
        message: "You can only edit your own official posts.",
      });
    const { title, body, type } = req.body;
    if (!body?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Write a message before saving." });
    if (
      !["announcement", "progress_update", "official_response"].includes(type)
    )
      return res
        .status(400)
        .json({ success: false, message: "Choose a valid update type." });
    announcement.title = title?.trim() || "";
    announcement.body = body.trim();
    announcement.type = type;
    const newImages = await uploadAnnouncementImages(req.files || []);
    if (newImages.length) announcement.images.push(...newImages);
    announcement.editedAt = new Date();
    const updated = await announcement.save();
    emitAnnouncementEvent("announcement:updated", { announcement: updated });
    res.status(200).json({
      success: true,
      message: "Official post updated.",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    if (!canManageAnnouncement(announcement, req.user))
      return res.status(403).json({
        success: false,
        message: "You can only delete your own official posts.",
      });
    await announcement.deleteOne();
    emitAnnouncementEvent("announcement:deleted", {
      announcementId: String(req.params.id),
    });
    res.status(200).json({ success: true, message: "Official post deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const pinAnnouncementComment = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });
    if (!canManageAnnouncement(announcement, req.user))
      return res.status(403).json({
        success: false,
        message: "You can only manage comments on your own posts.",
      });
    const comment = announcement.comments.id(req.params.commentId);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "Comment not found." });
    announcement.pinnedComment = comment._id;
    const updated = await announcement.save();
    emitAnnouncementEvent("announcement:updated", { announcement: updated });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMayorDashboard = async (req, res) => {
  try {
    const jurisdiction = req.user.jurisdiction?.trim();
    if (!jurisdiction)
      return res.status(400).json({
        success: false,
        message:
          "Your mayor account needs a jurisdiction before it can monitor cases.",
      });
    const [complaints, posts] = await Promise.all([
      Complaint.find({ ward: jurisdiction })
        .sort({ priorityScore: -1, upvotes: -1, createdAt: -1 })
        .limit(100)
        .select(
          "title category status ward priorityLevel priorityScore upvotes comments createdAt beforeAfterReports",
        ),
      Announcement.find({ author: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50),
    ]);
    const open = complaints.filter(
      (item) => !["Resolved", "Closed", "Rejected"].includes(item.status),
    );
    const engagement = posts.reduce(
      (total, post) => total + post.reactions.length + post.comments.length,
      0,
    );
    res.status(200).json({
      success: true,
      data: {
        jurisdiction,
        stats: {
          totalCases: complaints.length,
          openCases: open.length,
          urgentCases: open.filter((item) =>
            ["High", "Critical"].includes(item.priorityLevel),
          ).length,
          resolvedCases: complaints.filter((item) =>
            ["Resolved", "Closed"].includes(item.status),
          ).length,
          officialPosts: posts.length,
          engagement,
        },
        cases: complaints,
        posts,
      },
    });
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
    res.status(200).json({
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
    if (req.user.role === "mayor") {
      announcement.pinnedComment =
        announcement.comments[announcement.comments.length - 1]._id;
    }
    await announcement.save();
    if (req.user.role === "mayor" && announcement.complaint) {
      const complaint = await Complaint.findById(announcement.complaint).select(
        "assignedOfficer title",
      );
      if (complaint) {
        const recipients = complaint.assignedOfficer
          ? [complaint.assignedOfficer]
          : (
              await User.find({ role: { $in: ["officer", "admin"] } }).select(
                "_id",
              )
            ).map((user) => user._id);
        const notification = {
          title: "Mayor commented on a case update",
          message: `${req.user.name} commented on the official update linked to “${complaint.title}”.`,
          type: "case_update",
        };
        await Promise.all(
          recipients.map(async (user) => {
            await Notification.create({
              user,
              complaint: complaint._id,
              ...notification,
            });
            emitUserNotification(user, {
              ...notification,
              complaintId: String(complaint._id),
            });
          }),
        );
      }
    }
    emitAnnouncementEvent("announcement:updated", { announcement });
    res.status(201).json({
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
  updateAnnouncement,
  deleteAnnouncement,
  pinAnnouncementComment,
  getMayorDashboard,
  reactToAnnouncement,
  commentOnAnnouncement,
};
