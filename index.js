 
import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

import eventPost from "./routes/post/eventPost.js";
import { createAuth } from "./confiq/auth.js";

// Load backend environment variables
dotenv.config({ path: ".env.local" });

const app = express();
const port = process.env.PORT || 5000;

// Check required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is missing from .env.local");
}

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://kindoraa-frontend.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    exposedHeaders: ["set-auth-jwt"],
  })
);

// Handle preflight requests
app.options(/.*/, cors());

// Parse JSON requests
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();

    const db = client.db("kindoraDB");
    app.locals.db = db;

    console.log("MongoDB connected successfully");

    // Check the Better Auth configuration
    console.log("Better Auth URL:", process.env.BETTER_AUTH_URL);
    console.log("Frontend URL:", process.env.FRONTEND_URL);

    // Initialize Better Auth
    const auth = createAuth(db);

    // Better Auth routes
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // Event routes
    app.use("/events", eventPost);

    // API home route
    app.get("/", (req, res) => {
      res.status(200).send("Welcome to Kindora API");
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
