const Fine = require("../models/Fine");
const User = require("../models/User");
const Notification = require("../models/Notification");

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

    const fine = await Fine.create({
      citizen: citizen._id,

      officer: req.user.id,

      violationType,

      description,

      fineAmount: Number(fineAmount) || 0,

      location,

      evidence: "",
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

module.exports = {
  createFine,

  getMyIssuedFines,

  getMyFines,
};
