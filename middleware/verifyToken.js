 
import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_URL = (
  process.env.BETTER_AUTH_URL || "http://localhost:5000"
).replace(/\/$/, "");

const JWKS = createRemoteJWKSet(
  new URL("/api/auth/jwks", `${AUTH_URL}/`)
);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const token = authHeader.slice(7);

    // Temporarily decode JWT claims for debugging.
    const parts = token.split(".");

    if (parts.length !== 3) {
      throw new Error("Invalid JWT format.");
    }

    const decodedPayload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );

    console.log("JWT issuer:", decodedPayload.iss);
    console.log("JWT audience:", decodedPayload.aud);
    console.log(
      "JWT expiration:",
      decodedPayload.exp
        ? new Date(decodedPayload.exp * 1000)
        : "Not provided"
    );
    console.log("Expected issuer:", AUTH_URL);

    // Verify JWT signature and claims.
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: AUTH_URL,
      audience: AUTH_URL,
    });

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", {
      name: error.name,
      code: error.code,
      message: error.message,
    });

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export default verifyToken;
