import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Hook to send push alerts or write system notifications to user feeds on relevant actions.
 */
export const onSellRequestCreated = functions.firestore
  .document("sellRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const requestData = snap.data();

    // Create a notification for admins/moderators
    const notificationPayload = {
      userId: "system-admin-broadcast", // System channel
      title: "New Sell Request Submitted",
      message: `A new sell/listing request has been submitted for '${requestData.casinoName}' by ${requestData.name}.`,
      read: false,
      type: "sell_request",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("notifications").add(notificationPayload);
      functions.logger.info(`Admin notification dispatched for sellRequest: ${context.params.requestId}`);
    } catch (error) {
      functions.logger.error("Failed to write notification:", error);
    }
  });
