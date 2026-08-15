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
  if (url.includes("/f_auto,q_auto")) return url;
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}

/**
 * Safely converts and compresses a file/blob to a lightweight Base64 Data URL.
 */
export function fileToCompressedBase64(
  file: Blob | File,
  maxDimension = 800,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      reject(new Error("Provided input is not a valid File or Blob"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string" || !result) {
        reject(new Error("FileReader produced an empty or non-string result"));
        return;
      }

      // If already tiny or SVG, resolve directly
      if (file.type === "image/svg+xml" || file.size < 100000) {
        resolve(result);
        return;
      }

      // Downscale large raster images in browser
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(result);
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (canvasErr) {
          resolve(result);
        }
      };
      img.onerror = () => {
        resolve(result);
      };
      img.src = result;
    };

    reader.onerror = () => {
      const errMsg = reader.error?.message || "FileReader encountered an error reading image";
      reject(new Error(errMsg));
    };

    try {
      reader.readAsDataURL(file);
    } catch (err: any) {
      reject(new Error(`readAsDataURL failed: ${err?.message || err}`));
    }
  });
}

/**
 * Backwards compatible helper converting a file/blob to a Base64 data URL.
 */
export function fileToBase64(file: Blob | File): Promise<string> {
  return fileToCompressedBase64(file);
}

/**
 * Generates a SHA-1 hex digest natively in the browser using the Web Crypto API.
 */
async function generateSha1(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Universal Multi-Tier Upload System:
 * Tier 0: Express Server Upload Proxy (/api/upload-image)
 * Tier 1: Client-Side Direct Cloudinary Upload
 * Tier 2: Firebase Storage Fallback
 * Tier 3: Compressed Local Base64 Data URL Fallback
 */
export async function uploadToCloudinary(
  file: Blob | File,
  folderType: CloudinaryFolderType,
  fileName?: string
): Promise<string> {
  const targetFolder = FOLDER_MAPPINGS[folderType] || "casino-listings/misc";
  const nameToUse = fileName || `file_${Date.now()}`;

  // Pre-convert to compressed base64 so we always have a safe, instant fallback
  let base64Fallback = "";
  try {
    const maxDim = folderType === "logos" ? 600 : folderType === "banners" ? 1200 : 800;
    base64Fallback = await fileToCompressedBase64(file, maxDim, 0.85);
  } catch (e) {
    console.warn("Base64 pre-conversion failed:", e);
  }

  // Tier 0: Try Express Backend API Endpoint (/api/upload-image)
  if (base64Fallback) {
    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: base64Fallback,
          folderType,
          fileName: nameToUse,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.url) {
          console.log(`Uploaded image successfully via Server Proxy (${resData.provider})`);
          registerUploadedAsset(resData.url, folderType, file, fileName).catch((err) =>
            console.warn("Error registering uploaded asset:", err)
          );
          return resData.url;
        }
      }
    } catch (apiErr) {
      console.warn("Server upload API proxy skipped or failed:", apiErr);
    }
  }

  // Tier 1: Try Client-Side Direct Cloudinary Upload
  try {
    const timestamp = Math.round(Date.now() / 1000);
    let signatureData;

    const clientCloudName =
      (typeof process !== "undefined" && process.env?.CLOUDINARY_CLOUD_NAME) ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME);
    const clientApiKey =
      (typeof process !== "undefined" && process.env?.CLOUDINARY_API_KEY) ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CLOUDINARY_API_KEY);
    const clientApiSecret =
      (typeof process !== "undefined" && process.env?.CLOUDINARY_API_SECRET) ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CLOUDINARY_API_SECRET);

    if (clientCloudName && clientApiKey && clientApiSecret) {
      const stringToSign = `folder=${targetFolder}&timestamp=${timestamp}`;
      const signature = await generateSha1(stringToSign + clientApiSecret);
      signatureData = {
        signature,
        cloudName: clientCloudName,
        apiKey: clientApiKey,
        folder: targetFolder,
      };
    } else {
      signatureData = await getCloudinarySignature(targetFolder, timestamp);
    }

    if (signatureData && signatureData.cloudName && signatureData.apiKey) {
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
        const optimizedUrl = getOptimizedCloudinaryUrl(secureUrl);

        registerUploadedAsset(optimizedUrl, folderType, file, fileName).catch((err) =>
          console.warn("Error registering uploaded Cloudinary asset:", err)
        );

        return optimizedUrl;
      }
    }
  } catch (error) {
    console.warn("Cloudinary upload failed, trying fallback:", error);
  }

  // Tier 2: Try Firebase Storage Upload
  try {
    const storageFolder = STORAGE_FOLDER_MAPPINGS[folderType] || "misc";
    const storageRef = ref(storage, `${storageFolder}/${Date.now()}_${nameToUse}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log("Uploaded successfully to Firebase Storage fallback:", downloadUrl);

    registerUploadedAsset(downloadUrl, folderType, file, fileName).catch((err) =>
      console.warn("Error registering uploaded Firebase Storage asset:", err)
    );

    return downloadUrl;
  } catch (storageError) {
    console.warn("Firebase Storage fallback failed, using Base64 fallback:", storageError);
  }

  // Tier 3: Return Guaranteed Compressed Base64 Data URL Fallback
  if (base64Fallback) {
    console.log("Image loaded successfully as local compressed Base64 Data URL fallback.");
    registerUploadedAsset(base64Fallback, folderType, file, fileName).catch((err) =>
      console.warn("Error registering base64 asset:", err)
    );
    return base64Fallback;
  }

  const finalErr = new Error("All image upload tiers failed. Unable to read image content.");
  LoggingService.logUploadFailure(folderType, finalErr, { fileName: nameToUse });
  throw finalErr;
}

/**
 * Register successfully uploaded image metadata in Firestore mediaAssets collection.
 */
async function registerUploadedAsset(url: string, folderType: string, file: Blob | File, fileName?: string) {
  try {
    const { db } = await import("../firebase");
    const { auth } = await import("../firebase/auth");
    const { collection, addDoc } = await import("firebase/firestore");

    const nameToUse = fileName || (file instanceof File ? file.name : `file_${Date.now()}`);
    const dotIndex = nameToUse.lastIndexOf(".");
    const altText = dotIndex > 0 ? nameToUse.substring(0, dotIndex) : nameToUse;

    await addDoc(collection(db, "mediaAssets"), {
      url: url.startsWith("data:") ? url.substring(0, 100) + "..." : url, // avoid saving massive string in mediaAssets log doc
      name: nameToUse,
      alt: altText,
      folderType,
      uploadedAt: new Date().toISOString(),
      uploadedByEmail: auth.currentUser?.email || "Anonymous",
      uploadedByUid: auth.currentUser?.uid || "anonymous",
      fileSize: file instanceof File ? file.size : 0,
    });
  } catch (err) {
    console.warn("Failed to register media asset in Firestore:", err);
  }
}
