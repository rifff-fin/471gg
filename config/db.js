const mongoose = require("mongoose");
const dns = require("dns");

const configuredDnsServers = (process.env.MONGODB_DNS_SERVERS || "")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (configuredDnsServers.length) {
  dns.setServers(configuredDnsServers);
}

const connectDB = async (options = {}) => {
  const retries = typeof options.retries === "number" ? options.retries : 5;
  const baseDelay = typeof options.baseDelay === "number" ? options.baseDelay : 2000; // ms

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME || "ekotro",
        serverSelectionTimeoutMS: 15000,
      });

      console.log("✅ MongoDB Connected Successfully");
      console.log("Database:", conn.connection.name);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error (attempt ${attempt}/${retries}):`, error.message);

      if (attempt < retries) {
        const delay = baseDelay * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("Could not connect to MongoDB after retries. Attempting in-memory fallback...");

        // Try in-memory MongoDB as a fallback for local development
        try {
          const { MongoMemoryServer } = require("mongodb-memory-server");
          const mongod = await MongoMemoryServer.create();
          const uri = mongod.getUri();

          console.log("Starting in-memory MongoDB for development at:", uri);
          const conn = await mongoose.connect(uri, {
            dbName: process.env.MONGODB_DB_NAME || "ekotro_memory",
            serverSelectionTimeoutMS: 15000,
          });

          console.log("✅ Connected to in-memory MongoDB");
          // attach mongod instance so it can be stopped later if needed
          mongoose._inMemoryServer = mongod;
          return conn;
        } catch (memErr) {
          console.error("In-memory MongoDB fallback failed:", memErr.message || memErr);
          console.error("Continuing without DB connection.");
          return null;
        }
      }
    }
  }
};

module.exports = connectDB;