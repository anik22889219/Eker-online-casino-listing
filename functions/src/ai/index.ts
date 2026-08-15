import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
import * as crypto from "crypto";

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
 * Validates whether a scraped URL actually exists and returns an image
 */
async function checkUrlIsLiveImage(url: string): Promise<boolean> {
  if (!url) return false;
  if (url.startsWith("data:")) return false;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(3000)
    });
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && (contentType.includes("image") || contentType.includes("octet-stream") || url.endsWith(".ico") || url.endsWith(".png") || url.endsWith(".svg"))) {
      return true;
    }
  } catch (e) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        return true;
      }
    } catch (err) {}
  }
  return false;
}

/**
 * Fetch logo using Logo/Favicon APIs (Highly reliable, bypasses Cloudflare)
 */
async function getLogoFromApis(domain: string): Promise<string | null> {
  const providers = [
    {
      name: "Google FaviconV2 API",
      url: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
    },
    {
      name: "Clearbit Logo API",
      url: `https://logo.clearbit.com/${domain}`
    },
    {
      name: "Google Standard Favicon API",
      url: `https://www.google.com/s2/favicons?sz=128&domain=${domain}`
    },
    {
      name: "Favicon Kit API",
      url: `https://api.faviconkit.com/${domain}/144`
    },
    {
      name: "DuckDuckGo Icon API",
      url: `https://icons.duckduckgo.com/ip3/${domain}.ico`
    }
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000)
      });
      const contentType = response.headers.get("content-type") || "";
      const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
      if (response.ok && contentType.includes("image") && contentLength > 300) {
        functions.logger.info(`  [✓] Logo found via ${provider.name} (length: ${contentLength})`);
        return provider.url;
      }
    } catch (e) {}

    try {
      const response = await fetch(provider.url, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000)
      });
      const contentType = response.headers.get("content-type") || "";
      const buffer = await response.arrayBuffer();
      const contentLength = buffer ? buffer.byteLength : 0;
      if (response.ok && contentType.includes("image") && contentLength > 300) {
        functions.logger.info(`  [✓] Logo found via ${provider.name} (GET fallback) (length: ${contentLength})`);
        return provider.url;
      }
    } catch (err) {}
  }
  return null;
}

/**
 * Attempts to fetch website metadata from the target affiliate URL.
 * Fails gracefully and returns a partial/empty object on error.
 */
async function fetchWebsiteMetadata(url: string) {
  try {
    let domain = "";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace("www.", "");
    } catch (e) {}

    // 1. Try fetching logo via general Favicon APIs first
    let apiLogo: string | null = null;
    if (domain) {
      apiLogo = await getLogoFromApis(domain);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000) // 10-second timeout
    });

    if (!response.ok) {
      return apiLogo ? { bestLogo: apiLogo } : {};
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
    const appleTouchIcon = getLink("apple-touch-icon") || getLink("apple-touch-icon-precomposed") || "";

    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    const resolveUrl = (baseUrl: string, targetPath: string) => {
      if (!targetPath) return "";
      try {
        return new URL(targetPath, baseUrl).href;
      } catch {
        return targetPath;
      }
    };

    // 2. Perform deep scans in HTML if apiLogo didn't work
    let bestLogo = apiLogo || "";

    if (!bestLogo && appleTouchIcon) {
      const resolved = resolveUrl(url, appleTouchIcon);
      if (await checkUrlIsLiveImage(resolved)) {
        bestLogo = resolved;
      }
    }

    if (!bestLogo && ogImage) {
      const resolved = resolveUrl(url, ogImage);
      if (await checkUrlIsLiveImage(resolved)) {
        bestLogo = resolved;
      }
    }

    // Scan img tags for logo keyword
    if (!bestLogo) {
      const imgRegex = /<img([^>]+)>/gi;
      let match;
      const logoCandidates: string[] = [];
      while ((match = imgRegex.exec(html)) !== null) {
        const attrsStr = match[1];
        const srcMatch = attrsStr.match(/src=["']([^"']+)["']/i);
        const dataSrcMatch = attrsStr.match(/(?:data-src|data-lazy-src|data-original|lazy-src|srcset)=["']([^"']+)["']/i);
        const altMatch = attrsStr.match(/alt=["']([^"']+)["']/i);
        const classMatch = attrsStr.match(/class=["']([^"']+)["']/i);

        const alt = altMatch ? altMatch[1].toLowerCase() : "";
        const className = classMatch ? classMatch[1].toLowerCase() : "";
        const src = srcMatch ? srcMatch[1] : "";
        const dataSrc = dataSrcMatch ? dataSrcMatch[1] : "";

        let imgUrl = "";
        if (dataSrc && !dataSrc.startsWith("data:")) {
          imgUrl = dataSrc;
        } else if (src && !src.startsWith("data:")) {
          imgUrl = src;
        }

        if (imgUrl) {
          const lowerUrl = imgUrl.toLowerCase();
          const isLogo = lowerUrl.includes("logo") || alt.includes("logo") || className.includes("logo") ||
                         lowerUrl.includes("brand") || alt.includes("brand") || className.includes("brand");
          if (isLogo) {
            const resolved = resolveUrl(url, imgUrl.trim());
            if (resolved) {
              logoCandidates.push(resolved);
            }
          }
        }
      }

      for (const cand of logoCandidates) {
        if (await checkUrlIsLiveImage(cand)) {
          bestLogo = cand;
          break;
        }
      }
    }

    // 3. Fallback: Search in Mobile App/SPA Bundles (Extremely powerful for modern casinos like 10tk688)
    if (!bestLogo) {
      try {
        functions.logger.info(`  [~] Cloud Function: Attempting Mobile SPA CSS deep search...`);
        const mobileIndexUrl = `${baseUrl}/m/index.html`;
        const mobileRes = await fetch(mobileIndexUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
          },
          signal: AbortSignal.timeout(5000)
        });
        if (mobileRes.ok) {
          const mHtml = await mobileRes.text();
          const cssMatches = mHtml.match(/href=["']([^"']+\.css)["']/gi);
          if (cssMatches) {
            for (const matchStr of cssMatches) {
              const cssPathMatch = matchStr.match(/href=["']([^"']+\.css)["']/i);
              if (cssPathMatch && cssPathMatch[1]) {
                const cssPath = cssPathMatch[1];
                let fullCssUrl = cssPath;
                if (cssPath.startsWith("/")) {
                  fullCssUrl = `${baseUrl}${cssPath}`;
                } else if (!cssPath.startsWith("http")) {
                  fullCssUrl = `${baseUrl}/m/${cssPath}`;
                }

                try {
                  const cssRes = await fetch(fullCssUrl, { signal: AbortSignal.timeout(4000) });
                  if (cssRes.ok) {
                    const cssContent = await cssRes.text();
                    const logoUrlMatch = cssContent.match(/url\(([^)]+?logo[^)]+?)\)/i);
                    if (logoUrlMatch) {
                      const cleanedLogoPath = logoUrlMatch[1].replace(/['"]/g, "").trim();
                      let resolvedLogoUrl = cleanedLogoPath;
                      if (cleanedLogoPath.startsWith("/")) {
                        resolvedLogoUrl = `${baseUrl}${cleanedLogoPath}`;
                      } else if (!cleanedLogoPath.startsWith("http")) {
                        resolvedLogoUrl = `${baseUrl}/m/${cleanedLogoPath}`;
                      }

                      if (await checkUrlIsLiveImage(resolvedLogoUrl)) {
                        functions.logger.info(`  [✓] SPA logo extracted from CSS: ${resolvedLogoUrl}`);
                        bestLogo = resolvedLogoUrl;
                        break;
                      }
                    }
                  }
                } catch (cssErr) {}
              }
            }
          }
        }
      } catch (mobileErr) {}
    }

    if (!bestLogo && favicon) {
      bestLogo = resolveUrl(url, favicon);
    }
    if (!bestLogo) {
      bestLogo = resolveUrl(url, "/favicon.ico");
    }

    return {
      title: ogTitle || title,
      description,
      ogImage: resolveUrl(url, ogImage),
      favicon: resolveUrl(url, favicon),
      canonical: resolveUrl(url, canonical),
      bestLogo: resolveUrl(url, bestLogo)
    };
  } catch (error) {
    functions.logger.warn(`Failed to fetch metadata from ${url}:`, error);
    return {};
  }
}

/**
 * Uploads a remote file/image URL directly to Cloudinary using secure server-side signing.
 */
async function uploadUrlToCloudinary(imageUrl: string, folder: string): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    functions.logger.warn("Cloudinary configuration is missing on the server. Skipping upload.");
    return null;
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      folder: folder,
      timestamp: timestamp
    };

    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${(paramsToSign as any)[key]}`)
      .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(sortedParams + apiSecret)
      .digest("hex");

    const formData = new URLSearchParams();
    formData.append("file", imageUrl);
    formData.append("folder", folder);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      functions.logger.warn(`Cloudinary upload failed with status ${response.status}: ${errorText}`);
      return null;
    }

    const json = await response.json() as any;
    if (json && json.secure_url) {
      functions.logger.info(`Successfully uploaded logo to Cloudinary: ${json.secure_url}`);
      return json.secure_url;
    }
    return null;
  } catch (error) {
    functions.logger.error("Error uploading image to Cloudinary from server:", error);
    return null;
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

  // Determine Logo Status and upload to Cloudinary
  const logoUrl = metadata.bestLogo || metadata.favicon || metadata.ogImage || "";
  let finalLogoUrl = logoUrl;
  let logoStatus = logoUrl ? "found" : "missing";

  if (logoUrl) {
    functions.logger.info(`Uploading extracted website logo ${logoUrl} to Cloudinary...`);
    const uploadedLogo = await uploadUrlToCloudinary(logoUrl, "casino-listings/logos");
    if (uploadedLogo) {
      finalLogoUrl = uploadedLogo;
      logoStatus = "found";
    }
  }

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
    casinoLogo: finalLogoUrl,
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

/**
 * Callable function to crawl website brand name and brand logo on-demand.
 * Used during manual creation or live preview of website assets.
 */
export const crawlWebsiteLogoAndName = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication is required.");
  }

  const { affiliateLink } = data;
  if (!affiliateLink) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required affiliateLink parameter.");
  }

  if (!isValidUrl(affiliateLink)) {
    throw new functions.https.HttpsError("invalid-argument", "The provided affiliate link is not a valid HTTP or HTTPS URL.");
  }

  functions.logger.info(`On-demand asset crawling requested for URL: ${affiliateLink}`);
  const metadata = await fetchWebsiteMetadata(affiliateLink);

  // Extract clean name from title
  let name = metadata.title || "";
  if (name) {
    // Standard cleaning of titles: "Brand Name | Best Online Casino" -> "Brand Name"
    if (name.includes("|")) {
      name = name.split("|")[0].trim();
    } else if (name.includes("-")) {
      name = name.split("-")[0].trim();
    } else if (name.includes("–")) {
      name = name.split("–")[0].trim();
    }
  }

  // Fallback to hostname if title is empty
  if (!name) {
    try {
      const urlObj = new URL(affiliateLink);
      const host = urlObj.hostname.replace("www.", "");
      const part = host.split(".")[0];
      name = part.charAt(0).toUpperCase() + part.slice(1);
    } catch {
      name = "New Casino";
    }
  }

  const logoUrl = metadata.bestLogo || metadata.favicon || metadata.ogImage || "";
  let finalLogoUrl = logoUrl;

  if (logoUrl) {
    functions.logger.info(`Uploading on-demand extracted website logo ${logoUrl} to Cloudinary...`);
    const uploadedLogo = await uploadUrlToCloudinary(logoUrl, "casino-listings/logos");
    if (uploadedLogo) {
      finalLogoUrl = uploadedLogo;
    }
  }

  return {
    success: true,
    name,
    logoUrl: finalLogoUrl
  };
});

/**
 * Callable function to analyze an uploaded banner image and automatically find/extract 
 * the Deal Promo Tag / Welcome Slogan using Gemini 2.5 Flash.
 */
export const extractPromoFromBanner = functions.https.onCall(async (data, context) => {
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

  const { bannerImageUrl } = data;
  if (!bannerImageUrl) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required bannerImageUrl parameter.");
  }

  if (!isValidUrl(bannerImageUrl)) {
    throw new functions.https.HttpsError("invalid-argument", "The provided banner image URL is not valid.");
  }

  functions.logger.info(`Extracting promo deal/slogan from banner image: ${bannerImageUrl}`);

  let base64Data = "";
  let mimeType = "image/jpeg";
  try {
    const response = await fetch(bannerImageUrl, {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: status ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    mimeType = contentType;
    const arrayBuffer = await response.arrayBuffer();
    base64Data = Buffer.from(arrayBuffer).toString("base64");
  } catch (err: any) {
    functions.logger.error("Failed to download or convert banner image:", err);
    throw new functions.https.HttpsError("internal", `Failed to process banner image: ${err.message || err}`);
  }

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
      welcomeSlogan: { 
        type: Type.STRING, 
        description: "The primary deal promotion tag, welcome slogan, or bonus offer visible in the banner image. Ensure it is clean, catchy, and represents the key offer (e.g., '100% Up To $1000 + 50 Free Spins' or '10% Weekly Cashback'). Extract only what is written or strongly implied in the banner image. Keep it concise." 
      }
    },
    required: ["welcomeSlogan"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        },
        "Analyze this casino promotion banner image. Identify and extract the main welcome bonus offer, promotion deal, or welcome slogan displayed on it. Return a clean, concise, and catchy promo tag or slogan representing the offer, like '100% Up To $1000' or '$500 Welcome Bonus' or similar."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty text returned from Gemini API.");
    }

    const output = JSON.parse(text.trim());
    return {
      success: true,
      welcomeSlogan: output.welcomeSlogan || "Exclusive Deposit Bonus"
    };
  } catch (error: any) {
    functions.logger.error("Gemini welcome slogan extraction failed:", error);
    if (error?.message?.includes("quota") || error?.message?.includes("429")) {
      throw new functions.https.HttpsError("resource-exhausted", "Gemini API quota exceeded. Please try again later.");
    }
    throw new functions.https.HttpsError("internal", `Gemini extraction failed: ${error?.message || error}`);
  }
});

