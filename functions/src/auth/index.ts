import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Triggered automatically when a new auth user is created.
 * Sets the default standard user role in the Firestore users collection.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  
  const userProfile = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "New User",
    role: "user", // Default standard user
    status: "active",
    photoURL: user.photoURL || "",
    bio: "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("users").doc(user.uid).set(userProfile, { merge: true });
    functions.logger.info(`Profile initialized successfully for user: ${user.uid}`);
  } catch (error) {
    functions.logger.error(`Error initializing profile for user ${user.uid}:`, error);
  }
});
