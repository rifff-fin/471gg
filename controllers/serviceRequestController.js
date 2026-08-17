const ServiceRequest = require("../models/ServiceRequest");



// Citizen create request

const createServiceRequest = async(req,res)=>{

    try{


        const {
            serviceType,
            description
        } = req.body;



        if(!serviceType || !description){

            return res.status(400).json({

                success:false,

                message:"All fields are required"

            });

        }




        const request = await ServiceRequest.create({

            citizen:req.user.id,

            serviceType,

            description

        });



        res.status(201).json({

            success:true,

            message:"Service request submitted successfully",

            data:request

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};







// Citizen view own requests

const getMyServiceRequests = async(req,res)=>{


    try{


        const requests = await ServiceRequest.find({

            citizen:req.user.id

        })
        .sort({
            createdAt:-1
        });



        res.json({

            success:true,

            data:requests

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};








// Admin/Officer update request

const updateServiceRequest = async(req,res)=>{


    try{


        const {
            status,
            officerComment
        } = req.body;




        const request =
        await ServiceRequest.findByIdAndUpdate(

            req.params.id,

            {

                status,

                officerComment,

                reviewedBy:req.user.id

            },

            {
                new:true
            }

        );



        res.json({

            success:true,

            message:"Service request updated",

            data:request

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};





module.exports={

    createServiceRequest,

    getMyServiceRequests,

    updateServiceRequest

};