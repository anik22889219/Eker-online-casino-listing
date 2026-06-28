import { getCloudinarySignature } from "../firebase/cloudFunctions";
import { LoggingService } from "./LoggingService";

export type CloudinaryFolderType = "logos" | "banners" | "jackpots" | "user-submissions" | "avatars";

const FOLDER_MAPPINGS: Record<CloudinaryFolderType, string> = {
  logos: "casino-listings/logos",
  banners: "casino-listings/banners",
  jackpots: "casino-listings/jackpots",
  "user-submissions": "casino-listings/user-submissions",
  avatars: "casino-listings/avatars",
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
 * Direct signed upload of a file/blob to Cloudinary.
 * Obtains a signature securely from our Firebase Cloud Function first.
 */
export async function uploadToCloudinary(
  file: Blob | File,
  folderType: CloudinaryFolderType,
  fileName?: string
): Promise<string> {
  const targetFolder = FOLDER_MAPPINGS[folderType];
  if (!targetFolder) {
    const err = new Error(`Invalid folder type: ${folderType}`);
    LoggingService.logUploadFailure(folderType, err, { fileName });
    throw err;
  }

  try {
    // 1. Get secure signature from cloud function
    const timestamp = Math.round(Date.now() / 1000);
    const signatureData = await getCloudinarySignature(targetFolder, timestamp);
    const { signature, cloudName, apiKey, folder } = signatureData;

    // 2. Prepare Form Data for direct upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file, fileName || `file_${Date.now()}`);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);

    // 3. Perform direct HTTPS upload
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Cloudinary upload failed: ${errorData.error?.message || response.statusText}`
      );
    }

    const responseData = await response.json();
    const secureUrl = responseData.secure_url;
    
    // 4. Return the automatically optimized URL
    return getOptimizedCloudinaryUrl(secureUrl);
  } catch (error) {
    LoggingService.logUploadFailure(folderType, error, { fileName });
    throw error;
  }
}
