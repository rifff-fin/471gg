const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
{
    citizenName:{
        type:String,
        required:true
    },

    citizenEmail:{
        type:String,
        required:true
    },

    title:{
        type:String,
        required:true
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
});

complaintSchema.index({location:"2dsphere"});

module.exports = mongoose.model("Complaint",complaintSchema);