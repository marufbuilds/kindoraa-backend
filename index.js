 import verifyToken from "./middleware/verifyToken.js";
// import eventPost from "./routes/post/eventPost.js";
import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

import eventPost from "./routes/post/eventPost.js";
import { createAuth } from "./confiq/auth.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();

    const db = client.db("kindoraDB");

    // Make database available to Express routes
    app.locals.db = db;

    console.log("MongoDB connected successfully");

    // Configure CORS
    app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      })
    );

    // Parse JSON requests
    app.use(express.json());

    // Initialize Better Auth
    const auth = createAuth(db);

    // Better Auth routes
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // Event routes
    app.use("/events", eventPost);

    // API home route
    app.get("/", (req, res) => {
      res.send("Welcome to Kindora API");
    });

    // Start server
    app.listen(port, () => {
      console.log(`Kindora server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    await client.close().catch(() => {});
    process.exit(1);
  }
}

run();
