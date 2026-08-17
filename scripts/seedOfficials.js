require("dotenv").config();

const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

const password = process.env.OFFICIAL_SEED_PASSWORD || "EkotroOfficial2026!";
const officials = [
  {
    name: "Mayor, Dhaka North City Corporation",
    email: "mayor.north@ekotro.gov.bd",
    role: "mayor",
    jurisdiction: "Dhaka North",
  },
  {
    name: "Mayor, Dhaka South City Corporation",
    email: "mayor.south@ekotro.gov.bd",
    role: "mayor",
    jurisdiction: "Dhaka South",
  },
  {
    name: "Ward Councillor, Dhaka North",
    email: "councillor@ekotro.gov.bd",
    role: "councillor",
    jurisdiction: "Dhaka North",
  },
];

const seedOfficials = async () => {
  await connectDB();
  const hashedPassword = await bcrypt.hash(password, 12);

  for (const official of officials) {
    await User.findOneAndUpdate(
      { email: official.email },
      { $set: { ...official, password: hashedPassword } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  console.log("Official accounts seeded successfully.");
  await User.db.close();
};

seedOfficials().catch(async (error) => {
  console.error("Official account seed failed:", error.message);
  await User.db.close();
  process.exitCode = 1;
});
