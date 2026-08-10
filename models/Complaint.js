const mongoose = require("mongoose");


const complaintSchema = new mongoose.Schema(

{
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    title:{
        type:String,
        required:true
    },


    category:{
        type:String,
        required:true
    },


    priority:{
        type:String,
        enum:[
            "Low",
            "Medium",
            "High"
        ],
        default:"Medium"
    },


    description:{
        type:String,
        required:true
    },


    department:{
        type:String,
        default:"Pending"
    },


    status:{
        type:String,
        enum:[
            "Pending",
            "Assigned",
            "In Progress",
            "Resolved",
            "Closed"
        ],
        default:"Pending"
    },


    assigned:{
        type:Boolean,
        default:false
    },


    location:{

        type:{
            type:String,
            enum:["Point"],
            default:"Point"
        },


        coordinates:{
            type:[Number],
            required:true
        }

    }

},

{
    timestamps:true
}

);



complaintSchema.index({
    location:"2dsphere"
});



module.exports = mongoose.model(
    "Complaint",
    complaintSchema
);