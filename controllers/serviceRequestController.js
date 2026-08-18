const ServiceRequest = require("../models/ServiceRequest");
const Notification = require("../models/Notification");
const { emitUserNotification } = require("../services/realtime");

// Citizen create request

const createServiceRequest = async (req, res) => {
  try {
    const { serviceType, description } = req.body;

    if (!serviceType || !description) {
      return res.status(400).json({
        success: false,

        message: "All fields are required",
      });
    }

    const request = await ServiceRequest.create({
      citizen: req.user.id,

      serviceType,

      description,
    });

    res.status(201).json({
      success: true,

      message: "Service request submitted successfully",

      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// Citizen view own requests

const getMyServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({
      citizen: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,

      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

// Admin/Officer update request

const updateServiceRequest = async (req, res) => {
  try {
    // VIVA: Only the protected officer/admin route can reach this electronic-signing logic.
    const { status, officerComment } = req.body;
    if (
      !["Processing", "Approved", "Rejected", "Completed"].includes(status) ||
      !officerComment?.trim()
    )
      return res
        .status(400)
        .json({
          success: false,
          message: "A valid status and signed officer note are required.",
        });
    const request = await ServiceRequest.findById(req.params.id);
    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Service request not found." });
    request.status = status;
    request.officerComment = officerComment.trim();
    request.reviewedBy = req.user.id;
    // VIVA: The signature is an audit record tied to the authenticated officer and time.
    request.reviewedAt = new Date();
    request.electronicSignature = `${req.user.name} · Municipal Officer · ${request.reviewedAt.toLocaleString("en-BD")}`;
    await request.save();
    const notification = await Notification.create({
      user: request.citizen,
      title: `Service request ${status}`,
      message: `${req.user.name}: ${request.officerComment}`,
      type: "case_update",
    });
    // VIVA: Persist the inbox item and also notify the citizen's active browser.
    emitUserNotification(String(request.citizen), {
      notificationId: String(notification._id),
      title: notification.title,
      message: notification.message,
      type: notification.type,
    });

    res.json({
      success: true,

      message: "Service request updated",

      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const getOfficerServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate("citizen", "name email")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createServiceRequest,

  getMyServiceRequests,

  updateServiceRequest,
  getOfficerServiceRequests,
};
