const User = require("../models/User");

const searchUsers = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    if (!search || search.length < 2)
      return res.status(400).json({
        success: false,
        message: "Enter at least two characters to search.",
      });
    const pattern = new RegExp(search, "i");
    const users = await User.find({
      $or: [{ name: pattern }, { email: pattern }],
    })
      .select("name email role ward jurisdiction")
      .limit(20);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const promoteUserToOfficer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "officer" },
      { new: true, runValidators: true },
    ).select("name email role ward jurisdiction");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    res.status(200).json({
      success: true,
      message: `${user.name} is now an officer.`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { searchUsers, promoteUserToOfficer };
