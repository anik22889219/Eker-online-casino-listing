import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAufheJ8YxEX46OO6kPG0f_R5ag-DjzFs",
  authDomain: "gen-lang-client-0213435563.firebaseapp.com",
  projectId: "gen-lang-client-0213435563",
  storageBucket: "gen-lang-client-0213435563.firebasestorage.app",
  messagingSenderId: "811233202539",
  appId: "1:811233202539:web:d05ba44316a5df7e68bc2e",
  measurementId: "G-DVR3B7Y6Q0"
};

// Enable Firebase App Check Debug Provider
if (typeof window !== "undefined") {
  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize App Check safely (only on the default sandbox project where it is configured)
let appCheck;
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

// Initialize Firestore with the correct database ID (custom ID for sandbox project, "(default)" for custom user projects)
const dbId = firebaseConfig.projectId === "gen-lang-client-0213435563"
  ? "ai-studio-3979928c-2bc4-418f-b93b-6eaa3dc5f571"
  : "(default)";
export const db = initializeFirestore(app, {}, dbId);

// Initialize Auth
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// MANDATORY CONNECTION TEST
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Client is initialized. Let's make sure the custom project handles internet requests.", error);
    } else {
      console.log("Firebase connection response status received successfully:", error);
    }
  }
}

testConnection();
