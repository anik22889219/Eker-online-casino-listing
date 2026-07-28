import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import appletConfig from "../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId,
  measurementId: appletConfig.measurementId || ""
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
