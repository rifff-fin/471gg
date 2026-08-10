const Complaint = require("../models/Complaint");
const User = require("../models/User");


// ================= CREATE COMPLAINT =================
const createComplaint = async (req, res) => {
  try {
    const { title, description, location } = req.body;

    if (!title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, description and location are required",
      });
    }

    const user = await User.findById(req.user.id).select(
      "name email"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const complaint = await Complaint.create({
      createdBy: user._id,

      // Take identity from authenticated account,
      // not from frontend input
      citizenName: user.name,
      citizenEmail: user.email,

      title,
      description,
      location,
    });

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
    const complaints = await Complaint.find()
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

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


// ================= GET MY COMPLAINTS =================
const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      createdBy: req.user.id,
    }).sort({ createdAt: -1 });

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
    const complaint = await Complaint.findById(
      req.params.id
    );

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


// ================= UPDATE OWN COMPLAINT =================
const updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(
      req.params.id
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Ownership check
    if (
      !complaint.createdBy ||
      complaint.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own complaint",
      });
    }

    // Cannot edit after assignment
    if (complaint.assigned) {
      return res.status(403).json({
        success: false,
        message:
          "Complaint already assigned. Update not allowed.",
      });
    }

    // Only citizen-editable fields
    const { title, description, location } = req.body;

    if (title !== undefined) {
      complaint.title = title;
    }

    if (description !== undefined) {
      complaint.description = description;
    }

    if (location !== undefined) {
      complaint.location = location;
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ================= DELETE OWN COMPLAINT =================
const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(
      req.params.id
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // Ownership check
    if (
      !complaint.createdBy ||
      complaint.createdBy.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own complaint",
      });
    }

    // Cannot delete after assignment
    if (complaint.assigned) {
      return res.status(403).json({
        success: false,
        message:
          "Complaint already assigned. Delete not allowed.",
      });
    }

    await complaint.deleteOne();

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

    if (!lng || !lat || !distance) {
      return res.status(400).json({
        success: false,
        message:
          "Longitude, latitude and distance are required",
      });
    }

    const complaints = await Complaint.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              Number(lng),
              Number(lat),
            ],
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


module.exports = {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getNearbyComplaints,
};