const express = require("express");

const router = express.Router();


const {
    protect
} = require("../middleware/authMiddleware");



const {

    createComplaint,

    getAllComplaints,

    getMyComplaints,

    getComplaintById,

    updateComplaint,

    deleteComplaint,

    getNearbyComplaints

} = require("../controllers/complaintController");




// Create Complaint

router.post(

    "/",

    protect,

    createComplaint

);




// Get All Complaints

router.get(

    "/",

    getAllComplaints

);




// Get My Complaints

router.get(

    "/my",

    protect,

    getMyComplaints

);




// Nearby Complaints

router.get(

    "/nearby",

    getNearbyComplaints

);




// Get Single Complaint

router.get(

    "/:id",

    getComplaintById

);




// Update Complaint

router.put(

    "/:id",

    protect,

    updateComplaint

);




// Delete Complaint

router.delete(

    "/:id",

    protect,

    deleteComplaint

);



module.exports = router;