const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ Database Connection Failed");
        console.error("Name:", error.name);
        console.error("Message:", error.message);
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;