import { BaseRepository } from "./BaseRepository";
import { Review } from "../types/firestore";
import { where } from "firebase/firestore";

/**
 * Repository to handle user reviews and approval-based querying.
 */
export class ReviewRepository extends BaseRepository<Review> {
  constructor() {
    super("reviews");
  }

  /**
   * Retrieves approved reviews for a given casino.
   */
  async getApprovedReviews(casinoId: string): Promise<Review[]> {
    return this.query([
      where("casinoId", "==", casinoId),
      where("approved", "==", true)
    ]);
  }
}
export default ReviewRepository;
