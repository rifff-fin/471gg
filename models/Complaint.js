const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            default: "",
        },
        originalName: {
            type: String,
            default: "",
        },
        mimeType: {
            type: String,
            default: "",
        },
        stage: {
            type: String,
            enum: ["complaint", "before", "after"],
            default: "complaint",
        },
    },
    { _id: false }
);

const ledgerEntrySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        actor: {
            type: String,
            default: "System",
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false, timestamps: true }
);

const commentSchema = new mongoose.Schema(
    {
        authorName: {
            type: String,
            required: true,
        },
        authorRole: {
            type: String,
            default: "citizen",
        },
        body: {
            type: String,
            required: true,
        },
        channel: {
            type: String,
            enum: ["public", "internal"],
            default: "public",
        },
    },
    { _id: false, timestamps: true }
);

const reportSchema = new mongoose.Schema(
    {
        note: {
            type: String,
            default: "",
        },
        submittedBy: {
            type: String,
            default: "Field Worker",
        },
        beforeImages: {
            type: [mediaSchema],
            default: [],
        },
        afterImages: {
            type: [mediaSchema],
            default: [],
        },
    },
    { _id: false, timestamps: true }
);

const complaintSchema = new mongoose.Schema(
{
    citizenName:{
        type:String,
        required:function () {
            return this.isNew;
        },
        default:""
    },

    citizenEmail:{
        type:String,
        required:function () {
            return this.isNew;
        },
        default:""
    },

    title:{
        type:String,
        required:function () {
            return this.isNew;
        },
        default:""
    },

    category:{
        type:String,
        default:"General"
    },

    description:{
        type:String,
        required:function () {
            return this.isNew;
        },
        default:""
    },

    ward:{
        type:String,
        default:""
    },

    priorityLevel:{
        type:String,
        enum:["Low","Medium","High","Critical"],
        default:"Medium"
    },

    priorityScore:{
        type:Number,
        default:0
    },

    severityCoefficient:{
        type:Number,
        default:1
    },

    department:{
        type:String,
        default:"Pending"
    },

    status:{
        type:String,
        enum:["Pending","In Progress","Resolved","Closed","Held Pending"],
        default:"Pending"
    },

    holdState:{
        type:String,
        enum:["ACTIVE","HELD_PENDING","RELEASED"],
        default:"ACTIVE"
    },

    holdReason:{
        type:String,
        default:""
    },

    assigned:{
        type:Boolean,
        default:false
    },

    upvotes:{
        type:Number,
        default:0
    },

    supporters:{
        type:[String],
        default:[]
    },

    images:{
        type:[mediaSchema],
        default:[]
    },

    beforeAfterReports:{
        type:[reportSchema],
        default:[]
    },

    comments:{
        type:[commentSchema],
        default:[]
    },

    chatMessages:{
        type:[commentSchema],
        default:[]
    },

    publicLedger:{
        type:[ledgerEntrySchema],
        default:[]
    },

    location:{
        type:{
            type:String,
            enum:["Point"],
            default:"Point"
        },

        coordinates:{
            type:[Number],
            required:function () {
                return this.isNew;
            }
        }
    }

},
{
    timestamps:true
});

complaintSchema.index({location:"2dsphere"});

module.exports = mongoose.model("Complaint",complaintSchema);