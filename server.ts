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
    db = getFirestore();
  } else {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const appInstance = initializeApp({
        projectId: config.projectId
      });
      console.log(`[Firebase] Initialized with default credentials for project: ${config.projectId}`);
      
      const dbId = config.firestoreDatabaseId;
      if (dbId && dbId !== "(default)") {
        db = getFirestore(appInstance, dbId);
        console.log(`[Firebase] Firestore targeting databaseId: ${dbId}`);
      } else {
        db = getFirestore(appInstance);
        console.log("[Firebase] Firestore targeting default databaseId.");
      }
    } else {
      initializeApp();
      console.log("[Firebase] Initialized with default credentials.");
      db = getFirestore();
    }
  }
} catch (err) {
  console.warn("[Firebase] Admin initialization warning:", err);
  try {
    db = getFirestore();
  } catch (secondErr) {
    console.error("[Firebase] Fatal error obtaining Firestore reference:", secondErr);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Robust wrapper around ai.models.generateContent with exponential backoff retry and model fallback support
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
  retries = 3,
  delay = 1000
): Promise<ReturnType<typeof ai.models.generateContent>> {
  const modelsPool = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let attempt = 0;
  
  let currentModel = params.model || "gemini-3.5-flash";
  if (!modelsPool.includes(currentModel)) {
    currentModel = "gemini-3.5-flash";
  }

  while (true) {
    try {
      params.model = currentModel;
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || String(error);
      const isTransient =
        error?.status === "UNAVAILABLE" ||
        error?.status === 503 ||
        error?.status === 429 ||
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("demand") ||
        errorMessage.includes("resource exhausted") ||
        errorMessage.includes("429");

      if (isTransient) {
        // Fallback to another model in the pool if available
        const currentIdx = modelsPool.indexOf(currentModel);
        if (currentIdx !== -1 && currentIdx < modelsPool.length - 1) {
          const nextModel = modelsPool[currentIdx + 1];
          console.warn(`[Gemini Fallback] Attempt ${attempt} failed for model ${currentModel}. Falling back to ${nextModel}...`);
          currentModel = nextModel;
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        // If no more fallback models, perform standard retry with exponential backoff
        if (attempt <= retries) {
          const sleepTime = delay * Math.pow(2, attempt - 1);
          console.warn(`[Gemini Retry] Attempt ${attempt}/${retries} failed for model ${currentModel} with transient error. Retrying in ${sleepTime}ms... Error: ${errorMessage}`);
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
          continue;
        }
      }
      console.error(`[Gemini Fatal] Attempt ${attempt} failed. No more retries or non-transient error: ${errorMessage}`);
      throw error;
    }
  }
}

// Helper: 100% Free Automatic Heuristic-Based Casino Review Draft Generator (Works with no API Key)
function generateHeuristicCasinoContent(metadata: any, affiliateLink: string, nameOverride?: string) {
  let name = nameOverride || metadata.title || "";
  if (name) {
    if (name.includes("|")) {
      name = name.split("|")[0].trim();
    } else if (name.includes("-")) {
      name = name.split("-")[0].trim();
    } else if (name.includes("–")) {
      name = name.split("–")[0].trim();
    } else if (name.includes(":")) {
      name = name.split(":")[0].trim();
    }
  }
  
  if (!name || name.toLowerCase().includes("unknown") || name.length > 50) {
    try {
      const urlObj = new URL(affiliateLink);
      let host = urlObj.hostname.replace("www.", "");
      const firstPart = host.split(".")[0];
      name = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    } catch {
      name = "Exclusive Partner Casino";
    }
  }

  name = name.trim();

  const shortDescription = metadata.description && metadata.description.trim().length > 15 
    ? metadata.description.trim() 
    : `Discover world-class gaming, premium slot machines, and secure payout structures at ${name}. Register today to claim your exclusive promotional bonuses!`;

  const landingPageIntroduction = `Welcome to the official player guide for ${name}. Our experienced lead marketing team and expert listing curators have conducted a rigorous assessment of ${name}'s user experience, register speeds, and transaction transparency to compile this verified resource. Built on a framework of player trust and performance optimization, ${name} delivers a high-speed, seamless interface across both mobile browsers and desktop configurations. Read on to find out more about their game selections, customer support services, and active deposit features.`;

  const featureHighlights = [
    `Verified welcome promotions for new registers at ${name}`,
    `Highly secure payment gateways with support for local and global methods`,
    `Extensive catalogue of live dealer games, table classics, and modern slots`,
    `Responsive performance and instant navigation optimized for iOS and Android`
  ];

  const pros = [
    `Direct, simplified registration process with instant secure validation`,
    `Robust encryption standards ensuring safe transfers and database privacy`,
    `Diverse selection of payout structures for rapid processing`,
    `Direct, easy-to-use customer support channels`
  ];

  const cons = [
    `Geographic limitations may apply to certain country jurisdictions`,
    `Standard play-through rules apply to welcome promotion programs`
  ];

  const faq = [
    {
      question: `How do I sign up and play at ${name}?`,
      answer: `To sign up, click on our verified partner link at the top of the review, fill out the simple registration form, and verify your account to start playing securely.`
    },
    {
      question: `Is ${name} fully compatible with smartphones and tablets?`,
      answer: `Yes, ${name} is developed using fully responsive HTML5 mobile code. This means you do not need to download extra apps from store libraries; simply open the site in Safari or Chrome and start playing.`
    },
    {
      question: `What deposit and withdrawal methods are supported?`,
      answer: `Most leading platforms support a balanced mix of credit/debit options, verified online e-wallets, direct bank wires, and leading digital assets. Payout speeds are highly dependent on the chosen channel.`
    }
  ];

  const seoTitle = `${name} Review - Claim Exclusive Welcome Bonus & Free Spins`;
  const metaDescription = `Read our trusted, verified ${name} player guide. Find current welcome packages, payout channels, slot games, and secure login details.`;
  const suggestedKeywords = [name.toLowerCase(), `${name.toLowerCase()} review`, "online casino", "free spins", "welcome offer", "safe payout"];
  const suggestedSlug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return {
    casinoName: name,
    shortDescription,
    landingPageIntroduction,
    featureHighlights,
    pros,
    cons,
    faq,
    seoTitle,
    metaDescription,
    suggestedKeywords,
    suggestedSlug: suggestedSlug || "exclusive-casino"
  };
}

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
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const contentLengthHeader = response.headers.get("content-length");
      // If there's no content-length header (e.g. chunked), assume it's valid if content-type is image
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 1000;

      const isValidType = contentType.includes("image") || contentType.includes("octet-stream") || provider.url.endsWith(".ico");
      if (response.ok && isValidType && contentLength > 50) {
        return provider.url;
      }
    } catch (e) {}

    try {
      const response = await fetch(provider.url, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000)
      });
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const buffer = await response.arrayBuffer();
      const contentLength = buffer ? buffer.byteLength : 0;
      
      const isValidType = contentType.includes("image") || contentType.includes("octet-stream") || provider.url.endsWith(".ico");
      if (response.ok && isValidType && contentLength > 50) {
        return provider.url;
      }
    } catch (err) {}
  }
  return null;
}

// Helper: Scrape target website metadata
async function fetchWebsiteMetadata(url: string) {
  let initialDomain = "";
  try {
    const initialUrlObj = new URL(url);
    initialDomain = initialUrlObj.hostname.replace("www.", "");
  } catch (e) {}

  let apiLogo: string | null = null;
  if (initialDomain) {
    apiLogo = await getLogoFromApis(initialDomain);
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    });

    const finalUrl = response.url || url;
    let finalDomain = initialDomain;
    try {
      const finalUrlObj = new URL(finalUrl);
      finalDomain = finalUrlObj.hostname.replace("www.", "");
    } catch (e) {}

    // If redirected to a real site, try getting a better brand logo
    if (finalDomain && finalDomain !== initialDomain) {
      const redirectedApiLogo = await getLogoFromApis(finalDomain);
      if (redirectedApiLogo) {
        apiLogo = redirectedApiLogo;
      }
    }

    if (!response.ok) {
      let titleFallback = "";
      if (finalDomain) {
        const firstPart = finalDomain.split(".")[0];
        titleFallback = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      }
      return {
        title: titleFallback || "Exclusive Partner",
        description: "Claim your exclusive player bonuses and welcome promotions today.",
        bestLogo: apiLogo || "",
        favicon: apiLogo || "",
        canonical: finalUrl
      };
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

    // 100% Robust attribute-agnostic HTML link tag parser
    const extractIconFromHtml = (htmlText: string, relType: string) => {
      const linkRegex = /<link\s+([^>]+)>/gi;
      let match;
      let fallbackIcon = "";
      
      while ((match = linkRegex.exec(htmlText)) !== null) {
        const attrsStr = match[1];
        const attrRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:["']([^"']*)["']|([^\s"'>]+))/g;
        let attrMatch;
        const attrs: { [key: string]: string } = {};
        
        while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
          const key = attrMatch[1].toLowerCase();
          const val = attrMatch[2] || attrMatch[3] || "";
          attrs[key] = val.trim();
        }
        
        if (attrs.rel && attrs.href) {
          const relValue = attrs.rel.toLowerCase();
          const hrefValue = attrs.href;
          
          if (relValue.includes(relType)) {
            return hrefValue;
          }
          if (relType === "icon" && (relValue.includes("shortcut") || relValue.includes("apple-touch") || relValue.includes("fluid-icon") || relValue.includes("icon"))) {
            fallbackIcon = hrefValue;
          }
        }
      }
      return fallbackIcon;
    };

    const description = getMeta("description") || getMeta("og:description") || "";
    const ogImage = getMeta("og:image") || "";
    const ogTitle = getMeta("og:title") || "";
    
    const favicon = extractIconFromHtml(html, "icon") || "/favicon.ico";
    const canonical = extractIconFromHtml(html, "canonical") || "";
    const appleTouchIcon = extractIconFromHtml(html, "apple-touch-icon") || "";

    const resolveUrl = (baseUrlStr: string, targetPath: string) => {
      if (!targetPath) return "";
      try {
        return new URL(targetPath, baseUrlStr).href;
      } catch {
        return targetPath;
      }
    };

    const logoCandidates: string[] = [];
    const imgRegex = /<img([^>]+)>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const attrsStr = imgMatch[1];
      const attrRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:["']([^"']*)["']|([^\s"'>]+))/g;
      let attrMatch;
      const attrs: { [key: string]: string } = {};
      
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        const key = attrMatch[1].toLowerCase();
        const val = attrMatch[2] || attrMatch[3] || "";
        attrs[key] = val.trim();
      }

      const src = attrs.src || attrs["data-src"] || attrs["data-lazy-src"] || attrs["data-original"] || attrs["lazy-src"] || "";
      const alt = (attrs.alt || "").toLowerCase();
      const className = (attrs.class || "").toLowerCase();

      if (src && !src.startsWith("data:")) {
        const lowerSrc = src.toLowerCase();
        const isLogo = lowerSrc.includes("logo") || alt.includes("logo") || className.includes("logo") ||
                       lowerSrc.includes("brand") || alt.includes("brand") || className.includes("brand");
        if (isLogo) {
          const resolved = resolveUrl(finalUrl, src.trim());
          if (resolved) {
            logoCandidates.push(resolved);
          }
        }
      }
    }

    // Determine the single best logo using optimal precedence order:
    let bestLogo = "";

    // 1. Apple Touch Icon (high resolution, high trust)
    if (appleTouchIcon) {
      const resolved = resolveUrl(finalUrl, appleTouchIcon);
      if (await checkUrlIsLiveImage(resolved)) {
        bestLogo = resolved;
      }
    }

    // 2. OpenGraph Image (high quality social card)
    if (!bestLogo && ogImage) {
      const resolved = resolveUrl(finalUrl, ogImage);
      if (await checkUrlIsLiveImage(resolved)) {
        bestLogo = resolved;
      }
    }

    // 3. Extracted inline logo images matching logo-like classes or alt tags
    if (!bestLogo && logoCandidates.length > 0) {
      for (const cand of logoCandidates) {
        if (await checkUrlIsLiveImage(cand)) {
          bestLogo = cand;
          break;
        }
      }
    }

    // 4. Extracted Favicon from HTML link tags
    if (!bestLogo && favicon) {
      const resolved = resolveUrl(finalUrl, favicon);
      if (resolved && resolved !== "/favicon.ico") {
        bestLogo = resolved;
      }
    }

    // 5. Fallback to high-reliability Logo lookup APIs (Google, Clearbit)
    if (!bestLogo && apiLogo) {
      bestLogo = apiLogo;
    }

    // 6. Absolute default favicon location
    if (!bestLogo) {
      bestLogo = resolveUrl(finalUrl, "/favicon.ico");
    }

    let finalTitle = ogTitle || title;
    if (!finalTitle && finalDomain) {
      const firstPart = finalDomain.split(".")[0];
      finalTitle = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    }

    return {
      title: finalTitle || "Exclusive Partner",
      description,
      ogImage: resolveUrl(finalUrl, ogImage),
      favicon: resolveUrl(finalUrl, favicon),
      canonical: resolveUrl(finalUrl, canonical),
      bestLogo: resolveUrl(finalUrl, bestLogo)
    };
  } catch (error) {
    console.warn(`Failed to fetch metadata from ${url}:`, error);
    let titleFallback = "";
    if (initialDomain) {
      const firstPart = initialDomain.split(".")[0];
      titleFallback = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
    }
    return {
      title: titleFallback || "Exclusive Partner",
      description: "Claim your exclusive player bonuses and welcome promotions today.",
      bestLogo: apiLogo || "",
      favicon: apiLogo || "",
      canonical: url
    };
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

  const nameLower = (name || "").toLowerCase();
  const affiliateLinkLower = affiliateLink.toLowerCase();
  let localOverrideLogo = "";
  if (nameLower.includes("tk10") || affiliateLinkLower.includes("tk10") || affiliateLinkLower.includes("tk15")) {
    localOverrideLogo = "/tk10_logo.jpg";
  } else if (nameLower.includes("qq777") || affiliateLinkLower.includes("qq777")) {
    localOverrideLogo = "/qq777_logo.jpg";
  }

  if (localOverrideLogo) {
    finalLogoUrl = localOverrideLogo;
  } else if (logoUrl) {
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
    console.warn("[Heuristic Fallback] Gemini API key not configured for extract-promo. Using safe default.");
    return res.json({
      success: true,
      welcomeSlogan: "Exclusive Deposit Bonus"
    });
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
    const result = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
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
    console.warn("[Heuristic Fallback] Gemini tagline extraction failed, using safe fallback. Error:", error.message || error);
    return res.json({
      success: true,
      welcomeSlogan: "Exclusive Deposit Bonus"
    });
  }
});

// 3. Generate Full AI Content (Runs with Gemini, or beautifully falls back to a free heuristic script if no key is present or error occurs)
app.post("/api/generate-casino-content", async (req, res) => {
  const { affiliateLink, bannerImage, casinoId } = req.body;
  if (!affiliateLink) {
    return res.status(400).json({ success: false, error: "Missing affiliateLink parameter." });
  }

  console.log(`[Content Generator] Initiated content compilation for: ${affiliateLink}`);
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    // 1. Fetch live website metadata first (this works completely free & without API keys)
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

    // 2. Decide if we can use Gemini or if we immediately fall back to the local free script
    if (!apiKey) {
      console.warn("[Heuristic Fallback] GEMINI_API_KEY is not configured on the server. Compiling via automatic free script.");
      const freeData = generateHeuristicCasinoContent(metadata, affiliateLink);
      
      const formattedLandingContent = `
# Welcome to ${freeData.casinoName}

${freeData.landingPageIntroduction}

## Key Feature Highlights
${freeData.featureHighlights.map((feat: string) => `- ${feat}`).join("\n")}

## Pros & Cons
### Pros
${freeData.pros.map((pro: string) => `- ${pro}`).join("\n")}

### Cons
${freeData.cons.map((con: string) => `- ${con}`).join("\n")}

## Frequently Asked Questions
${freeData.faq.map((item: any) => `### Q: ${item.question}\n${item.answer}`).join("\n\n")}
`.trim();

      const casinoPayload: any = {
        slug: freeData.suggestedSlug,
        affiliateLink,
        casinoName: freeData.casinoName,
        casinoLogo: finalLogoUrl,
        logoStatus,
        bannerImage: bannerImage || "",
        shortDescription: freeData.shortDescription,
        landingContent: formattedLandingContent,
        welcomeBonus: freeData.featureHighlights[0] || "Generous Welcome Bonus",
        seoTitle: freeData.seoTitle,
        metaDescription: freeData.metaDescription,
        keywords: freeData.suggestedKeywords,
        status: "ai_generated",
        aiGenerated: true
      };

      return res.json({
        success: true,
        casinoId: casinoId || "",
        slug: freeData.suggestedSlug,
        generatedData: freeData,
        casinoPayload
      });
    }

    // If Gemini key is available, attempt to build using the advanced AI pipeline
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

    try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
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
        aiGenerated: true
      };

      return res.json({
        success: true,
        casinoId: casinoId || "",
        slug: suggestedSlug,
        generatedData: geminiOutput,
        casinoPayload
      });
    } catch (geminiErr: any) {
      console.warn(`[Heuristic Fallback] Gemini call failed (${geminiErr.message}). Reverting to automatic free compiler.`, geminiErr);
      const freeData = generateHeuristicCasinoContent(metadata, affiliateLink);
      
      const formattedLandingContent = `
# Welcome to ${freeData.casinoName}

${freeData.landingPageIntroduction}

## Key Feature Highlights
${freeData.featureHighlights.map((feat: string) => `- ${feat}`).join("\n")}

## Pros & Cons
### Pros
${freeData.pros.map((pro: string) => `- ${pro}`).join("\n")}

### Cons
${freeData.cons.map((con: string) => `- ${con}`).join("\n")}

## Frequently Asked Questions
${freeData.faq.map((item: any) => `### Q: ${item.question}\n${item.answer}`).join("\n\n")}
`.trim();

      const casinoPayload: any = {
        slug: freeData.suggestedSlug,
        affiliateLink,
        casinoName: freeData.casinoName,
        casinoLogo: finalLogoUrl,
        logoStatus,
        bannerImage: bannerImage || "",
        shortDescription: freeData.shortDescription,
        landingContent: formattedLandingContent,
        welcomeBonus: freeData.featureHighlights[0] || "Generous Welcome Bonus",
        seoTitle: freeData.seoTitle,
        metaDescription: freeData.metaDescription,
        keywords: freeData.suggestedKeywords,
        status: "ai_generated",
        aiGenerated: true
      };

      return res.json({
        success: true,
        casinoId: casinoId || "",
        slug: freeData.suggestedSlug,
        generatedData: freeData,
        casinoPayload
      });
    }
  } catch (error: any) {
    console.error("[Fatal Error] Website metadata retrieval failed during free compilation fallback:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to generate website metadata." });
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

  const ai = apiKey ? new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  }) : null;

  try {
    const casino = req.body.casino;
    if (!casino) {
      return res.status(400).json({ success: false, error: "Missing casino object in request body." });
    }
    const affiliateLink = casino.affiliateLink;
    if (!affiliateLink) {
      return res.status(400).json({ success: false, error: "Casino has no affiliate target link configured." });
    }

    const options = req.body.options || {};
    const selectedTasks = options.selectedTasks || null; // if null, assume all active
    const forceOverwrite = !!options.forceOverwrite;

    const shouldSync = (taskKey: string) => {
      if (!selectedTasks || selectedTasks.length === 0) return true;
      return selectedTasks.includes(taskKey);
    };

    // 1. Fetch live website metadata
    const metadata = await fetchWebsiteMetadata(affiliateLink);
    const healedFields: string[] = [];
    const updates: any = {};

    // 2. Heal Brand Name if requested
    let name = casino.casinoName || "";
    if (shouldSync("casinoName")) {
      const isNameMissing = !name || name === "New Casino" || name.trim() === "";
      if (isNameMissing || forceOverwrite) {
        let newName = metadata.title || "";
        if (newName) {
          if (newName.includes("|")) newName = newName.split("|")[0].trim();
          else if (newName.includes("-")) newName = newName.split("-")[0].trim();
          else if (newName.includes("–")) newName = newName.split("–")[0].trim();
        }
        if (!newName) {
          try {
            const urlObj = new URL(affiliateLink);
            const host = urlObj.hostname.replace("www.", "");
            const part = host.split(".")[0];
            newName = part.charAt(0).toUpperCase() + part.slice(1);
          } catch {
            newName = "New Casino";
          }
        }
        if (newName !== name) {
          name = newName;
          updates.casinoName = name;
          healedFields.push(`Brand Name ${forceOverwrite ? "regenerated" : "restored"} to: "${name}"`);
        }
      }
    }

    // 3. Heal Brand Logo if requested
    if (shouldSync("casinoLogo")) {
      const casinoNameLower = (name || "").toLowerCase();
      const affiliateLinkLower = affiliateLink.toLowerCase();
      
      let localOverrideLogo = "";
      if (casinoNameLower.includes("tk10") || affiliateLinkLower.includes("tk10") || affiliateLinkLower.includes("tk15")) {
        localOverrideLogo = "/tk10_logo.jpg";
      } else if (casinoNameLower.includes("qq777") || affiliateLinkLower.includes("qq777")) {
        localOverrideLogo = "/qq777_logo.jpg";
      }

      if (localOverrideLogo) {
        if (casino.casinoLogo !== localOverrideLogo || forceOverwrite) {
          updates.casinoLogo = localOverrideLogo;
          updates.logoStatus = "found";
          healedFields.push(`Brand Logo restored to premium custom design asset: "${localOverrideLogo}"`);
        }
      } else {
        const extractedLogoUrl = metadata.bestLogo || metadata.favicon || metadata.ogImage || "";
        let foundLogo = false;
        if (extractedLogoUrl) {
          console.log(`[Self-Heal] Extracted logo candidate: ${extractedLogoUrl}`);
          const uploaded = await uploadUrlToCloudinary(extractedLogoUrl, "casino-listings/logos");
          if (uploaded) {
            if (casino.casinoLogo !== uploaded || forceOverwrite) {
              updates.casinoLogo = uploaded;
              updates.logoStatus = "found";
              healedFields.push(`Brand Logo ${forceOverwrite ? "re-generated" : "recovered"} & optimized via Cloudinary`);
            }
            foundLogo = true;
          }
        }
        if (!foundLogo) {
          // Fallback: search Logo APIs directly
          try {
            const urlObj = new URL(affiliateLink);
            const domain = urlObj.hostname.replace("www.", "");
            const apiLogo = await getLogoFromApis(domain);
            if (apiLogo) {
              const uploaded = await uploadUrlToCloudinary(apiLogo, "casino-listings/logos");
              if (uploaded) {
                if (casino.casinoLogo !== uploaded || forceOverwrite) {
                  updates.casinoLogo = uploaded;
                  updates.logoStatus = "found";
                  healedFields.push(`Brand Logo ${forceOverwrite ? "re-generated" : "recovered"} from Logo API directory`);
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    // 4. Heal Banner Image if requested
    const currentBanner = casino.bannerImage || "";
    const isBannerMissing = !currentBanner;
    if (shouldSync("bannerImage") && (isBannerMissing || forceOverwrite)) {
      const bannerCandidate = metadata.ogImage || "";
      if (bannerCandidate) {
        updates.bannerImage = bannerCandidate;
        healedFields.push(`Lander Banner ${forceOverwrite ? "overwritten" : "recovered"} from OpenGraph image`);
      }
    }

    // 5. Check if any AI healing is needed (Welcome bonus, Description, Landing Page Content)
    const currentBonus = casino.welcomeBonus || "";
    const isBonusPlaceholder = !currentBonus || currentBonus === "Exclusive Deposit Bonus" || currentBonus.trim() === "";

    const currentDesc = casino.shortDescription || "";
    const isDescPlaceholder = !currentDesc || currentDesc.includes("Exclusive affiliate offer") || currentDesc.trim() === "";

    const currentLanding = casino.landingContent || "";
    const isLandingPlaceholder = !currentLanding || currentLanding.length < 250 || currentLanding.includes("Join using our exclusive partner link") || currentLanding.includes("Click above to claim your direct");

    const needAIWelcomeBonus = shouldSync("welcomeBonus") && (isBonusPlaceholder || forceOverwrite);
    const needAILandingContent = shouldSync("landingContent") && (isDescPlaceholder || isLandingPlaceholder || forceOverwrite);

    if (needAIWelcomeBonus || needAILandingContent) {
      try {
        if (!ai) {
          throw new Error("No Gemini API key configured. Utilizing automatic free content generator system.");
        }
        console.log(`[Self-Heal] Executing consolidated Gemini call to heal missing assets for "${name}"...`);

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            welcomeBonus: { 
              type: Type.STRING, 
              description: "A brief, catchy welcome offer or promotional slogan (maximum 6-8 words, like '100% Up to $1000 + 50 Free Spins') based on the casino website details." 
            },
            shortDescription: { 
              type: Type.STRING, 
              description: "A highly engaging, professional 1-2 sentence description of the online casino." 
            },
            landingPageComponents: {
              type: Type.OBJECT,
              properties: {
                landingPageIntroduction: { type: Type.STRING, description: "A highly welcoming, detailed introduction for the casino's lander" },
                featureHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 key features, exclusive rewards, or distinct advantages" },
                pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 constructive positive points about the casino" },
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
                  description: "3 to 5 relevant frequently asked questions and clear answers"
                }
              },
              required: ["landingPageIntroduction", "featureHighlights", "pros", "cons", "faq"]
            }
          },
          required: ["welcomeBonus", "shortDescription", "landingPageComponents"]
        };

        const systemInstruction = `You are an expert online casino listing directory curator and professional copywriter. 
Analyze the provided website details and meta description to compile high-quality, professional, and engaging copy for our review directory. Do not fabricate promotions or payout speeds that are unverifiable.`;

        const promptText = `Please compile details for the online casino named "${name}".
Website Title: "${metadata.title || ''}"
Website Description: "${metadata.description || ''}"

Please generate:
1. A welcomeBonus promotional slogan.
2. A shortDescription (1-2 sentences).
3. Complete landingPageComponents.`;

        const response = await generateContentWithRetry(ai, {
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema
          }
        });

        if (response.text) {
          const resultObj = JSON.parse(response.text.trim());

          if (needAIWelcomeBonus && resultObj.welcomeBonus) {
            const welcomeBonus = resultObj.welcomeBonus.trim().replace(/^"|"$/g, '');
            updates.welcomeBonus = welcomeBonus;
            healedFields.push(`Welcome Slogan ${forceOverwrite ? "regenerated" : "corrected"} to: "${welcomeBonus}"`);
          }

          if (shouldSync("landingContent") && (isDescPlaceholder || forceOverwrite) && resultObj.shortDescription) {
            const shortDescription = resultObj.shortDescription.trim();
            updates.shortDescription = shortDescription;
            healedFields.push(`Short Description ${forceOverwrite ? "regenerated" : "generated"} and polished`);
          }

          if (shouldSync("landingContent") && (isLandingPlaceholder || forceOverwrite) && resultObj.landingPageComponents) {
            const comp = resultObj.landingPageComponents;
            const formattedLandingContent = `
# Welcome to ${name}

${comp.landingPageIntroduction}

## Key Feature Highlights
${comp.featureHighlights.map((feat: string) => `- ${feat}`).join("\n")}

## Pros & Cons
### Pros
${comp.pros.map((pro: string) => `- ${pro}`).join("\n")}

### Cons
${comp.cons.map((con: string) => `- ${con}`).join("\n")}

## Frequently Asked Questions
${comp.faq.map((item: any) => `### Q: ${item.question}\n${item.answer}`).join("\n\n")}
`.trim();

            updates.landingContent = formattedLandingContent;
            healedFields.push(`AI Landing Page review structure ${forceOverwrite ? "re-compiled" : "compiled"} and generated`);
          }
        }
      } catch (e: any) {
        console.error("Consolidated self-healing failed:", e);
        // Fallback: simple heuristic placeholders if Gemini fails completely
        if (needAIWelcomeBonus) {
          updates.welcomeBonus = "Claim Exclusive Welcome Package";
          healedFields.push("Welcome Slogan set to safe default");
        }
        if (shouldSync("landingContent") && (isDescPlaceholder || forceOverwrite)) {
          updates.shortDescription = `Discover premium online gaming and massive jackpots at ${name}. Register today for safe play and instant rewards!`;
          healedFields.push("Short Description set to safe default");
        }
        if (shouldSync("landingContent") && (isLandingPlaceholder || forceOverwrite)) {
          updates.landingContent = `
# Welcome to ${name}

Join ${name} today using our exclusive partner link to access elite casino games, custom bonus spins, and rapid payout structures.

## Key Feature Highlights
- Fully optimized mobile interface
- Wide selection of slots and table games
- Verified secure licensing and encrypted transactions

## Pros & Cons
### Pros
- Easy and rapid registration process
- Multiple secure deposit and withdrawal methods

### Cons
- Country restrictions may apply in some jurisdictions

## Frequently Asked Questions
### Q: How do I claim the welcome bonus?
Click on our "Claim Bonus" button, register your account, and complete your first secure deposit to activate your welcome package.
`.trim();
          healedFields.push("AI Landing Page content set to safe fallback layout");
        }
      }
    }

    // 6. Heal SEO Fields (Title, Meta description, Keywords) if requested
    if (shouldSync("seoFields")) {
      if (!casino.seoTitle || forceOverwrite) {
        updates.seoTitle = `${name} Review - Claim Exclusive Welcome Bonus`;
        healedFields.push(`SEO Title ${forceOverwrite ? "re-optimized" : "optimized"}`);
      }
      if (!casino.metaDescription || forceOverwrite) {
        updates.metaDescription = `Get the ultimate verified player guide, welcome bonus details, slot selections, and exclusive promos for ${name}. Play securely today!`;
        healedFields.push(`SEO Meta Description ${forceOverwrite ? "re-optimized" : "optimized"}`);
      }
      if (!casino.keywords || casino.keywords.length === 0 || forceOverwrite) {
        updates.keywords = [name.toLowerCase(), `${name.toLowerCase()} casino`, "free spins", "welcome bonus"];
        healedFields.push(`SEO Keywords ${forceOverwrite ? "re-generated" : "auto-generated"}`);
      }
    }

    // 9. Skip saving to Firestore on server-side and return updates to frontend
    if (Object.keys(updates).length === 0) {
      healedFields.push("No updates applied based on your configuration parameters.");
    }

    return res.json({
      success: true,
      healedFields,
      updates
    });
  } catch (error: any) {
    console.error("Self-heal failed:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to auto-heal casino assets." });
  }
});

// 5. Automatic Dynamic Blog Generator for SEO & Backlinks
app.post("/api/generate-casino-blog", async (req, res) => {
  const { casinoName, affiliateLink, welcomeBonus, shortDescription, bannerImage } = req.body;
  if (!casinoName || !affiliateLink) {
    return res.status(400).json({ success: false, error: "Missing required casinoName or affiliateLink." });
  }

  console.log(`[Blog Generator] Initiating SEO blog creation for casino: ${casinoName}`);
  const apiKey = process.env.GEMINI_API_KEY;

  const defaultTitle = `Why ${casinoName} is Becoming the Top Choice for Smart Players in 2026`;
  const defaultExcerpt = `Looking for a trusted casino broker's inside take? Check out our in-depth SEO analysis of ${casinoName}, including registration tips, welcome deposit bonuses, and how to verify direct payouts.`;
  const defaultContent = `
# The Ultimate Player Guide to ${casinoName}: Registration, Promos & Vetted Review

In the rapidly evolving online gaming landscape of 2026, finding a reliable, high-performing platform can feel like navigating a maze. As professional digital marketers and experienced affiliate brokers, our core objective is to audit platforms so that you can secure maximum player equity. 

Today, we are analyzing **${casinoName}**, a platform that is generating significant waves in the industry.

## Why Player Backlinks & Vetting Matter

When you register at any platform, using a [trusted referral link](${affiliateLink}) ensures your player profile is tagged with premium brokerage benefits—including priority payout processing and higher weekly cashback rebates. 

By playing through certified channels, you protect your deposits and guarantee your jackpot wins are backed by direct liquid lines.

---

## High-Converting Features of ${casinoName}

Here is a breakdown of what makes this brand stand out:

1. **Massive Player Incentives**: Currently, users can claim an exclusive promotional bonus: **${welcomeBonus || "Exclusive Match Reward"}**.
2. **Speed & Security**: Dynamic HTML5 optimization ensures ultra-fast signup and seamless gaming performance across both Android and iOS configurations.
3. **Transparent Gaming Portfolio**: From high-stakes progressive slots to real-time live dealer classic lounges, variety meets integrity.

> **Digital Marketer Tip**: Always look for platforms with low wagering requirements. At ${casinoName}, players can enjoy optimized wagering pools that increase the probability of a successful cash-out.

---

## Step-by-Step: How to Register and Claim Your Bonus

Ready to start? Follow these vetted, simple steps to secure your premium account safely:

1. **Navigate to the Verified Link**: Click [here to visit the official ${casinoName} signup portal](${affiliateLink}) directly.
2. **Complete Secure Sign Up**: Fill out the rapid registration form with accurate details to ensure smooth identity verification during payouts.
3. **Make Your First Deposit**: Complete a safe transaction and watch your welcome offer **${welcomeBonus || "Exclusive Bonus"}** get credited instantly!

## Final Verdict & Backlink Summary

As professional market curators, we highly recommend **${casinoName}** for players seeking robust security, premium gameplay, and transparent wagering terms. 

Don't miss out on their latest seasonal promotions. [Click here to register at ${casinoName} today and claim your exclusive reward!](${affiliateLink})
`.trim();

  // Heuristic free fallback
  if (!apiKey) {
    console.warn("[Heuristic Blog Fallback] No GEMINI_API_KEY set. Generating top-tier pre-formatted SEO article.");
    return res.json({
      success: true,
      title: defaultTitle,
      excerpt: defaultExcerpt,
      category: "Brokerage Guides",
      readTime: "5 min read",
      content: defaultContent,
      aiGenerated: false
    });
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
      title: { 
        type: Type.STRING, 
        description: "An absolute click-magnet SEO blog post title containing the casino name, optimized for search engines in 2026. Keep it under 65 characters." 
      },
      excerpt: { 
        type: Type.STRING, 
        description: "A highly persuasive, high-CTR meta description and excerpt summarizing the article under 150 characters." 
      },
      category: { 
        type: Type.STRING, 
        description: "The blog post category (e.g. 'Brokerage Guides', 'Casino Reviews', 'Bonuses & Promos')." 
      },
      readTime: { 
        type: Type.STRING, 
        description: "The estimated reading time, e.g. '5 min read'." 
      },
      content: { 
        type: Type.STRING, 
        description: "A comprehensive, beautifully structured Markdown article (at least 500-600 words) rich with SEO headings (H1, H2, H3), lists, professional digital marketing/brokerage tips, pros/cons, and MULTIPLE CALLS TO ACTION with Markdown links pointing EXACTLY to the affiliate link provided to serve as robust backlinks!" 
      }
    },
    required: ["title", "excerpt", "category", "readTime", "content"]
  };

  const systemInstruction = `You are a professional Digital Marketer, experience-hardened Affiliate SEO Strategist, and veteran Casino Brokerage Desk Writer.
Your absolute goal is to generate exceptionally high-converting, informative, and engaging blog articles that drive leads, establish backlink power, and boost search engine optimization.
You MUST integrate the provided affiliate link naturally into the article as hyperlinks (at least 3 times) to serve as SEO backlinks.`;

  const promptText = `
Please write a comprehensive, top-tier affiliate SEO blog article for the Casino named: "${casinoName}".
- Affiliate Referral URL (use this for backlinks): "${affiliateLink}"
- Welcome Promo / Bonus: "${welcomeBonus || 'Exclusive Player Bonus'}"
- Short Description Context: "${shortDescription || 'A premium secure gaming casino.'}"
- Visual Banner: ${bannerImage ? `The banner displays a premium promotion.` : 'No custom banner.'}

The article must be optimized for Google SEO in 2026. Use persuasive marketing copywriting.
Write in a structured Markdown format containing:
1. High-impact H1 title intro.
2. Section on "Why Vetted Backlinks Matter" (Bengali or English marketing concepts, but the main text is high-performing SEO English).
3. Strategic "How to Sign Up Safely" section with step-by-step instructions.
4. Professional "Digital Marketer's Vetting Verdict".
5. High-CTR call to action with a direct hyperlinked backlink to: ${affiliateLink}
`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    if (response.text) {
      const output = JSON.parse(response.text.trim());
      return res.json({
        success: true,
        ...output,
        aiGenerated: true
      });
    } else {
      throw new Error("Received empty response from Gemini.");
    }
  } catch (error: any) {
    console.error("[Blog Generator Error] Gemini failed, reverting to heuristic free model:", error);
    return res.json({
      success: true,
      title: defaultTitle,
      excerpt: defaultExcerpt,
      category: "Brokerage Guides",
      readTime: "5 min read",
      content: defaultContent,
      aiGenerated: false
    });
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
