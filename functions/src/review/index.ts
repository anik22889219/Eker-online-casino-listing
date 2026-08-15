import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Triggered when a new review is added or updated.
 * Automatically recalculates total reviews count and average rating on the target casino.
 */
export const aggregateCasinoRatings = functions.firestore
  .document("reviews/{reviewId}")
  .onWrite(async (change, context) => {
    const db = admin.firestore();
    const data = change.after.exists ? change.after.data() : change.before.data();
    
    if (!data) return;
    const { casinoId } = data;

    // Fetch all approved reviews for this casino
    const reviewsSnap = await db.collection("reviews")
      .where("casinoId", "==", casinoId)
      .where("approved", "==", true)
      .get();

    let totalReviews = 0;
    let totalRatingSum = 0;

    reviewsSnap.forEach((doc) => {
      totalReviews += 1;
      totalRatingSum += doc.data().rating;
    });

    const averageRating = totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(1)) : 0;

    // Update the Casino summary document
    await db.collection("casinos").doc(casinoId).set({
      totalReviews,
      averageRating
    }, { merge: true });

    functions.logger.info(`Updated rating aggregation for Casino ${casinoId}: Total Reviews: ${totalReviews}, Avg: ${averageRating}`);
  });
