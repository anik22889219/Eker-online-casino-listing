import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

/**
 * Triggered on new file uploads to Google Cloud Storage.
 * Useful for scanning malware, validating files, resizing images, and checking permissions.
 */
export const onStorageUpload = functions.storage.object().onFinalize(async (object: any) => {
  const filePath = object.name;
  if (!filePath) return;

  functions.logger.info(`New upload detected: ${filePath}. Processing file size: ${object.size} bytes.`);

  // Ready for metadata generation, image compression, etc.
});

/**
 * Generates a secure, signed Cloudinary upload signature.
 * Enforces authentication and folder-specific admin permissions.
 */
export const getCloudinarySignature = functions.https.onCall(async (data: any, context: any) => {
  // 1. Authenticate caller
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const { folder, timestamp: clientTimestamp } = data;
  if (!folder) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required 'folder' parameter.");
  }

  // Enforce folder whitelist and role-based checks
  const allowedFolders = [
    "casino-listings/logos",
    "casino-listings/banners",
    "casino-listings/jackpots",
    "casino-listings/user-submissions",
    "casino-listings/avatars"
  ];

  // Clean the folder string (remove leading/trailing slashes)
  let cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  
  if (!allowedFolders.includes(cleanFolder)) {
    throw new functions.https.HttpsError("invalid-argument", `Folder '${cleanFolder}' is not allowed.`);
  }

  const db = admin.firestore();
  const callerId = context.auth.uid;
  const userSnap = await db.collection("users").doc(callerId).get();
  
  const userRole = userSnap.exists ? (userSnap.data()?.role || "user") : "user";

  // Admin-only folders
  const adminFolders = [
    "casino-listings/logos",
    "casino-listings/banners",
    "casino-listings/jackpots"
  ];

  if (adminFolders.includes(cleanFolder)) {
    if (userRole !== "admin" && userRole !== "super_admin") {
      throw new functions.https.HttpsError("permission-denied", "Only administrators can upload to this folder.");
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Cloudinary configuration is missing on the server. Please check environment variables."
    );
  }

  const timestamp = clientTimestamp || Math.round(Date.now() / 1000);

  // Parameters to sign must be sorted alphabetically
  const paramsToSign: Record<string, any> = {
    folder: cleanFolder,
    timestamp: timestamp
  };

  const sortedParams = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");

  // Generate SHA-1 hex signature
  const signature = crypto
    .createHash("sha1")
    .update(sortedParams + apiSecret)
    .digest("hex");

  return {
    signature,
    timestamp,
    cloudName,
    apiKey,
    folder: cleanFolder
  };
});

