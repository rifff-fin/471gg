const Complaint = require("../models/Complaint");
const { uploadBuffer } = require("../services/cloudinary");
const {
    calculateComplaintPriority,
    getPriorityLabel,
} = require("../services/priority");
const {
    emitComplaintEvent,
    emitAdminAlert,
} = require("../services/realtime");

const SLA_THRESHOLD_HOURS = Number(process.env.SLA_THRESHOLD_HOURS || 24);
const HEATMAP_PRIORITY_THRESHOLD = Number(process.env.HEATMAP_PRIORITY_THRESHOLD || 60);

const isTerminalStatus = (status = "") => {
    return ["Resolved", "Closed"].includes(status);
};

const getComplaintAgeHours = (complaint) => {
    const createdAt = complaint?.createdAt ? new Date(complaint.createdAt).getTime() : Date.now();
    return Math.max((Date.now() - createdAt) / 3600000, 0);
};

const isSlaBreached = (complaint) => {
    return !isTerminalStatus(complaint.status) && getComplaintAgeHours(complaint) >= SLA_THRESHOLD_HOURS;
};

const buildHeatmapHotspots = (complaints = []) => {
    const buckets = new Map();

    complaints
        .filter((complaint) => !isTerminalStatus(complaint.status))
        .filter((complaint) => Number(complaint.priorityScore || 0) >= HEATMAP_PRIORITY_THRESHOLD)
        .forEach((complaint) => {
            const coordinates = complaint?.location?.coordinates || [];

            if (!Array.isArray(coordinates) || coordinates.length !== 2) {
                return;
            }

            const [lng, lat] = coordinates.map(Number);

            if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
                return;
            }

            const wardKey = complaint.ward?.trim();
            const geoKey = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
            const bucketKey = wardKey || geoKey;

            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, {
                    key: bucketKey,
                    ward: wardKey || "Unassigned",
                    center: {
                        lat,
                        lng,
                    },
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
            avgPriorityScore: Number((bucket.avgPriorityScore / Math.max(bucket.complaintCount, 1)).toFixed(2)),
        }))
        .sort((left, right) => {
            if (right.complaintCount !== left.complaintCount) {
                return right.complaintCount - left.complaintCount;
            }

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
        "title ward status priorityScore upvotes location createdAt"
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
            message: `${breach.title} exceeded SLA by ${breach.ageHours}h in ${breach.ward}.`,
            ward: breach.ward,
            priorityScore: breach.priorityScore,
            ageHours: breach.ageHours,
        });
    });

    return snapshot;
};

const parseMaybeJson = (value) => {
    if (!value || typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
};

const normalizeLocation = (body = {}) => {
    const lat = Number(
        body.latitude ??
        body.lat ??
        body.locationLat ??
        body.location?.lat
    );
    const lng = Number(
        body.longitude ??
        body.lng ??
        body.locationLng ??
        body.location?.lng
    );

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
            type: "Point",
            coordinates: [lng, lat],
        };
    }

    const parsedLocation = parseMaybeJson(body.location);

    if (
        parsedLocation &&
        parsedLocation.type === "Point" &&
        Array.isArray(parsedLocation.coordinates)
    ) {
        return {
            type: "Point",
            coordinates: parsedLocation.coordinates.map(Number),
        };
    }

    return null;
};

const getSupporterKey = (req, complaintId) => {
    return (
        req.user?.id ||
        req.body.supporterId ||
        req.body.supporterEmail ||
        req.headers["x-supporter-id"] ||
        req.ip ||
        `${complaintId}-anonymous`
    );
};

const toMediaList = async (files = [], stage = "complaint") => {
    const uploads = [];

    for (const file of files) {
        const result = await uploadBuffer(file.buffer, {
            folder: `ekotro/${stage}`,
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

// ================= CREATE COMPLAINT =================
const createComplaint = async (req, res) => {
    try {
        const requiredFields = ["citizenName", "citizenEmail", "title", "description"];
        const missingFields = requiredFields.filter((field) => !String(req.body[field] || "").trim());

        if (missingFields.length) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        const location = normalizeLocation(req.body);

        if (!location) {
            return res.status(400).json({
                success: false,
                message: "Complaint location is required as latitude/longitude or GeoJSON coordinates.",
            });
        }

        const attachments = await toMediaList(req.files || [], "complaint");

        const complaint = await Complaint.create({
            citizenName: req.body.citizenName,
            citizenEmail: req.body.citizenEmail,
            title: req.body.title,
            category: req.body.category || "General",
            description: req.body.description,
            ward: req.body.ward || "",
            department: req.body.department || "Pending",
            status: req.body.status || "Pending",
            priorityLevel: req.body.priorityLevel || "Medium",
            severityCoefficient: Number(req.body.severityCoefficient || 1),
            location,
            images: attachments,
            publicLedger: [{
                action: "complaint_created",
                message: "Complaint submitted and added to the public ledger.",
                actor: req.body.citizenName || "Citizen",
                metadata: {
                    category: req.body.category || "General",
                },
            }],
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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= GET ALL COMPLAINTS =================
const getAllComplaints = async (req, res) => {
    try {
        const query = {};

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.status) {
            query.status = req.query.status;
        }

        if (req.query.ward) {
            query.ward = req.query.ward;
        }

        const complaints = await Complaint.find(query).sort({
            priorityScore: -1,
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= GET SINGLE COMPLAINT =================
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        res.status(200).json({
            success: true,
            data: complaint,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= UPDATE COMPLAINT =================
const updateComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        if (complaint.assigned) {
            return res.status(403).json({
                success: false,
                message: "Complaint already assigned. Update not allowed.",
            });
        }

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
                complaint[field] = field === "severityCoefficient"
                    ? Number(req.body[field])
                    : parseMaybeJson(req.body[field]);
            }
        });

        if (req.body.location || req.body.latitude || req.body.longitude || req.body.lat || req.body.lng) {
            const location = normalizeLocation(req.body);

            if (location) {
                complaint.location = location;
            }
        }

        await rebalancePriority(complaint);
        complaint.publicLedger.push({
            action: "complaint_updated",
            message: "Complaint details were updated.",
            actor: req.body.actor || "System",
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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= DELETE COMPLAINT =================
const deleteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        if (complaint.assigned) {
            return res.status(403).json({
                success: false,
                message: "Complaint already assigned. Delete not allowed.",
            });
        }

        await complaint.deleteOne();

        emitComplaintEvent("complaint:deleted", {
            complaintId: req.params.id,
        });

        await publishAdminStream();

        res.status(200).json({
            success: true,
            message: "Complaint deleted successfully",
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// ================= NEARBY COMPLAINTS =================
const getNearbyComplaints = async (req, res) => {
    try {
        const { lng, lat, distance } = req.query;

        const complaints = await Complaint.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [Number(lng), Number(lat)],
                    },
                    $maxDistance: Number(distance),
                },
            },
        });

        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const upvoteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        const supporterKey = getSupporterKey(req, req.params.id);

        if (complaint.supporters.includes(supporterKey)) {
            return res.status(409).json({
                success: false,
                message: "You already supported this complaint.",
            });
        }

        complaint.supporters.push(supporterKey);
        complaint.upvotes += 1;
        await rebalancePriority(complaint);
        complaint.publicLedger.push({
            action: "complaint_upvoted",
            message: "A citizen supported this complaint.",
            actor: req.body.actor || req.user?.name || "Citizen",
            metadata: {
                supporterKey,
                upvotes: complaint.upvotes,
            },
        });

        const updatedComplaint = await complaint.save({ validateBeforeSave: false });

        emitComplaintEvent("complaint:upvoted", {
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
            message: "Complaint upvoted successfully",
            data: updatedComplaint,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const holdComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        const reason = req.body.reason?.trim();

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "A written rationale is required to place a complaint on hold.",
            });
        }

        complaint.status = "Held Pending";
        complaint.holdState = "HELD_PENDING";
        complaint.holdReason = reason;
        complaint.publicLedger.push({
            action: "complaint_held",
            message: `Complaint placed on hold: ${reason}`,
            actor: req.body.actor || "Ward Officer",
            metadata: {
                reason,
            },
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
            message: `${updatedComplaint.title} was moved to HELD_PENDING.`,
        });

        await publishAdminStream();

        res.status(200).json({
            success: true,
            message: "Complaint placed on hold successfully",
            data: updatedComplaint,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const releaseComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        complaint.holdState = "RELEASED";
        complaint.holdReason = "";
        complaint.status = req.body.status || "Pending";
        complaint.publicLedger.push({
            action: "complaint_released",
            message: "Complaint hold was released.",
            actor: req.body.actor || "Ward Officer",
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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const addComplaintComment = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        const body = req.body.body?.trim();

        if (!body) {
            return res.status(400).json({
                success: false,
                message: "Comment text is required",
            });
        }

        const comment = {
            authorName: req.body.authorName || req.user?.name || "Anonymous",
            authorRole: req.body.authorRole || req.user?.role || "citizen",
            body,
            channel: req.body.channel === "internal" ? "internal" : "public",
        };

        complaint.comments.push(comment);
        complaint.publicLedger.push({
            action: "complaint_commented",
            message: comment.body,
            actor: comment.authorName,
            metadata: {
                channel: comment.channel,
            },
        });

        const updatedComplaint = await complaint.save();

        const storedComment = updatedComplaint.comments[updatedComplaint.comments.length - 1];

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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getComplaintComments = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).select("comments");

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        res.status(200).json({
            success: true,
            count: complaint.comments.length,
            data: complaint.comments,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const addCompletionReport = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        const beforeImages = await toMediaList(req.files?.beforeImages || [], "before");
        const afterImages = await toMediaList(req.files?.afterImages || [], "after");

        const report = {
            note: req.body.note || "",
            submittedBy: req.body.submittedBy || req.user?.name || "Field Worker",
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

        emitComplaintEvent("complaint:report-uploaded", {
            complaintId: updatedComplaint._id,
            complaint: updatedComplaint,
        });

        emitAdminAlert({
            complaintId: updatedComplaint._id,
            type: "report-uploaded",
            message: `${updatedComplaint.title} now has a completion report.`,
        });

        await publishAdminStream();

        res.status(201).json({
            success: true,
            message: "Completion report uploaded successfully",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const addChatMessage = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        const body = req.body.body?.trim();

        if (!body) {
            return res.status(400).json({
                success: false,
                message: "Message text is required",
            });
        }

        const message = {
            authorName: req.body.authorName || req.user?.name || "Anonymous",
            authorRole: req.body.authorRole || req.user?.role || "citizen",
            body,
            channel: req.body.channel === "internal" ? "internal" : "public",
        };

        complaint.chatMessages.push(message);
        complaint.publicLedger.push({
            action: "chat_message_added",
            message: message.body,
            actor: message.authorName,
            metadata: {
                channel: message.channel,
            },
        });

        const updatedComplaint = await complaint.save();
        const storedMessage = updatedComplaint.chatMessages[updatedComplaint.chatMessages.length - 1];

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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getChatMessages = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).select("chatMessages");

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

        res.status(200).json({
            success: true,
            count: complaint.chatMessages.length,
            data: complaint.chatMessages,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getComplaintLedger = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).select("publicLedger priorityScore upvotes holdState status");

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found",
            });
        }

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
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getAdminStream = async (req, res) => {
    try {
        const complaints = await Complaint.find().select(
            "title ward status priorityScore upvotes location createdAt"
        );

        const snapshot = buildAdminStreamSnapshot(complaints);

        res.status(200).json({
            success: true,
            data: snapshot,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createComplaint,
    getAllComplaints,
    getComplaintById,
    updateComplaint,
    deleteComplaint,
    getNearbyComplaints,
    upvoteComplaint,
    holdComplaint,
    releaseComplaint,
    addComplaintComment,
    getComplaintComments,
    addCompletionReport,
    addChatMessage,
    getChatMessages,
    getComplaintLedger,
    getAdminStream,
};