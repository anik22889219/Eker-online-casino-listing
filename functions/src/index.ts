import * as admin from "firebase-admin";

// Initialize Firebase Admin globally across all sub-modules
admin.initializeApp();

// Export triggers from modular folders
export { onUserCreated } from "./auth/index";
export { generateCasinoContent } from "./ai/index";
export { onCasinoStatusChanged } from "./casino/index";
export { aggregateCasinoRatings } from "./review/index";
export { onStorageUpload, getCloudinarySignature } from "./storage/index";
export { onSellRequestCreated } from "./notifications/index";
