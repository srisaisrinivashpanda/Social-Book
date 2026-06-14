import dotenv from "dotenv";
import dns from "node:dns/promises";

import connectDB from "../src/db/index.js";
import app from "./app.js";

dotenv.config({
  path: ".env",
});

dns.setServers(["1.1.1.1"]);

const startServer = async () => {
  try {
    await connectDB();

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
