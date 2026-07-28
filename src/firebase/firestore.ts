import { initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { app, firebaseConfig } from "./config";
import { auth } from "./auth";
import { LoggingService } from "../services/LoggingService";

import appletConfig from "../../firebase-applet-config.json";

// Initialize Firestore with correct database ID from applet config
const dbId = appletConfig.firestoreDatabaseId;

export const db = (dbId && dbId !== "(default)")
  ? initializeFirestore(app, {}, dbId)
  : initializeFirestore(app, {});

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
  };
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
  
  // Call centralized production logger
  try {
    LoggingService.logFirestoreFailure(path || "unknown", operationType, error);
  } catch (logErr) {
    console.error("Logger error:", logErr);
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Client is offline. Let's make sure the custom project handles internet requests.", error);
    } else {
      console.log("Firebase connection response status received successfully:", error);
    }
  }
}

testConnection();
