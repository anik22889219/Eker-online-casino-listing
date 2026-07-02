import { getCloudinarySignature } from "../firebase/cloudFunctions";
import { LoggingService } from "./LoggingService";
import { storage } from "../firebase/storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type CloudinaryFolderType = "logos" | "banners" | "jackpots" | "user-submissions" | "avatars";

const FOLDER_MAPPINGS: Record<CloudinaryFolderType, string> = {
  logos: "casino-listings/logos",
  banners: "casino-listings/banners",
  jackpots: "casino-listings/jackpots",
  "user-submissions": "casino-listings/user-submissions",
  avatars: "casino-listings/avatars",
};

const STORAGE_FOLDER_MAPPINGS: Record<CloudinaryFolderType, string> = {
  logos: "logos",
  banners: "banners",
  jackpots: "jackpots",
  "user-submissions": "screenshots",
  avatars: "avatars",
};

/**
 * Transforms a raw Cloudinary URL to include automatic format and quality optimization (f_auto, q_auto).
 */
export function getOptimizedCloudinaryUrl(url: string): string {
  if (!url || !url.includes("cloudinary.com")) return url;
  // If already optimized, don't duplicate
  if (url.includes("/f_auto,q_auto")) return url;
  
  // Inject f_auto,q_auto right after /upload/
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}

/**
 * Converts a file/blob to a Base64 data URL.
 */
export function fileToBase64(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a SHA-1 hex digest natively in the browser using the Web Crypto API.
 */
async function generateSha1(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Direct signed upload of a file/blob to Cloudinary.
 * Obtains a signature securely from our Firebase Cloud Function first.
 * Falls back to Firebase Storage or Base64 Data URL on failure.
 */
export async function uploadToCloudinary(
  file: Blob | File,
  folderType: CloudinaryFolderType,
  fileName?: string
): Promise<string> {
  const targetFolder = FOLDER_MAPPINGS[folderType];
  const nameToUse = fileName || `file_${Date.now()}`;
  if (!targetFolder) {
    const err = new Error(`Invalid folder type: ${folderType}`);
    LoggingService.logUploadFailure(folderType, err, { fileName: nameToUse });
    throw err;
  }

  // Tier 1: Try Cloudinary Signed Upload
  try {
    const timestamp = Math.round(Date.now() / 1000);
    
    let signatureData;
    const clientCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const clientApiKey = process.env.CLOUDINARY_API_KEY;
    const clientApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (clientCloudName && clientApiKey && clientApiSecret) {
      console.log("Generating secure Cloudinary signature locally on client...");
      const stringToSign = `folder=${targetFolder}&timestamp=${timestamp}`;
      const signature = await generateSha1(stringToSign + clientApiSecret);
      signatureData = {
        signature,
        cloudName: clientCloudName,
        apiKey: clientApiKey,
        folder: targetFolder,
      };
    } else {
      console.log("Requesting Cloudinary signature from Firebase Cloud Functions...");
      signatureData = await getCloudinarySignature(targetFolder, timestamp);
    }

    const { signature, cloudName, apiKey, folder } = signatureData;

    const formData = new FormData();
    formData.append("file", file, nameToUse);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const responseData = await response.json();
      const secureUrl = responseData.secure_url;
      return getOptimizedCloudinaryUrl(secureUrl);
    }
    
    const errorData = await response.json();
    console.warn("Cloudinary returned non-ok response, trying fallback:", errorData.error?.message);
  } catch (error) {
    console.warn("Cloudinary upload/signature failed, attempting Firebase Storage fallback:", error);
  }

  // Tier 2: Try Firebase Storage Upload
  try {
    const storageFolder = STORAGE_FOLDER_MAPPINGS[folderType] || "misc";
    const storageRef = ref(storage, `${storageFolder}/${Date.now()}_${nameToUse}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log("Uploaded successfully to Firebase Storage fallback:", downloadUrl);
    return downloadUrl;
  } catch (storageError) {
    console.warn("Firebase Storage fallback failed, attempting Base64 fallback:", storageError);
  }

  // Tier 3: Try Local Base64 Data URL Fallback
  try {
    const base64Url = await fileToBase64(file);
    console.log("Image loaded successfully as local Base64 fallback.");
    return base64Url;
  } catch (base64Error) {
    const finalErr = new Error(`All upload tiers failed. Base64: ${base64Error}`);
    LoggingService.logUploadFailure(folderType, finalErr, { fileName: nameToUse });
    throw finalErr;
  }
}
