const mongoose = require("mongoose");


const fineSchema = new mongoose.Schema({

    citizen:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    officer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    violationType:{
        type:String,
        required:true
    },


    description:{
        type:String,
        required:true
    },


    fineAmount:{
        type:Number,
        required:true,
        min:0
    },


    location:{
        type:String,
        required:true
    },


    evidence:{
        type:String,
        default:""
    },


    status:{
        type:String,
        enum:[
            "Unpaid",
            "Paid"
        ],
        default:"Unpaid"
    }


},
{
 timestamps:true
});


module.exports = mongoose.model("Fine",fineSchema);