const Complaint = require("../models/Complaint");
const User = require("../models/User");
const mongoose = require("mongoose");
const { uploadBuffer } = require("../services/cloudinary");
const {
  calculateComplaintPriority,
  getPriorityLabel,
} = require("../services/priority");
const { emitComplaintEvent, emitAdminAlert } = require("../services/realtime");
const { emitUserNotification } = require("../services/realtime");
const Notification = require("../models/Notification");

const SLA_THRESHOLD_HOURS = Number(process.env.SLA_THRESHOLD_HOURS || 24);
const HEATMAP_PRIORITY_THRESHOLD = Number(
  process.env.HEATMAP_PRIORITY_THRESHOLD || 60,
);

const departmentByCategory = {
  "Road & Infrastructure": "Public Works",
  "Waste Management": "Waste Management",
  "Water Supply": "Water Supply",
  Electricity: "Electrical Services",
  "Public Safety": "Public Safety",
  Sanitation: "Sanitation",
};

const routeDepartment = (category) =>
  departmentByCategory[category] || "Citizen Services";
const authorityRoles = new Set([
  "officer",
  "field_worker",
  "councillor",
  "mayor",
  "admin",
]);
const canAccessPrivateChat = (complaint, user) => {
  const ownerId = complaint.createdBy?._id || complaint.createdBy;
  return String(ownerId) === String(user?.id) || authorityRoles.has(user?.role);
};

const isTerminalStatus = (status = "") =>
  ["Resolved", "Closed"].includes(status);

const getComplaintAgeHours = (complaint = {}) => {
  const createdAt = complaint.createdAt
    ? new Date(complaint.createdAt).getTime()
    : Date.now();
  return Math.max((Date.now() - createdAt) / 3600000, 0);
};

const isSlaBreached = (complaint) =>
  !isTerminalStatus(complaint.status) &&
  getComplaintAgeHours(complaint) >= SLA_THRESHOLD_HOURS;

const buildHeatmapHotspots = (complaints = []) => {
  const buckets = new Map();

  complaints
    .filter((complaint) => !isTerminalStatus(complaint.status))
    .filter(
      (complaint) =>
        Number(complaint.priorityScore || 0) >= HEATMAP_PRIORITY_THRESHOLD,
    )
    .forEach((complaint) => {
      const coordinates = complaint?.location?.coordinates || [];
      if (!Array.isArray(coordinates) || coordinates.length !== 2) return;

      const [lng, lat] = coordinates.map(Number);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const wardKey = complaint.ward?.trim();
      const geoKey = lat.toFixed(3) + ":" + lng.toFixed(3);
      const bucketKey = wardKey || geoKey;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          key: bucketKey,
          ward: wardKey || "Unassigned",
          center: { lat, lng },
          complaintCount: 0,
          avgPriorityScore: 0,
          complaintIds: [],
        });
      }

      const bucket = buckets.get(bucketKey);
      bucket.complaintCount += 1;
      bucket.avgPriorityScore += Number(complaint.priorityScore || 0);
      bucket.complaintIds.push(String(complaint._id));
    });

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      avgPriorityScore: Number(
        (bucket.avgPriorityScore / Math.max(bucket.complaintCount, 1)).toFixed(
          2,
        ),
      ),
    }))
    .sort((left, right) => {
      if (right.complaintCount !== left.complaintCount)
        return right.complaintCount - left.complaintCount;
      return right.avgPriorityScore - left.avgPriorityScore;
    });
};

const buildAdminStreamSnapshot = (complaints = []) => {
  const breachedComplaints = complaints
    .filter(isSlaBreached)
    .map((complaint) => ({
      complaintId: String(complaint._id),
      title: complaint.title,
      ward: complaint.ward || "Unassigned",
      status: complaint.status,
      priorityScore: Number(complaint.priorityScore || 0),
      upvotes: Number(complaint.upvotes || 0),
      ageHours: Number(getComplaintAgeHours(complaint).toFixed(2)),
      location: complaint.location,
    }))
    .sort((left, right) => right.ageHours - left.ageHours);

  return {
    generatedAt: new Date().toISOString(),
    thresholdHours: SLA_THRESHOLD_HOURS,
    breachCount: breachedComplaints.length,
    breaches: breachedComplaints,
    hotspots: buildHeatmapHotspots(complaints),
  };
};

const publishAdminStream = async () => {
  const complaints = await Complaint.find().select(
    "title ward status priorityScore upvotes location createdAt",
  );
  const snapshot = buildAdminStreamSnapshot(complaints);

  emitComplaintEvent("dashboard:heatmap", {
    generatedAt: snapshot.generatedAt,
    thresholdHours: snapshot.thresholdHours,
    hotspots: snapshot.hotspots,
  });

  snapshot.breaches.forEach((breach) => {
    emitAdminAlert({
      complaintId: breach.complaintId,
      type: "sla-breach",
      message:
        breach.title +
        " exceeded SLA by " +
        breach.ageHours +
        "h in " +
        breach.ward +
        ".",
      ward: breach.ward,
      priorityScore: breach.priorityScore,
      ageHours: breach.ageHours,
    });
  });

  return snapshot;
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const normalizeLocation = (body = {}) => {
  const rawLat =
    body.latitude ?? body.lat ?? body.locationLat ?? body.location?.lat;
  const rawLng =
    body.longitude ?? body.lng ?? body.locationLng ?? body.location?.lng;
  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (
    rawLat !== "" &&
    rawLng !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  ) {
    return { type: "Point", coordinates: [lng, lat] };
  }

  const parsedLocation = parseMaybeJson(body.location);
  if (
    parsedLocation &&
    parsedLocation.type === "Point" &&
    Array.isArray(parsedLocation.coordinates) &&
    parsedLocation.coordinates.length === 2
  ) {
    const [parsedLng, parsedLat] = parsedLocation.coordinates.map(Number);
    if (
      Number.isFinite(parsedLat) &&
      Number.isFinite(parsedLng) &&
      Math.abs(parsedLat) <= 90 &&
      Math.abs(parsedLng) <= 180
    ) {
      return { type: "Point", coordinates: [parsedLng, parsedLat] };
    }
  }

  return null;
};

const getSupporterKey = (req, complaintId) => {
  return req.user?.id || `${complaintId}-anonymous`;
};

const toMediaList = async (files = [], stage = "complaint") => {
  const uploads = [];

  for (const file of files) {
    // VIVA: Cloudinary returns a secure URL and public ID; MongoDB stores metadata only.
    const result = await uploadBuffer(file.buffer, {
      folder: "ekotro/" + stage,
      mimeType: file.mimetype,
    });

    uploads.push({
      url: result.secure_url,
      publicId: result.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      stage,
    });
  }

  return uploads;
};

const rebalancePriority = async (complaint) => {
  complaint.priorityScore = calculateComplaintPriority(complaint);
  complaint.priorityLevel = getPriorityLabel(complaint.priorityScore);
  return complaint;
};

const createComplaint = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { title, description } = req.body;
    const location = normalizeLocation(req.body);

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, description and location are required",
      });
    }

    const attachments = await toMediaList(req.files || [], "complaint");
    const complaint = await Complaint.create({
      createdBy: req.user.id,
      citizenName: req.user.name || req.body.citizenName || "Citizen",
      citizenEmail:
        req.user.email || req.body.citizenEmail || "anonymous@example.com",
      title,
      category: req.body.category || "General",
      description,
      ward: req.body.ward || "",
      department: routeDepartment(req.body.category || "General"),
      status: req.body.status || "Pending",
      priorityLevel: req.body.priorityLevel || "Medium",
      severityCoefficient: Number(req.body.severityCoefficient || 1),
      location,
      images: attachments,
      publicLedger: [
        {
          action: "complaint_created",
          message: "Complaint submitted and added to the public ledger.",
          actor: req.user.name || req.body.citizenName || "Citizen",
          metadata: { category: req.body.category || "General" },
        },
      ],
    });

    await rebalancePriority(complaint);
    await complaint.save();

    emitComplaintEvent("complaint:created", {
      complaintId: complaint._id,
      complaint,
    });
    await publishAdminStream();

    res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    if (req.query.ward) query.ward = req.query.ward;

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { ward: searchRegex },
      ];
    }

    if (req.query.fromDate || req.query.toDate) {
      query.createdAt = {};
      if (req.query.fromDate) {
        query.createdAt.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        const endDate = new Date(req.query.toDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const complaints = await Complaint.find(query).sort({
      priorityScore: -1,
      createdAt: -1,
    });
    res
      .status(200)
      .json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOfficerComplaints = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.search?.trim()) {
      const search = new RegExp(req.query.search.trim(), "i");
      query.$or = [
        { title: search },
        { description: search },
        { citizenName: search },
        { citizenEmail: search },
        { ward: search },
      ];
    }
    const complaints = await Complaint.find(query)
      .populate("createdBy", "name email")
      .populate("assignedOfficer", "name email")
      .sort({ priorityScore: -1, comments: -1, createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reviewComplaintByOfficer = async (req, res) => {
  try {
    const { action, note } = req.body;
    const actions = {
      approve: "In Progress",
      reject: "Rejected",
      hold: "Held Pending",
      resolve: "Resolved",
      close: "Closed",
      progress: "In Progress",
    };
    if (!actions[action])
      return res
        .status(400)
        .json({ success: false, message: "Choose a valid officer action." });
    if (!note?.trim())
      return res.status(400).json({
        success: false,
        message: "A signed officer note is required for every decision.",
      });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found." });
    const status = actions[action];
    const signature = `${req.user.name} · Municipal Officer · ${new Date().toLocaleString("en-BD")}`;
    complaint.status = status;
    complaint.assigned = true;
    complaint.assignedOfficer = req.user.id;
    if (action === "hold") {
      complaint.holdState = "HELD_PENDING";
      complaint.holdReason = note.trim();
    }
    if (
      ["approve", "progress", "resolve", "close", "reject"].includes(action)
    ) {
      complaint.holdState = "ACTIVE";
      if (action !== "hold") complaint.holdReason = "";
    }
    complaint.officerNotes.push({
      author: req.user.id,
      authorName: req.user.name,
      action,
      body: note.trim(),
      signature,
    });
    complaint.publicLedger.push({
      action: `officer_${action}`,
      message: note.trim(),
      actor: req.user.name,
      metadata: { status, signature },
    });
    const updated = await complaint.save();
    if (mongoose.isValidObjectId(complaint.createdBy)) {
      await Notification.create({
        user: complaint.createdBy,
        title: `Your complaint is ${status}`,
        message: `${req.user.name}: ${note.trim()}`,
        type: "case_update",
      });
      emitUserNotification(complaint.createdBy, {
        title: `Complaint ${status}`,
        message: `${req.user.name}: ${note.trim()}`,
        complaintId: String(complaint._id),
      });
    }
    emitComplaintEvent("complaint:updated", {
      complaintId: updated._id,
      complaint: updated,
    });
    await publishAdminStream();
    res.status(200).json({
      success: true,
      message: `Complaint marked ${status}.`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });
    res
      .status(200)
      .json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate(
      "createdBy",
      "name role avatar bio ward",
    );
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    if (
      !complaint.createdBy ||
      complaint.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own complaint",
      });
    }
    if (complaint.assigned)
      return res.status(403).json({
        success: false,
        message: "Complaint already assigned. Update not allowed.",
      });

    const allowedUpdates = [
      "title",
      "category",
      "description",
      "ward",
      "priorityLevel",
      "severityCoefficient",
      "department",
      "status",
      "location",
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        complaint[field] =
          field === "severityCoefficient"
            ? Number(req.body[field])
            : parseMaybeJson(req.body[field]);
      }
    });

    if (
      req.body.location ||
      req.body.latitude ||
      req.body.longitude ||
      req.body.lat ||
      req.body.lng
    ) {
      const location = normalizeLocation(req.body);
      if (location) complaint.location = location;
    }

    await rebalancePriority(complaint);
    complaint.publicLedger.push({
      action: "complaint_updated",
      message: "Complaint details were updated.",
      actor: req.body.actor || req.user?.name || "System",
      metadata: {
        fields: allowedUpdates.filter((field) => req.body[field] !== undefined),
      },
    });

    const updatedComplaint = await complaint.save();
    emitComplaintEvent("complaint:updated", {
      complaintId: updatedComplaint._id,
      complaint: updatedComplaint,
    });
    await publishAdminStream();

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    if (
      !complaint.createdBy ||
      complaint.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own complaint",
      });
    }
    if (complaint.assigned)
      return res.status(403).json({
        success: false,
        message: "Complaint already assigned. Delete not allowed.",
      });

    await complaint.deleteOne();
    emitComplaintEvent("complaint:deleted", { complaintId: req.params.id });
    await publishAdminStream();
    res
      .status(200)
      .json({ success: true, message: "Complaint deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getNearbyComplaints = async (req, res) => {
  try {
    const { lng, lat, distance } = req.query;
    if (!lng || !lat || !distance) {
      return res.status(400).json({
        success: false,
        message: "Longitude, latitude and distance are required",
      });
    }

    const complaints = await Complaint.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(distance),
        },
      },
    });
    res
      .status(200)
      .json({ success: true, count: complaints.length, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const recordVote = async (complaint, type, req) => {
  const supporterKey = getSupporterKey(req, complaint._id);

  if (complaint.supporters.includes(supporterKey)) {
    return { error: "You already voted on this complaint.", status: 409 };
  }

  complaint.supporters.push(supporterKey);
  complaint.votes.push({
    supporterKey,
    supporterLabel: req.user?.name || "Verified citizen",
    supporterRole: req.user?.role || "citizen",
    voteType: type,
    actor: req.user?.name || "Verified citizen",
  });

  if (type === "up") {
    complaint.upvotes += 1;
  } else if (type === "down") {
    complaint.downvotes += 1;
  }

  complaint.publicLedger.push({
    action: type === "up" ? "complaint_upvoted" : "complaint_downvoted",
    message:
      type === "up"
        ? "A citizen supported this complaint."
        : "A citizen downvoted this complaint.",
    actor: req.body.actor || req.user?.name || "Citizen",
    metadata: {
      supporterKey,
      voteType: type,
      upvotes: complaint.upvotes,
      downvotes: complaint.downvotes,
    },
  });

  await rebalancePriority(complaint);
  const updatedComplaint = await complaint.save({ validateBeforeSave: false });
  return { updatedComplaint };
};

const voteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const type = String(req.body.type || "up").toLowerCase();
    if (!["up", "down"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Vote type must be 'up' or 'down'." });
    }

    const result = await recordVote(complaint, type, req);
    if (result?.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    const updatedComplaint = result.updatedComplaint;
    emitComplaintEvent("complaint:voted", {
      complaintId: updatedComplaint._id,
      complaint: updatedComplaint,
    });
    emitAdminAlert({
      complaintId: updatedComplaint._id,
      type: "priority-updated",
      priorityScore: updatedComplaint.priorityScore,
      message: `${updatedComplaint.title} priority score is now ${updatedComplaint.priorityScore}.`,
    });
    await publishAdminStream();

    res.status(200).json({
      success: true,
      message: "Vote recorded successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upvoteComplaint = async (req, res) => {
  req.body.type = "up";
  return voteComplaint(req, res);
};

const holdComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    const reason = req.body.reason?.trim();
    if (!reason)
      return res.status(400).json({
        success: false,
        message:
          "A written rationale is required to place a complaint on hold.",
      });

    complaint.status = "Held Pending";
    complaint.holdState = "HELD_PENDING";
    complaint.holdReason = reason;
    complaint.publicLedger.push({
      action: "complaint_held",
      message: "Complaint placed on hold: " + reason,
      actor: req.body.actor || req.user?.name || "Ward Officer",
      metadata: { reason },
    });

    await rebalancePriority(complaint);
    const updatedComplaint = await complaint.save();
    emitComplaintEvent("complaint:held", {
      complaintId: updatedComplaint._id,
      complaint: updatedComplaint,
    });
    emitAdminAlert({
      complaintId: updatedComplaint._id,
      type: "held-pending",
      message: updatedComplaint.title + " was moved to HELD_PENDING.",
    });
    await publishAdminStream();

    res.status(200).json({
      success: true,
      message: "Complaint placed on hold successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const releaseComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });

    complaint.holdState = "RELEASED";
    complaint.holdReason = "";
    complaint.status = req.body.status || "Pending";
    complaint.publicLedger.push({
      action: "complaint_released",
      message: "Complaint hold was released.",
      actor: req.body.actor || req.user?.name || "Ward Officer",
    });

    await rebalancePriority(complaint);
    const updatedComplaint = await complaint.save();
    emitComplaintEvent("complaint:released", {
      complaintId: updatedComplaint._id,
      complaint: updatedComplaint,
    });
    await publishAdminStream();

    res.status(200).json({
      success: true,
      message: "Complaint released successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addComplaintComment = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    const body = req.body.body?.trim();
    if (!body)
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });

    const comment = {
      authorId: req.user.id,
      authorName: req.user?.name || "Verified citizen",
      authorRole: req.user?.role || "citizen",
      body,
      channel: "public",
    };

    complaint.comments.push(comment);
    complaint.publicLedger.push({
      action: "complaint_commented",
      message: comment.body,
      actor: comment.authorName,
      metadata: { channel: comment.channel },
    });

    const updatedComplaint = await complaint.save();
    const storedComment =
      updatedComplaint.comments[updatedComplaint.comments.length - 1];
    emitComplaintEvent("complaint:commented", {
      complaintId: updatedComplaint._id,
      comment: storedComment,
    });
    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: storedComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getComplaintComments = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).select(
      "comments",
    );
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    res.status(200).json({
      success: true,
      count: complaint.comments.length,
      data: complaint.comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addCompletionReport = async (req, res) => {
  try {
    // VIVA: A report must contain both before and after evidence for one real complaint.
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });

    const beforeImages = await toMediaList(
      req.files?.beforeImages || [],
      "before",
    );
    const afterImages = await toMediaList(
      req.files?.afterImages || [],
      "after",
    );
    if (!beforeImages.length || !afterImages.length) {
      return res.status(400).json({
        success: false,
        message: "Upload at least one before image and one after image.",
      });
    }
    const report = {
      note: req.body.note || "",
      submittedBy: req.user?.name || "Field Worker",
      submittedById: req.user?.id || null,
      beforeImages,
      afterImages,
    };

    complaint.beforeAfterReports.push(report);
    complaint.status = req.body.status || complaint.status || "In Progress";
    complaint.publicLedger.push({
      action: "completion_report_uploaded",
      message: "Before-and-after completion report uploaded.",
      actor: report.submittedBy,
      metadata: {
        beforeImages: beforeImages.length,
        afterImages: afterImages.length,
      },
    });

    const updatedComplaint = await complaint.save();
    const savedReport =
      updatedComplaint.beforeAfterReports[
        updatedComplaint.beforeAfterReports.length - 1
      ];
    const officerRecipients = mongoose.isValidObjectId(
      updatedComplaint.assignedOfficer,
    )
      ? [updatedComplaint.assignedOfficer]
      : (
          await User.find({ role: { $in: ["officer", "admin"] } }).select("_id")
        ).map((user) => user._id);
    if (officerRecipients.length) {
      const notification = {
        title: "Field work ready for verification",
        message: `${report.submittedBy} uploaded before-and-after evidence for “${updatedComplaint.title}”.`,
        type: "case_update",
      };
      await Promise.all(
        officerRecipients.map(async (user) => {
          await Notification.create({ user, ...notification });
          emitUserNotification(user, {
            ...notification,
            complaintId: String(updatedComplaint._id),
          });
        }),
      );
    }
    emitComplaintEvent("complaint:report-uploaded", {
      complaintId: updatedComplaint._id,
      complaint: updatedComplaint,
    });
    emitAdminAlert({
      complaintId: updatedComplaint._id,
      type: "report-uploaded",
      message: updatedComplaint.title + " now has a completion report.",
    });
    await publishAdminStream();
    res.status(201).json({
      success: true,
      message: "Completion report uploaded successfully",
      data: { complaint: updatedComplaint, report: savedReport },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyCompletionReport = async (req, res) => {
  try {
    // VIVA: The officer's signed note is required for either approval or return.
    const action = req.body.action;
    const note = req.body.note?.trim();
    if (!["verify", "return"].includes(action) || !note) {
      return res.status(400).json({
        success: false,
        message: "Choose verify or return and include a signed review note.",
      });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    const report = complaint.beforeAfterReports.id(req.params.reportId);
    if (!report)
      return res
        .status(404)
        .json({ success: false, message: "Completion report not found" });

    const verified = action === "verify";
    // VIVA: Approval resolves the complaint; return keeps it in progress for the worker.
    report.verificationStatus = verified ? "Verified" : "Returned";
    report.verifiedBy = req.user.id;
    report.verifiedAt = new Date();
    report.verificationNote = note;
    complaint.assigned = true;
    complaint.assignedOfficer = req.user.id;
    complaint.status = verified ? "Resolved" : "In Progress";
    complaint.publicLedger.push({
      action: verified
        ? "completion_report_verified"
        : "completion_report_returned",
      message: note,
      actor: req.user.name,
      metadata: { reportId: String(report._id), status: complaint.status },
    });
    const updatedComplaint = await complaint.save();
    const message = verified
      ? `${req.user.name} verified the completed work for “${updatedComplaint.title}”.`
      : `${req.user.name} returned the work report for “${updatedComplaint.title}”: ${note}`;
    const recipients = [
      report.submittedById,
      updatedComplaint.createdBy,
    ].filter(
      (id, index, list) =>
        mongoose.isValidObjectId(id) &&
        list.findIndex((candidate) => String(candidate) === String(id)) ===
          index,
    );
    await Promise.all(
      recipients.map(async (user) => {
        await Notification.create({
          user,
          title: verified
            ? "Work marked complete"
            : "Work report needs attention",
          message,
          type: "case_update",
        });
        emitUserNotification(user, {
          title: verified
            ? "Work marked complete"
            : "Work report needs attention",
          message,
          complaintId: String(updatedComplaint._id),
        });
      }),
    );
    emitComplaintEvent("complaint:updated", {
      complaintId: updatedComplaint._id,
      complaint: updatedComplaint,
    });
    await publishAdminStream();
    res.status(200).json({
      success: true,
      message: verified
        ? "Work verified and case marked resolved."
        : "Report returned to the field worker.",
      data: updatedComplaint,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addChatMessage = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    if (!canAccessPrivateChat(complaint, req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "Only the reporter and authorized municipal staff can use this private conversation.",
      });
    }

    const body = req.body.body?.trim();
    if (!body)
      return res
        .status(400)
        .json({ success: false, message: "Message text is required" });

    const message = {
      authorId: req.user.id,
      authorName: req.user?.name || "Verified user",
      authorRole: req.user?.role || "citizen",
      body,
      channel: "private",
    };

    complaint.chatMessages.push(message);
    complaint.publicLedger.push({
      action: "chat_message_added",
      message: message.body,
      actor: message.authorName,
      metadata: { channel: message.channel },
    });

    const updatedComplaint = await complaint.save();
    const storedMessage =
      updatedComplaint.chatMessages[updatedComplaint.chatMessages.length - 1];
    emitComplaintEvent("complaint:message", {
      complaintId: updatedComplaint._id,
      message: storedMessage,
    });
    res.status(201).json({
      success: true,
      message: "Message posted successfully",
      data: storedMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).select(
      "chatMessages createdBy",
    );
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    if (!canAccessPrivateChat(complaint, req.user)) {
      return res.status(403).json({
        success: false,
        message: "This is a private reporter-to-authority conversation.",
      });
    }
    res.status(200).json({
      success: true,
      count: complaint.chatMessages.length,
      data: complaint.chatMessages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getComplaintLedger = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).select(
      "publicLedger priorityScore upvotes holdState status",
    );
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    res.status(200).json({
      success: true,
      data: {
        priorityScore: complaint.priorityScore,
        upvotes: complaint.upvotes,
        holdState: complaint.holdState,
        status: complaint.status,
        ledger: complaint.publicLedger,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminStream = async (req, res) => {
  try {
    const complaints = await Complaint.find().select(
      "title ward status priorityScore upvotes location createdAt",
    );
    const snapshot = buildAdminStreamSnapshot(complaints);
    res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const replyToComment = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    const body = req.body.body?.trim();
    if (!body)
      return res
        .status(400)
        .json({ success: false, message: "Reply text is required" });
    const comment = complaint.comments.id(req.params.commentId);
    if (!comment)
      return res.status(404).json({
        success: false,
        message: "Comment not found or was created before replies were enabled",
      });

    comment.replies.push({
      authorId: req.user.id,
      authorName: req.user?.name || "Verified user",
      authorRole: req.user?.role || "citizen",
      body,
    });
    const updatedComplaint = await complaint.save();
    const savedComment = updatedComplaint.comments.id(req.params.commentId);
    const reply = savedComment.replies[savedComment.replies.length - 1];
    emitComplaintEvent("complaint:comment-replied", {
      complaintId: updatedComplaint._id,
      commentId: req.params.commentId,
      reply,
    });
    res.status(201).json({
      success: true,
      message: "Reply posted successfully",
      data: reply,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createComplaint,
  getAllComplaints,
  getOfficerComplaints,
  reviewComplaintByOfficer,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getNearbyComplaints,
  voteComplaint,
  upvoteComplaint,
  holdComplaint,
  releaseComplaint,
  addComplaintComment,
  replyToComment,
  getComplaintComments,
  addCompletionReport,
  verifyCompletionReport,
  addChatMessage,
  getChatMessages,
  getComplaintLedger,
  getAdminStream,
};
