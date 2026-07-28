import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Sync or post-processing triggers for casino documents.
 */
export const onCasinoStatusChanged = functions.firestore
  .document("casinos/{casinoId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    if (beforeData.status !== afterData.status) {
      functions.logger.info(`Casino ${context.params.casinoId} changed status from ${beforeData.status} to ${afterData.status}`);
      
      // Hook up automated workflow e.g. send notification, update sitemap, clear cache, etc.
    }
  });
