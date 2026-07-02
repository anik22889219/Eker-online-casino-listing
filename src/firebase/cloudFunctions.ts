import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./config";

// Lazy-initialize functions only if used
let functionsInstance: any = null;

export function getAppFunctions() {
  if (!functionsInstance) {
    try {
      functionsInstance = getFunctions(app);
    } catch (e) {
      console.warn("Could not initialize Firebase Functions:", e);
    }
  }
  return functionsInstance;
}

/**
 * Triggers server-side content generation using Gemini 2.5 Flash.
 * Returns { success, casinoId, slug, generationDuration, generatedData }
 */
export async function generateCasinoContent(affiliateLink: string, bannerImage?: string, casinoId?: string) {
  const functions = getAppFunctions();
  if (!functions) {
    throw new Error("Cloud Functions not initialized.");
  }

  const generate = httpsCallable(functions, "generateCasinoContent");
  const response = await generate({ affiliateLink, bannerImage, casinoId });
  return response.data as {
    success: boolean;
    casinoId: string;
    slug: string;
    generationDuration: number;
    generatedData: any;
  };
}

/**
 * Triggers rapid server-side crawling of website brand name and brand logo,
 * automatically uploading the found logo to Cloudinary.
 */
export async function crawlWebsiteLogoAndName(affiliateLink: string) {
  const functions = getAppFunctions();
  if (!functions) {
    throw new Error("Cloud Functions not initialized.");
  }

  const crawl = httpsCallable(functions, "crawlWebsiteLogoAndName");
  const response = await crawl({ affiliateLink });
  return response.data as {
    success: boolean;
    name: string;
    logoUrl: string;
  };
}

/**
 * Requests a secure upload signature from the Firebase Cloud Function to perform
 * a direct, signed upload to Cloudinary.
 */
export async function getCloudinarySignature(folder: string, timestamp?: number) {
  const functions = getAppFunctions();
  if (!functions) {
    throw new Error("Cloud Functions not initialized.");
  }

  const getSignature = httpsCallable(functions, "getCloudinarySignature");
  const response = await getSignature({ folder, timestamp });
  return response.data as {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  };
}

/**
 * Backward-compatible helper that proxies to the new generateCasinoContent function.
 */
export async function generateCasinoLandedPage(affiliateLink: string, bannerUrl?: string) {
  return generateCasinoContent(affiliateLink, bannerUrl);
}
