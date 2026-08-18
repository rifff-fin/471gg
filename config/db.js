const mongoose = require("mongoose");
const dns = require("dns");
const { MongoMemoryServer } = require("mongodb-memory-server");

const configuredDnsServers = (process.env.MONGODB_DNS_SERVERS || "")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (configuredDnsServers.length) {
  dns.setServers(configuredDnsServers);
}

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      const memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      console.log(
        "ℹ️ No MONGODB_URI configured. Using an in-memory MongoDB instance for local development.",
      );
    }

    const conn = await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || "ekotro",
      serverSelectionTimeoutMS: 15000,
    });

    console.log("✅ MongoDB Connected Successfully");
    console.log("Database:", conn.connection.name);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
