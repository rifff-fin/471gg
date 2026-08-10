const Complaint = require("../models/Complaint");



// ================= CREATE COMPLAINT =================

const createComplaint = async(req,res)=>{

    try{


        const complaint = await Complaint.create({

            ...req.body,

            createdBy:req.user.id

        });



        res.status(201).json({

            success:true,

            message:"Complaint created successfully",

            data:complaint

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




// ================= GET ALL COMPLAINTS =================

const getAllComplaints = async(req,res)=>{

    try{


        const complaints =
            await Complaint.find()
            .populate(
                "createdBy",
                "name email"
            );



        res.status(200).json({

            success:true,

            count:complaints.length,

            data:complaints

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




// ================= GET MY COMPLAINTS =================

const getMyComplaints = async(req,res)=>{

    try{


        const complaints =
            await Complaint.find({

                createdBy:req.user.id

            });



        res.status(200).json({

            success:true,

            count:complaints.length,

            data:complaints

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




// ================= GET SINGLE COMPLAINT =================

const getComplaintById = async(req,res)=>{

    try{


        const complaint =
            await Complaint.findById(
                req.params.id
            );



        if(!complaint){

            return res.status(404).json({

                success:false,

                message:"Complaint not found"

            });

        }



        res.status(200).json({

            success:true,

            data:complaint

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




// ================= UPDATE COMPLAINT =================

const updateComplaint = async(req,res)=>{

    try{


        const complaint =
            await Complaint.findById(
                req.params.id
            );



        if(!complaint){

            return res.status(404).json({

                success:false,

                message:"Complaint not found"

            });

        }



        if(
            complaint.createdBy.toString()
            !==
            req.user.id
        ){

            return res.status(403).json({

                success:false,

                message:"Not allowed"

            });

        }



        if(complaint.assigned){

            return res.status(403).json({

                success:false,

                message:
                "Complaint already assigned"

            });

        }



        const updatedComplaint =
            await Complaint.findByIdAndUpdate(

                req.params.id,

                req.body,

                {
                    new:true,
                    runValidators:true
                }

            );



        res.status(200).json({

            success:true,

            message:
            "Complaint updated successfully",

            data:updatedComplaint

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




// ================= DELETE COMPLAINT =================

const deleteComplaint = async(req,res)=>{

    try{


        const complaint =
            await Complaint.findById(
                req.params.id
            );



        if(!complaint){

            return res.status(404).json({

                success:false,

                message:"Complaint not found"

            });

        }



        if(
            complaint.createdBy.toString()
            !==
            req.user.id
        ){

            return res.status(403).json({

                success:false,

                message:"Not allowed"

            });

        }



        if(complaint.assigned){

            return res.status(403).json({

                success:false,

                message:
                "Complaint already assigned"

            });

        }



        await complaint.deleteOne();



        res.status(200).json({

            success:true,

            message:
            "Complaint deleted successfully"

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




// ================= NEARBY COMPLAINTS =================

const getNearbyComplaints = async(req,res)=>{

    try{


        const {
            lng,
            lat,
            distance
        } = req.query;



        const complaints =
            await Complaint.find({

                location:{

                    $near:{

                        $geometry:{

                            type:"Point",

                            coordinates:[

                                Number(lng),

                                Number(lat)

                            ]

                        },


                        $maxDistance:
                        Number(distance)

                    }

                }

            });



        res.status(200).json({

            success:true,

            count:complaints.length,

            data:complaints

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};



module.exports={

    createComplaint,

    getAllComplaints,

    getMyComplaints,

    getComplaintById,

    updateComplaint,

    deleteComplaint,

    getNearbyComplaints

};