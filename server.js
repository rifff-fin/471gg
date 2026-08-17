const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config(); // Load environment variables

const connectDB = require("./config/db");
const { registerSocketHandlers } = require("./services/realtime");

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);
registerSocketHandlers(io);

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Test Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Complaint Management API is Running...",
  });
});

// Authentication Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Complaint Routes
const complaintRoutes = require("./routes/complaintRoutes");
app.use("/api/complaints", complaintRoutes);

const announcementRoutes = require("./routes/announcementRoutes");
app.use("/api/announcements", announcementRoutes);

const fineRoutes = require("./routes/fineRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const completionReportRoutes = require("./routes/completionReportRoutes");
const serviceRequestRoutes = require("./routes/serviceRequestRoutes");

app.use("/api/fines", fineRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/completion-reports", completionReportRoutes);
app.use("/api/service-requests", serviceRequestRoutes);

app.use((error, req, res, next) => {
  if (error?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: "Upload rejected: images only, up to 8 files, 12 MB each.",
    });
  }

  return next(error);
});

// Port
const PORT = process.env.PORT || 1141;

// Start Server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
