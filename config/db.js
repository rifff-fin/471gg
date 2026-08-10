const mongoose = require("mongoose");
const dns = require("dns");

const configuredDnsServers = (process.env.MONGODB_DNS_SERVERS || "")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (configuredDnsServers.length) {
  dns.setServers(configuredDnsServers);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI,
      {
        dbName: process.env.MONGODB_DB_NAME || "ekotro",
        serverSelectionTimeoutMS: 15000,
      }
    );

    console.log("✅ MongoDB Connected Successfully");
    console.log("Database:", conn.connection.name);
  } catch (error) {
    console.error(
      "❌ MongoDB Connection Error:",
      error.message
    );

    process.exit(1);
  }
};

module.exports = connectDB;