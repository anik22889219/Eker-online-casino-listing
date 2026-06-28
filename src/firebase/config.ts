import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

export const firebaseConfig = {
  apiKey: "AIzaSyCSQTPRXQIF4cMvWs5g3YHgTitYx0qr4sw",
  authDomain: "eker-online-casino-listing.firebaseapp.com",
  projectId: "eker-online-casino-listing",
  storageBucket: "eker-online-casino-listing.firebasestorage.app",
  messagingSenderId: "253465047111",
  appId: "1:253465047111:web:7fd1edf74df8414c634162",
  measurementId: "G-Z2NQ7M636F"
};

// Initialize App
export const app = initializeApp(firebaseConfig);

// Initialize App Check safely (only on the default sandbox project where it is configured)
if (typeof window !== "undefined") {
  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

export let appCheck: any = null;
if (typeof window !== "undefined" && firebaseConfig.projectId === "gen-lang-client-0213435563") {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("6Ld_dummy_site_key_for_debug_mode_aaaaaaaa"),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("Firebase App Check initialized with Debug/reCAPTCHA Enterprise provider.");
  } catch (error) {
    console.warn("Firebase App Check load skipped or already initialized:", error);
  }
}
