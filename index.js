<<<<<<< HEAD
 
=======
 import verifyToken from "./middleware/verifyToken.js";
// import eventPost from "./routes/post/eventPost.js";
>>>>>>> 5cf95f3af175ce2f461ee80c5a36f71cdc29fda0
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

<<<<<<< HEAD
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
      // Allow requests without an Origin header
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
=======
>>>>>>> 5cf95f3af175ce2f461ee80c5a36f71cdc29fda0
const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();

    const db = client.db("kindoraDB");

    // Make database available to Express routes
    app.locals.db = db;

    console.log("MongoDB connected successfully");

<<<<<<< HEAD
=======
    // Configure CORS
    app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      })
    );

    // Parse JSON requests
    app.use(express.json());

>>>>>>> 5cf95f3af175ce2f461ee80c5a36f71cdc29fda0
    // Initialize Better Auth
    const auth = createAuth(db);

    // Better Auth routes
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // Event routes
    app.use("/events", eventPost);

    // API home route
    app.get("/", (req, res) => {
<<<<<<< HEAD
      res.status(200).send("Welcome to Kindora API");
    });

    // Start local development server
=======
      res.send("Welcome to Kindora API");
    });

    // Start server
>>>>>>> 5cf95f3af175ce2f461ee80c5a36f71cdc29fda0
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
