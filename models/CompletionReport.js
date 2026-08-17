const mongoose = require("mongoose");


const completionReportSchema = new mongoose.Schema({

  complaint:{

    type:mongoose.Schema.Types.ObjectId,

    ref:"Complaint",

    required:true

  },


  worker:{

    type:mongoose.Schema.Types.ObjectId,

    ref:"User",

    required:true

  },


  beforeImage:{

    type:String,

    required:true

  },


  afterImage:{

    type:String,

    required:true

  },


  description:{

    type:String,

    required:true

  },


  status:{

    type:String,

    default:"Submitted"

  }


},{
  timestamps:true
});


module.exports =
mongoose.model(
  "CompletionReport",
  completionReportSchema
);