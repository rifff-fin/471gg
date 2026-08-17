const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");

const {
  protect
} = require("../middleware/authMiddleware");



// Get logged in user notifications
router.get(
  "/",
  protect,
  async (req, res) => {

    try {

      const notifications = await Notification.find({
        user: req.user.id
      })
      .sort({
        createdAt:-1
      });



      res.status(200).json({

        success:true,

        data:notifications

      });


    } catch(error) {


      res.status(500).json({

        success:false,

        message:error.message

      });


    }

  }
);



module.exports = router;