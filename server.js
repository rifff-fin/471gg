const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const connectDB = require("./config/db");
const { registerSocketHandlers } = require("./services/realtime");


// Connect MongoDB
connectDB();



const app = express();
const httpServer = http.createServer(app);




// =======================
// Socket.io
// =======================

const DEFAULT_ORIGINS = [
  "http://localhost:5176",
  "http://localhost:5173",
  "http://localhost:5174",
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ORIGINS
);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

app.set("io", io);

registerSocketHandlers(io);








// =======================
// CORS
// =======================

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);









// =======================
// Body Parser
// =======================

app.use(express.json());


app.use(
  express.urlencoded({

    extended:true,

    limit:"10mb"

  })
);









// =======================
// Test Route
// =======================


app.get("/",(req,res)=>{


  res.status(200).json({

    success:true,

    message:"Complaint Management API is Running..."

  });


});









// =======================
// Routes
// =======================



// Authentication

const authRoutes =
require("./routes/authRoutes");


app.use(
  "/api/auth",
  authRoutes
);







// Complaints

const complaintRoutes =
require("./routes/complaintRoutes");


app.use(
  "/api/complaints",
  complaintRoutes
);







// Digital Fine

const fineRoutes =
require("./routes/fineRoutes");


app.use(
  "/api/fines",
  fineRoutes
);







// Notifications

const notificationRoutes =
require("./routes/notificationRoutes");


app.use(
  "/api/notifications",
  notificationRoutes
);








// Field Worker Completion Reports

const completionReportRoutes =
require("./routes/completionReportRoutes");


app.use(
  "/api/completion-reports",
  completionReportRoutes
);








// Government Service Requests (Member-2)

const serviceRequestRoutes =
require("./routes/serviceRequestRoutes");


app.use(
  "/api/service-requests",
  serviceRequestRoutes
);









// =======================
// Error Handler
// =======================


app.use((error,req,res,next)=>{


  console.error(error);




  if(error?.name === "MulterError"){


    return res.status(400).json({

      success:false,

      message:"Upload rejected: images/videos only."

    });


  }






  return res.status(500).json({

    success:false,

    message:error.message || "Server Error"

  });



});









// =======================
// Server
// =======================


const PORT = process.env.PORT || 1321;



httpServer.listen(PORT,()=>{


  console.log(

    `🚀 Server is running on http://localhost:${PORT}`

  );


});