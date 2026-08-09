const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const connectDB = require("./config/db");

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Complaint Management API is Running..."
    });
});

// Import Routes (we'll create these next)
const complaintRoutes = require("./routes/complaintRoutes");
app.use("/api/complaints", complaintRoutes);

// Port
const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});