const express = require("express");

const router = express.Router();


const {
    protect,
    authorize
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





// ================= CREATE COMPLAINT =================
// Citizen creates complaint

router.post(

    "/",

    protect,

    createComplaint

);





// ================= PUBLIC COMPLAINTS =================
// Anyone can view public complaints

router.get(

    "/",

    getAllComplaints

);





// ================= OFFICER DASHBOARD =================
// Officer/Admin can view all complaints

router.get(

    "/all",

    protect,

    authorize(
        "officer",
        "admin"
    ),

    getAllComplaints

);





// ================= MY COMPLAINTS =================
// Citizen views own complaints

router.get(

    "/my",

    protect,

    getMyComplaints

);





// ================= NEARBY COMPLAINTS =================

router.get(

    "/nearby",

    getNearbyComplaints

);





// ================= SINGLE COMPLAINT =================

router.get(

    "/:id",

    getComplaintById

);





// ================= UPDATE COMPLAINT =================

router.put(

    "/:id",

    protect,

    updateComplaint

);





// ================= DELETE COMPLAINT =================

router.delete(

    "/:id",

    protect,

    deleteComplaint

);





module.exports = router;