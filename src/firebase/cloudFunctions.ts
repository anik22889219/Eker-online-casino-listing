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
  const response = await fetch("/api/generate-casino-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ affiliateLink, bannerImage, casinoId })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to generate AI content from server.");
  }
  return await response.json() as {
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
  const response = await fetch("/api/crawl-website", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ affiliateLink })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to crawl brand assets from server.");
  }
  return await response.json() as {
    success: boolean;
    name: string;
    logoUrl: string;
  };
}

/**
 * Triggers server-side banner image promo deal extraction using Gemini.
 * Returns { success, welcomeSlogan }
 */
export async function extractPromoFromBanner(bannerImageUrl: string) {
  const response = await fetch("/api/extract-promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bannerImageUrl })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to extract tagline from server.");
  }
  return await response.json() as {
    success: boolean;
    welcomeSlogan: string;
  };
}

/**
 * Sends a self-healing and asset refresh request for a specific casino ID.
 * Automatically recovers missing logo, tagline/welcomeSlogan, description, banner, etc.
 */
export async function refreshCasinoAssets(casinoId: string) {
  const response = await fetch("/api/refresh-casino", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ casinoId })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to refresh and heal casino assets.");
  }
  return await response.json() as {
    success: boolean;
    healedFields: string[];
    updatedCasino: any;
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
