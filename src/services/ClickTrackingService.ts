import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface ClickTrackingData {
  casinoId: string;
  casinoName: string;
  timestamp: any;
  anonymousVisitorId: string;
  deviceType: "Mobile" | "Tablet" | "Desktop";
  referrer: string;
  utmParams: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
}

/**
 * Generates or retrieves an anonymous visitor ID from localStorage.
 */
export function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem("refdirect_visitor_id");
  if (!visitorId) {
    visitorId = "vis_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("refdirect_visitor_id", visitorId);
  }
  return visitorId;
}

/**
 * Detects device type based on user agent.
 */
export function getDeviceType(): "Mobile" | "Tablet" | "Desktop" {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

/**
 * Helper to parse UTM parameters from current URL.
 */
export function getUtmParameters() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") || null,
    medium: params.get("utm_medium") || null,
    campaign: params.get("utm_campaign") || null,
    term: params.get("utm_term") || null,
    content: params.get("utm_content") || null,
  };
}

/**
 * Tracks an affiliate link click. Resolves immediately and performs Firestore write
 * asynchronously so it NEVER blocks navigation.
 */
export function trackAffiliateClick(casinoId: string, casinoName: string): void {
  try {
    const anonymousVisitorId = getOrCreateVisitorId();
    const deviceType = getDeviceType();
    const referrer = document.referrer || "Direct";
    const utmParams = getUtmParameters();

    const trackingPayload = {
      casinoId,
      casinoName,
      timestamp: new Date().toISOString(),
      anonymousVisitorId,
      deviceType,
      referrer,
      utmParams,
    };

    // Run firestore call asynchronously
    addDoc(collection(db, "clicks"), {
      ...trackingPayload,
      serverTime: serverTimestamp()
    }).catch((err) => {
      console.warn("Click tracking write failed:", err);
    });
  } catch (error) {
    console.warn("Error initiating click tracking:", error);
  }
}
