const CompletionReport = require("../models/CompletionReport");

// Create completion report

const createCompletionReport = async (req, res) => {
  try {
    const { complaint, description } = req.body;

    if (!complaint || !description) {
      return res.status(400).json({
        success: false,

        message: "All fields are required",
      });
    }

    if (!req.files?.beforeImage || !req.files?.afterImage) {
      return res.status(400).json({
        success: false,

        message: "Before and after images required",
      });
    }

    const report = await CompletionReport.create({
      complaint,

      worker: req.user.id,

      beforeImage: req.files.beforeImage[0].originalname,

      afterImage: req.files.afterImage[0].originalname,

      description,
    });

    res.status(201).json({
      success: true,

      message: "Completion report submitted",

      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const getReportsByComplaint = async (req, res) => {
  try {
    const reports = await CompletionReport.find({
      complaint: req.params.id,
    }).populate("worker", "name email");

    res.json({
      success: true,

      data: reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

module.exports = {
  createCompletionReport,

  getReportsByComplaint,
};
