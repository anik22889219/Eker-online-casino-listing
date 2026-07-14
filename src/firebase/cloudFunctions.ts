import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./config";
import { db } from "./firestore";
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

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
  
  const result = await response.json() as {
    success: boolean;
    casinoId: string;
    slug: string;
    generatedData: any;
    casinoPayload: any;
  };

  if (!result.success || !result.casinoPayload) {
    throw new Error("Failed to compile AI content payload from server.");
  }

  const start = Date.now();
  let finalCasinoId = casinoId || "";
  const payload = { ...result.casinoPayload };

  if (finalCasinoId) {
    // Update existing document
    const docRef = doc(db, "casinos", finalCasinoId);
    payload.updatedAt = serverTimestamp();
    await updateDoc(docRef, payload);
  } else {
    // Check slug conflict
    let finalSlug = payload.slug;
    const q = query(collection(db, "casinos"), where("slug", "==", finalSlug));
    const slugConflictSnap = await getDocs(q);
    if (!slugConflictSnap.empty) {
      finalSlug = `${payload.slug}-${Math.random().toString(36).substring(2, 6)}`;
      payload.slug = finalSlug;
    }

    payload.createdAt = serverTimestamp();
    payload.updatedAt = serverTimestamp();
    payload.featured = false;
    payload.averageRating = 5;
    payload.totalReviews = 1;

    const docRef = await addDoc(collection(db, "casinos"), payload);
    finalCasinoId = docRef.id;
  }

  const duration = Date.now() - start;

  return {
    success: true,
    casinoId: finalCasinoId,
    slug: payload.slug,
    generationDuration: duration,
    generatedData: result.generatedData
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
export async function refreshCasinoAssets(
  casinoId: string,
  options?: { selectedTasks?: string[]; forceOverwrite?: boolean }
) {
  if (!casinoId) {
    throw new Error("Missing casinoId.");
  }

  // 1. Read current casino document directly from client-side Firestore
  const docRef = doc(db, "casinos", casinoId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Casino listing not found.");
  }
  const casinoData = docSnap.data();

  // 2. Call backend API to crawl, analyze, and heal the fields, passing the casino data and options
  const response = await fetch("/api/refresh-casino", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ casinoId, casino: casinoData, options })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to refresh and heal casino assets.");
  }

  const result = await response.json() as {
    success: boolean;
    healedFields: string[];
    updates: any;
  };

  if (!result.success || !result.updates) {
    throw new Error("Failed to receive healed updates from server.");
  }

  // 3. Save updates directly from client side
  if (Object.keys(result.updates).length > 0) {
    const finalUpdates = {
      ...result.updates,
      updatedAt: serverTimestamp()
    };
    await updateDoc(docRef, finalUpdates);
  }

  // Retrieve the fully healed and updated document to return back
  const updatedSnap = await getDoc(docRef);
  const updatedCasino = { id: updatedSnap.id, ...updatedSnap.data() };

  return {
    success: true,
    healedFields: result.healedFields,
    updatedCasino
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
