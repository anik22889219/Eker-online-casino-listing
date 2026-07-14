export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'user';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type CasinoStatus = 'draft' | 'ai_generated' | 'pending_review' | 'published' | 'archived';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Casino {
  id: string;
  slug: string;
  affiliateLink: string;
  casinoName: string;
  casinoLogo: string;
  bannerImage: string;
  shortDescription: string;
  landingContent: string;
  manualReview: string;
  welcomeBonus: string;
  category: string;
  country: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  status: CasinoStatus;
  logoStatus?: 'missing' | 'found';
  aiGenerated: boolean;
  featured: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface Review {
  id: string;
  casinoId: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  approved: boolean;
  createdAt: string;
  jackpotScreenshot?: string;
  balanceScreenshot?: string;
}

export interface Rating {
  casinoId: string;
  userId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Bonus {
  id: string;
  casinoId: string;
  title: string;
  description: string;
  bonusType: string;
  amount: number;
  expiryDate: string;
  active: boolean;
}

export interface PromoOffer {
  id: string;
  casinoId: string;
  promoCode: string;
  title: string;
  description: string;
  active: boolean;
  expiryDate: string;
}

export interface JackpotScreenshot {
  id: string;
  casinoId: string;
  image: string;
  amount: number;
  approved: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export interface SellRequest {
  id: string;
  name: string;
  email: string;
  casinoName: string;
  affiliateLink: string;
  screenshot?: string;
  amount: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AiHistoryEntry {
  id: string;
  casinoId: string;
  prompt: string;
  response: string;
  generatedAt: string;
  generatedBy: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  defaultCategory: string;
  allowedCountries: string[];
  aiModelName: string;
  maxUploadSizeMb: number;
  systemEmail: string;
  updatedAt: string;
  demoScreenshotUrl?: string;
  demoBalanceUrl?: string;
}

export interface ThemeGlobalSettings {
  logoText: string;
  logoUrl: string;
  faviconText: string;
  faviconUrl: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  cardBackgroundColor: string;
  layoutType: "boxed" | "wide";
  cardBorderRadius: string;
  sectionSpacing: string;
}

export interface ThemeSection {
  id: string;
  type: "hero" | "featured_operators" | "latest_listings" | "top_rated" | "sell_cta" | "faq" | "custom";
  title: string;
  subtitle?: string;
  enabled: boolean;
  content?: string;
  actionText?: string;
  actionUrl?: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  customBackgroundColor?: string;
  customTextColor?: string;
  tier1Range?: string;
  tier1Reward?: string;
  tier2Range?: string;
  tier2Reward?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface ThemeConfig {
  id: string;
  globalSettings: ThemeGlobalSettings;
  sections: ThemeSection[];
  updatedAt: string;
}

