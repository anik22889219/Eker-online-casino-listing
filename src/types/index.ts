export * from './firestore';

export interface AffiliateLink {
  id: string;
  name: string;
  title: string;
  url: string;
  originalUrl: string;
  commission: string;
  category: string;
  clicks: number;
  conversions: number;
  status: 'active' | 'inactive';
  lastClicked?: string;
  imageUrl?: string;
  createdAt?: any;
  userId?: string;
  description?: string;
  discountCode?: string;
  rewardText?: string;
  ownerRewardText?: string;
  slug?: string;
  isArchived?: boolean;
}

export interface ClickLog {
  id: string;
  linkId: string;
  timestamp: any;
  referrer: string;
  userAgent: string;
  country?: string;
}
