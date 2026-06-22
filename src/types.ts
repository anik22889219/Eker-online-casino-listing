export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  bio: string;
  createdAt: string;
}

export interface AffiliateLink {
  id: string; // The document ID in Firestore
  userId: string; // The owner user's UID
  title: string;
  description: string;
  originalUrl: string;
  category: string; // SaaS, Shopping, Finance, Tech, Health, Hosting, etc.
  discountCode: string; // Optional promo code/coupon
  rewardText: string; // Reward for clicking visitor (e.g. "Get 15% off first month")
  ownerRewardText: string; // Reward for affiliate owner (e.g. "$10 startup bonus")
  clicks: number;
  createdAt: string;
  slug: string; // Neat custom track slug part (optional suffix)
  isArchived: boolean;
}

export interface ClickStatistics {
  date: string;
  clicks: number;
}
