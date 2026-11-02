 
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";

export function createAuth(db) {
  return betterAuth({
    appName: "Kindora",

    database: mongodbAdapter(db),

    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",

    secret: process.env.BETTER_AUTH_SECRET,

    trustedOrigins: [
      "http://localhost:3000",
      "https://kindoraa-frontend.vercel.app",
    ],

    // Cookie settings for local and production
    advanced: {
      defaultCookieAttributes: {
        sameSite:
          process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    },

    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        updateUserInfoOnLink: true,
        disableImplicitLinking: false,
        requireLocalEmailVerified: false,
      },
    },

    verification: {
      storeInDatabase: true,
    },

    plugins: [
      jwt({
        jwt: {
          expirationTime: "15m",
        },
      }),
    ],
  });
}
