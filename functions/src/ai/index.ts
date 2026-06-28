import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Validates if a string is a valid HTTP or HTTPS URL
 */
function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Attempts to fetch website metadata from the target affiliate URL.
 * Fails gracefully and returns a partial/empty object on error.
 */
async function fetchWebsiteMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000) // 10-second timeout
    });

    if (!response.ok) {
      return {};
    }

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const getMeta = (nameOrProperty: string) => {
      const regex = new RegExp(`<meta[^>]*?(?:name|property)=["']${nameOrProperty}["'][^>]*?content=["']([\\s\\S]*?)["']`, "i");
      const match = html.match(regex);
      if (match) return match[1].trim();

      const regexReverse = new RegExp(`<meta[^>]*?content=["']([\\s\\S]*?)["'][^>]*?(?:name|property)=["']${nameOrProperty}["']`, "i");
      const matchReverse = html.match(regexReverse);
      return matchReverse ? matchReverse[1].trim() : "";
    };

    const getLink = (rel: string) => {
      const regex = new RegExp(`<link[^>]*?rel=["'](?:shortcut )?${rel}["'][^>]*?href=["']([\\s\\S]*?)["']`, "i");
      const match = html.match(regex);
      if (match) return match[1].trim();

      const regexReverse = new RegExp(`<link[^>]*?href=["']([\\s\\S]*?)["'][^>]*?rel=["'](?:shortcut )?${rel}["']`, "i");
      const matchReverse = html.match(regexReverse);
      return matchReverse ? matchReverse[1].trim() : "";
    };

    const description = getMeta("description") || getMeta("og:description") || "";
    const ogImage = getMeta("og:image") || "";
    const ogTitle = getMeta("og:title") || "";
    const favicon = getLink("icon") || "/favicon.ico";
    const canonical = getLink("canonical") || "";

    const resolveUrl = (baseUrl: string, targetPath: string) => {
      if (!targetPath) return "";
      try {
        return new URL(targetPath, baseUrl).href;
      } catch {
        return targetPath;
      }
    };

    return {
      title: ogTitle || title,
      description,
      ogImage: resolveUrl(url, ogImage),
      favicon: resolveUrl(url, favicon),
      canonical: resolveUrl(url, canonical)
    };
  } catch (error) {
    functions.logger.warn(`Failed to fetch metadata from ${url}:`, error);
    return {};
  }
}

/**
 * Callable function to trigger content generation using Gemini 2.5 Flash.
 * Securely authenticates admin status, parses metadata, generates content, saves the draft, and logs history.
 */
export const generateCasinoContent = functions.https.onCall(async (data, context) => {
  // 1. Authenticate caller and enforce Admin/Super Admin authorization
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const db = admin.firestore();
  const callerId = context.auth.uid;

  const userSnap = await db.collection("users").doc(callerId).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("permission-denied", "User profile not found.");
  }

  const userRole = userSnap.data()?.role;
  if (userRole !== "admin" && userRole !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only administrators can trigger AI content generation.");
  }

  // 2. Validate input parameters
  const { affiliateLink, bannerImage, casinoId } = data;
  if (!affiliateLink) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required affiliateLink parameter.");
  }

  if (!isValidUrl(affiliateLink)) {
    throw new functions.https.HttpsError("invalid-argument", "The provided affiliate link is not a valid HTTP or HTTPS URL.");
  }

  const startTime = Date.now();
  const modelName = "gemini-2.5-flash";

  // 3. Extract Website Metadata (Step 2)
  functions.logger.info(`Extracting metadata for URL: ${affiliateLink}`);
  const metadata = await fetchWebsiteMetadata(affiliateLink);

  // Determine Logo Status
  const logoUrl = metadata.favicon || metadata.ogImage || "";
  const logoStatus = logoUrl ? "found" : "missing";

  // 4. Invoke Gemini 2.5 Flash via @google/genai SDK (Step 3)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError("failed-precondition", "Gemini API configuration is missing on the server.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      casinoName: { type: Type.STRING, description: "Official, clean name of the casino" },
      shortDescription: { type: Type.STRING, description: "A concise, engaging 1-2 sentence description of the casino" },
      landingPageIntroduction: { type: Type.STRING, description: "A highly welcoming introduction introduction for the casino's lander" },
      featureHighlights: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "3 to 5 key features, exclusive rewards, or distinct advantages" 
      },
      pros: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of constructive positive points" 
      },
      cons: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of constructive drawbacks or limitations (keep it professional)" 
      },
      faq: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["question", "answer"]
        },
        description: "3 to 5 relevant frequently asked questions and clear answers"
      },
      seoTitle: { type: Type.STRING, description: "Optimized title under 60 characters" },
      metaDescription: { type: Type.STRING, description: "Optimized meta description under 160 characters" },
      suggestedKeywords: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "List of high-traffic search terms relevant to this casino brand" 
      },
      suggestedSlug: { type: Type.STRING, description: "SEO-friendly URL slug (lowercase, alphanumeric, and hyphens only)" }
    },
    required: [
      "casinoName", 
      "shortDescription", 
      "landingPageIntroduction", 
      "featureHighlights", 
      "pros", 
      "cons", 
      "faq", 
      "seoTitle", 
      "metaDescription", 
      "suggestedKeywords", 
      "suggestedSlug"
    ]
  };

  const systemInstruction = `You are an expert online casino listing directory curator. 
Analyze the provided website metadata and affiliate URL to compile highly professional, accurate, and SEO-optimized directory landing content.
Never fabricate promotions, certifications, payout speeds, or customer reviews that are not explicitly present or verifiable.
If specific features or facts are uncertain, clearly state that they could not be verified. 
Generate content strictly matching the required JSON schema structure.`;

  const promptText = `
Generate directory draft details based on this metadata:
- Affiliate URL: ${affiliateLink}
- Extracted Website Title: ${metadata.title || "Unknown"}
- Extracted Meta Description: ${metadata.description || "Unknown"}
- Extracted Canonical URL: ${metadata.canonical || "Unknown"}
`;

  let geminiOutput: any = null;
  try {
    functions.logger.info(`Sending generation request to Gemini model: ${modelName}`);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty text returned from Gemini API.");
    }

    geminiOutput = JSON.parse(text.trim());
  } catch (error: any) {
    functions.logger.error("Gemini invocation failed:", error);
    if (error?.message?.includes("quota") || error?.message?.includes("429")) {
      throw new functions.https.HttpsError("resource-exhausted", "Gemini API quota exceeded. Please try again later.");
    }
    throw new functions.https.HttpsError("internal", `Gemini generation failed: ${error?.message || error}`);
  }

  // 5. Build/Update Casino Draft Document
  let targetCasinoId = casinoId || "";
  const suggestedSlug = geminiOutput.suggestedSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  // Format landingContent from generated parts
  const formattedLandingContent = `
# Welcome to ${geminiOutput.casinoName}

${geminiOutput.landingPageIntroduction}

## Key Feature Highlights
${geminiOutput.featureHighlights.map((feat: string) => `- ${feat}`).join("\n")}

## Pros & Cons
### Pros
${geminiOutput.pros.map((pro: string) => `- ${pro}`).join("\n")}

### Cons
${geminiOutput.cons.map((con: string) => `- ${con}`).join("\n")}

## Frequently Asked Questions
${geminiOutput.faq.map((item: any) => `### Q: ${item.question}\n${item.answer}`).join("\n\n")}
`.trim();

  const casinoPayload: any = {
    slug: suggestedSlug,
    affiliateLink,
    casinoName: geminiOutput.casinoName,
    casinoLogo: logoUrl,
    logoStatus,
    bannerImage: bannerImage || "",
    shortDescription: geminiOutput.shortDescription,
    landingContent: formattedLandingContent,
    welcomeBonus: geminiOutput.featureHighlights[0] || "Generous Welcome Bonus",
    seoTitle: geminiOutput.seoTitle,
    metaDescription: geminiOutput.metaDescription,
    keywords: geminiOutput.suggestedKeywords,
    status: "ai_generated", // Draft state
    aiGenerated: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (targetCasinoId) {
    // Regeneration Path: Update the existing document
    functions.logger.info(`Updating existing casino listing draft with ID: ${targetCasinoId}`);
    const docRef = db.collection("casinos").doc(targetCasinoId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      throw new functions.https.HttpsError("not-found", `No casino listing found with ID: ${targetCasinoId}`);
    }

    // Preserve original fields like manualReview and createdAt
    await docRef.update(casinoPayload);
  } else {
    // New Creation Path
    functions.logger.info(`Creating a new casino listing draft with slug: ${suggestedSlug}`);
    
    // Check if slug is unique, append unique suffix if conflict exists
    let finalSlug = suggestedSlug;
    const slugConflictSnap = await db.collection("casinos").where("slug", "==", finalSlug).get();
    if (!slugConflictSnap.empty) {
      const suffix = Math.random().toString(36).substring(2, 6);
      finalSlug = `${suggestedSlug}-${suffix}`;
      casinoPayload.slug = finalSlug;
    }

    casinoPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    casinoPayload.featured = false;
    casinoPayload.averageRating = 0;
    casinoPayload.totalReviews = 0;

    const newDocRef = await db.collection("casinos").add(casinoPayload);
    targetCasinoId = newDocRef.id;
  }

  // 6. Log Audit Record in aiHistory Collection (Regenerate action support)
  const generationDuration = Date.now() - startTime;
  const historyPayload = {
    casinoId: targetCasinoId,
    prompt: promptText,
    response: JSON.stringify(geminiOutput),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: callerId,
    generationDuration,
    modelVersion: modelName
  };

  functions.logger.info(`Logging AI History audit entry for casino: ${targetCasinoId}`);
  await db.collection("aiHistory").add(historyPayload);

  return {
    success: true,
    casinoId: targetCasinoId,
    slug: casinoPayload.slug,
    generationDuration,
    generatedData: geminiOutput
  };
});
