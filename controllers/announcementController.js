const Announcement = require("../models/Announcement");
const Complaint = require("../models/Complaint");
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
    const { title, body, type = "announcement", complaintId } = req.body;
    const jurisdiction = req.user.jurisdiction?.trim();

    if (!title?.trim() || !body?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "A title and message are required." });
    }

    if (!jurisdiction) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Your official account needs a jurisdiction before posting.",
        });
    }

    if (complaintId) {
      const complaint = await Complaint.findById(complaintId);
      if (!complaint)
        return res
          .status(404)
          .json({ success: false, message: "Complaint not found." });
      if (complaint.ward && complaint.ward !== jurisdiction) {
        return res
          .status(403)
          .json({
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
      title: title.trim(),
      body: body.trim(),
      type,
      complaint: complaintId || null,
    });

    const populatedAnnouncement = await announcement.populate(
      "complaint",
      "title",
    );
    emitOfficialNotification({
      announcement: populatedAnnouncement,
      message: `${req.user.name} posted an official update for ${jurisdiction}.`,
    });

    res.status(201).json({ success: true, data: populatedAnnouncement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAnnouncements, createAnnouncement };
