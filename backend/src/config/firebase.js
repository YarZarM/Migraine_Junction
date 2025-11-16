// import admin from "firebase-admin";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Build path safely (Windows-friendly)
// const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

// // Load JSON manually
// const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   });
// }

// export default admin;
// src/config/firebaseAdmin.js (or same file you showed)
import admin from "firebase-admin";

// Read the JSON from an environment variable
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT env var is not set. " +
    "Make sure it's configured in Render and (optionally) in your local .env."
  );
}

// Parse the JSON string into an object
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
  throw err;
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
