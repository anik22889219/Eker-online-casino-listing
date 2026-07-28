import { useState, useEffect } from "react";
import { ReviewRepository } from "../repositories/ReviewRepository";
import { Review } from "../types/firestore";

export function useReviews(casinoId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reviewRepo = new ReviewRepository();

  const fetchReviews = async () => {
    if (!casinoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reviewRepo.getApprovedReviews(casinoId);
      setReviews(data);
    } catch (err: any) {
      setError(err?.message || "Failed to retrieve reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [casinoId]);

  return {
    reviews,
    loading,
    error,
    refetch: fetchReviews
  };
}

export default useReviews;
