import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

let db: ReturnType<typeof getFirestore>;

// Initialize Firebase Admin safely
try {
  const serviceAccountPath = path.join(process.cwd(), "scripts/serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("[Firebase] Initialized with Service Account Key.");
  } else {
    initializeApp();
    console.log("[Firebase] Initialized with default credentials.");
  }
  db = getFirestore();
} catch (err) {
  console.warn("[Firebase] Admin initialization warning:", err);
  db = getFirestore();
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Validates if a string is a valid HTTP or HTTPS URL
function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Helper: Check if a URL returns an image
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

// Helper: Fetch logo using Logo/Favicon APIs (Highly reliable, bypasses Cloudflare)
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
        return provider.url;
      }
    } catch (err) {}
  }
  return null;
}

// Helper: Scrape target website metadata
async function fetchWebsiteMetadata(url: string) {
  try {
    let domain = "";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname.replace("www.", "");
    } catch (e) {}

    let apiLogo: string | null = null;
    if (domain) {
      apiLogo = await getLogoFromApis(domain);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000)
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

    const resolveUrl = (baseUrlStr: string, targetPath: string) => {
      if (!targetPath) return "";
      try {
        return new URL(targetPath, baseUrlStr).href;
      } catch {
        return targetPath;
      }
    };

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
    console.warn(`Failed to fetch metadata from ${url}:`, error);
    return {};
  }
}

// Helper: Secure server-side Cloudinary upload
async function uploadUrlToCloudinary(imageUrl: string, folder: string): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("Cloudinary configuration is missing. Returning raw logo URL.");
    return imageUrl;
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
      console.warn(`Cloudinary upload failed: ${errorText}`);
      return imageUrl;
    }

    const json = await response.json() as any;
    if (json && json.secure_url) {
      return json.secure_url;
    }
    return imageUrl;
  } catch (error) {
    console.error("Error uploading logo to Cloudinary:", error);
    return imageUrl;
  }
}

/* ==========================================================================
   EXPRESS API ROUTE ENDPOINTS
   ========================================================================== */

// Cloudinary 1. Fetch all uploaded Cloudinary assets
app.get("/api/cloudinary-assets", async (req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(200).json({
        success: false,
        error: "Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not set in the environment variables."
      });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=500`;

    const response = await fetch(cloudinaryUrl, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary Admin API error:", errorText);
      return res.status(response.status).json({
        success: false,
        error: `Cloudinary API error: ${errorText}`
      });
    }

    const data = await response.json() as any;
    return res.json({
      success: true,
      resources: data.resources || []
    });
  } catch (error: any) {
    console.error("Failed to fetch Cloudinary assets in server:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch Cloudinary resources."
    });
  }
});

// Cloudinary 2. Delete a Cloudinary asset by public_id
app.post("/api/cloudinary-assets/delete", async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, error: "Missing required publicId parameter." });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: "Cloudinary credentials are not configured in environment variables."
      });
    }

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?public_ids[]=${encodeURIComponent(publicId)}`;

    const response = await fetch(cloudinaryUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary Delete API error:", errorText);
      return res.status(response.status).json({
        success: false,
        error: `Cloudinary delete error: ${errorText}`
      });
    }

    const data = await response.json() as any;
    return res.json({
      success: true,
      deleted: data.deleted || {}
    });
  } catch (error: any) {
    console.error("Failed to delete Cloudinary asset:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete Cloudinary resource."
    });
  }
});

// 1. Crawl Brand Name and Logo from Affiliate Link
app.post("/api/crawl-website", async (req, res) => {
  const { affiliateLink } = req.body;
  if (!affiliateLink) {
    return res.status(400).json({ success: false, error: "Missing required affiliateLink" });
  }

  if (!isValidUrl(affiliateLink)) {
    return res.status(400).json({ success: false, error: "Invalid URL provided." });
  }

  console.log(`[Crawler] Scraping: ${affiliateLink}`);
  const metadata = await fetchWebsiteMetadata(affiliateLink);

  let name = metadata.title || "";
  if (name) {
    if (name.includes("|")) {
      name = name.split("|")[0].trim();
    } else if (name.includes("-")) {
      name = name.split("-")[0].trim();
    } else if (name.includes("–")) {
      name = name.split("–")[0].trim();
    }
  }

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
    try {
      console.log(`[Crawler] Uploading extracted logo to Cloudinary: ${logoUrl}`);
      const uploaded = await uploadUrlToCloudinary(logoUrl, "casino-listings/logos");
      if (uploaded) {
        finalLogoUrl = uploaded;
      }
    } catch (e) {
      console.warn("Cloudinary fallback failed:", e);
    }
  }

  return res.json({
    success: true,
    name,
    logoUrl: finalLogoUrl
  });
});

// 2. Extract Tagline / Welcome Slogan from Banner Image using Gemini 2.5 Flash
app.post("/api/extract-promo", async (req, res) => {
  const { bannerImageUrl } = req.body;
  if (!bannerImageUrl) {
    return res.status(400).json({ success: false, error: "Missing bannerImageUrl parameter." });
  }

  console.log(`[Gemini] Extracting promo slogan from: ${bannerImageUrl}`);

  let base64Data = "";
  let mimeType = "image/jpeg";
  try {
    const response = await fetch(bannerImageUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`Failed to download image: status ${response.status}`);
    }
    mimeType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    base64Data = Buffer.from(arrayBuffer).toString("base64");
  } catch (err: any) {
    console.error("Failed to process banner image:", err);
    return res.status(500).json({ success: false, error: `Failed to download banner image: ${err.message || err}` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "Gemini API key is not configured on the server." });
  }

  const ai = new GoogleGenAI({ apiKey });

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
    const result = await ai.models.generateContent({
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

    const text = result.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const output = JSON.parse(text.trim());
    return res.json({
      success: true,
      welcomeSlogan: output.welcomeSlogan || "Exclusive Deposit Bonus"
    });
  } catch (error: any) {
    console.error("Gemini tagline extraction failed:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to parse tagline." });
  }
});

// 3. Generate Full AI Content
app.post("/api/generate-casino-content", async (req, res) => {
  const { affiliateLink, bannerImage, casinoId } = req.body;
  if (!affiliateLink) {
    return res.status(400).json({ success: false, error: "Missing affiliateLink parameter." });
  }

  console.log(`[Gemini] Generating full AI content for: ${affiliateLink}`);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "Gemini API key is not configured on the server." });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const metadata = await fetchWebsiteMetadata(affiliateLink);

    // Determine Logo Status and upload to Cloudinary
    const logoUrl = metadata.bestLogo || metadata.favicon || metadata.ogImage || "";
    let finalLogoUrl = logoUrl;
    let logoStatus = logoUrl ? "found" : "missing";

    if (logoUrl) {
      const uploaded = await uploadUrlToCloudinary(logoUrl, "casino-listings/logos");
      if (uploaded) {
        finalLogoUrl = uploaded;
        logoStatus = "found";
      }
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        casinoName: { type: Type.STRING, description: "Official, clean name of the casino" },
        shortDescription: { type: Type.STRING, description: "A concise, engaging 1-2 sentence description of the casino" },
        landingPageIntroduction: { type: Type.STRING, description: "A highly welcoming introduction for the casino's lander" },
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
Never fabricate promotions, certifications, payout speeds, or customer reviews that are not explicitly present or verifiable.`;

    const promptText = `
Generate directory draft details based on this metadata:
- Affiliate URL: ${affiliateLink}
- Extracted Website Title: ${metadata.title || "Unknown"}
- Extracted Meta Description: ${metadata.description || "Unknown"}
- Extracted Canonical URL: ${metadata.canonical || "Unknown"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini Content Generator.");
    }

    const geminiOutput = JSON.parse(text.trim());
    const suggestedSlug = geminiOutput.suggestedSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

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
      status: "ai_generated",
      aiGenerated: true,
      updatedAt: FieldValue.serverTimestamp()
    };

    let targetCasinoId = casinoId || "";
    if (targetCasinoId) {
      const docRef = db.collection("casinos").doc(targetCasinoId);
      await docRef.update(casinoPayload);
    } else {
      let finalSlug = suggestedSlug;
      const slugConflictSnap = await db.collection("casinos").where("slug", "==", finalSlug).get();
      if (!slugConflictSnap.empty) {
        finalSlug = `${suggestedSlug}-${Math.random().toString(36).substring(2, 6)}`;
        casinoPayload.slug = finalSlug;
      }

      casinoPayload.createdAt = FieldValue.serverTimestamp();
      casinoPayload.featured = false;
      casinoPayload.averageRating = 5;
      casinoPayload.totalReviews = 1;

      const newDocRef = await db.collection("casinos").add(casinoPayload);
      targetCasinoId = newDocRef.id;
    }

    return res.json({
      success: true,
      casinoId: targetCasinoId,
      slug: casinoPayload.slug,
      generatedData: geminiOutput
    });
  } catch (error: any) {
    console.error("Gemini full content compilation failed:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to generate AI content." });
  }
});

// 4. Smart Self-Healing & Refresh Casino Assets
app.post("/api/refresh-casino", async (req, res) => {
  const { casinoId } = req.body;
  if (!casinoId) {
    return res.status(400).json({ success: false, error: "Missing casinoId parameter." });
  }

  console.log(`[Self-Heal] Refreshing & healing casino assets for ID: ${casinoId}`);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "Gemini API key is not configured on the server." });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const docRef = db.collection("casinos").doc(casinoId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "Casino listing not found." });
    }

    const casino = docSnap.data() as any;
    const affiliateLink = casino.affiliateLink;
    if (!affiliateLink) {
      return res.status(400).json({ success: false, error: "Casino has no affiliate target link configured." });
    }

    // 1. Fetch live website metadata
    const metadata = await fetchWebsiteMetadata(affiliateLink);
    const healedFields: string[] = [];
    const updates: any = {};

    // 2. Heal Brand Name if empty or generic
    let name = casino.casinoName || "";
    if (!name || name === "New Casino" || name.trim() === "") {
      name = metadata.title || "";
      if (name) {
        if (name.includes("|")) name = name.split("|")[0].trim();
        else if (name.includes("-")) name = name.split("-")[0].trim();
        else if (name.includes("–")) name = name.split("–")[0].trim();
      }
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
      updates.casinoName = name;
      healedFields.push(`Brand Name restored to: "${name}"`);
    }

    // 3. Heal Brand Logo if missing, empty or placeholder
    const currentLogo = casino.casinoLogo || "";
    const isLogoMissing = !currentLogo || currentLogo.includes("no-logo") || casino.logoStatus === "missing";
    if (isLogoMissing) {
      const extractedLogoUrl = metadata.bestLogo || metadata.favicon || metadata.ogImage || "";
      if (extractedLogoUrl) {
        console.log(`[Self-Heal] Extracted logo candidate: ${extractedLogoUrl}`);
        const uploaded = await uploadUrlToCloudinary(extractedLogoUrl, "casino-listings/logos");
        if (uploaded) {
          updates.casinoLogo = uploaded;
          updates.logoStatus = "found";
          healedFields.push("Brand Logo recovered & optimized via Cloudinary");
        }
      } else {
        // Fallback: search Logo APIs directly
        try {
          const urlObj = new URL(affiliateLink);
          const domain = urlObj.hostname.replace("www.", "");
          const apiLogo = await getLogoFromApis(domain);
          if (apiLogo) {
            const uploaded = await uploadUrlToCloudinary(apiLogo, "casino-listings/logos");
            if (uploaded) {
              updates.casinoLogo = uploaded;
              updates.logoStatus = "found";
              healedFields.push("Brand Logo recovered from Logo API directory");
            }
          }
        } catch (e) {}
      }
    }

    // 4. Heal Banner Image if missing or empty
    const currentBanner = casino.bannerImage || "";
    if (!currentBanner) {
      const bannerCandidate = metadata.ogImage || "";
      if (bannerCandidate) {
        updates.bannerImage = bannerCandidate;
        healedFields.push("Lander Banner recovered from OpenGraph image");
      }
    }

    // 5. Heal Welcome Slogan / Promotional Tagline if missing or placeholder
    const currentBonus = casino.welcomeBonus || "";
    const isBonusPlaceholder = !currentBonus || currentBonus === "Exclusive Deposit Bonus" || currentBonus.trim() === "";
    if (isBonusPlaceholder) {
      try {
        console.log(`[Self-Heal] Re-extracting welcome bonus tagline using Gemini...`);
        const taglineResult = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Extract or suggest a highly specific, catchy, and brief welcome offer, welcome bonus, or promotional slogan (e.g. '100% Up to $1000 + 50 Free Spins') for the casino "${name}" based on these website details: Title: "${metadata.title || ''}", Description: "${metadata.description || ''}". Return only the short phrase (maximum 6-8 words).`,
        });
        if (taglineResult.text) {
          const welcomeBonus = taglineResult.text.trim().replace(/^"|"$/g, '');
          updates.welcomeBonus = welcomeBonus;
          healedFields.push(`Welcome Slogan corrected to: "${welcomeBonus}"`);
        }
      } catch (e) {
        console.warn("Welcome bonus healing failed:", e);
      }
    }

    // 6. Heal Short Description if missing, empty or placeholder
    const currentDesc = casino.shortDescription || "";
    const isDescPlaceholder = !currentDesc || currentDesc.includes("Exclusive affiliate offer") || currentDesc.trim() === "";
    if (isDescPlaceholder) {
      try {
        console.log(`[Self-Heal] Generating engaging description using Gemini...`);
        const descResult = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Write a highly engaging, concise, professional 1-2 sentence description for the online casino "${name}" based on its website description: "${metadata.description || ''}".`,
        });
        if (descResult.text) {
          const shortDescription = descResult.text.trim();
          updates.shortDescription = shortDescription;
          healedFields.push("Short Description generated and polished");
        }
      } catch (e) {
        console.warn("Short description healing failed:", e);
      }
    }

    // 7. Heal SEO Fields (Title, Meta description, Keywords)
    if (!casino.seoTitle) {
      updates.seoTitle = `${name} Review - Claim Exclusive Welcome Bonus`;
      healedFields.push("SEO Title optimized");
    }
    if (!casino.metaDescription) {
      updates.metaDescription = `Get the ultimate verified player guide, welcome bonus details, slot selections, and exclusive promos for ${name}. Play securely today!`;
      healedFields.push("SEO Meta Description optimized");
    }
    if (!casino.keywords || casino.keywords.length === 0) {
      updates.keywords = [name.toLowerCase(), `${name.toLowerCase()} casino`, "free spins", "welcome bonus"];
      healedFields.push("SEO Keywords auto-generated");
    }

    // 8. Heal Landing Page Content if missing or is just default placeholder
    const currentLanding = casino.landingContent || "";
    const isLandingPlaceholder = !currentLanding || currentLanding.length < 250 || currentLanding.includes("Join using our exclusive partner link") || currentLanding.includes("Click above to claim your direct");
    if (isLandingPlaceholder) {
      try {
        console.log(`[Self-Heal] Regenerating rich Markdown landing content using Gemini...`);
        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            landingPageIntroduction: { type: Type.STRING, description: "A welcoming introduction for the casino's lander" },
            featureHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 key features or advantages" },
            pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 constructive positive points" },
            cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 drawbacks or professional limitations" },
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
              description: "3 to 5 relevant frequently asked questions"
            }
          },
          required: ["landingPageIntroduction", "featureHighlights", "pros", "cons", "faq"]
        };

        const systemInstruction = `You are an expert online casino listing directory curator. 
Analyze the provided website details to compile high-quality, professional Markdown details for our review landing page. Do not fabricate promotions or payout speeds that are unverifiable.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Generate review components for "${name}": Title: "${metadata.title || ''}", Description: "${metadata.description || ''}".`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema
          }
        });

        if (response.text) {
          const geminiOutput = JSON.parse(response.text.trim());
          const formattedLandingContent = `
# Welcome to ${name}

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

          updates.landingContent = formattedLandingContent;
          healedFields.push("AI Landing Page review structure compiled and generated");
        }
      } catch (e) {
        console.warn("Landing content healing failed:", e);
      }
    }

    // 9. Save all updates to Firestore
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = FieldValue.serverTimestamp();
      await docRef.update(updates);
      console.log(`[Self-Heal] Successfully updated ${Object.keys(updates).length} fields for ${name}`);
    } else {
      healedFields.push("Listing is already complete and highly detailed. No missing fields detected!");
    }

    const updatedSnap = await docRef.get();
    const updatedCasino = { id: updatedSnap.id, ...updatedSnap.data() };

    return res.json({
      success: true,
      healedFields,
      updatedCasino
    });
  } catch (error: any) {
    console.error("Self-heal failed:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to auto-heal casino assets." });
  }
});

async function startServer() {
  // Vite middleware & Static SPA handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Server active on http://localhost:${PORT}`);
  });
}

startServer();
