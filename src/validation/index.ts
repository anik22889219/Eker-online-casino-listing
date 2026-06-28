import { Casino, Review, SellRequest, Bonus, PromoOffer } from "../types/firestore";

/**
 * Validates a standard slug format (e.g. lowercase letters, numbers, and dashes)
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slug.length > 0 && slug.length <= 128 && slugRegex.test(slug);
}

/**
 * Validates an email address structure
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email.length > 0 && email.length <= 256 && emailRegex.test(email);
}

/**
 * Validates URL structures
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Casino Record Validation Assertions
 */
export function validateCasino(data: Partial<Casino>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.slug || !isValidSlug(data.slug)) {
    errors.push("Invalid slug: Must be 1-128 lowercase alphanumeric characters with single hyphens.");
  }

  if (!data.casinoName || data.casinoName.trim().length < 2 || data.casinoName.length > 256) {
    errors.push("Invalid casinoName: Must be between 2 and 256 characters.");
  }

  if (!data.affiliateLink || !isValidUrl(data.affiliateLink) || data.affiliateLink.length > 2048) {
    errors.push("Invalid affiliateLink: Must be a valid HTTP/HTTPS URL under 2048 characters.");
  }

  if (data.status && !["draft", "ai_generated", "pending_review", "published", "archived"].includes(data.status)) {
    errors.push("Invalid status: Must be one of draft, ai_generated, pending_review, published, or archived.");
  }

  if (data.averageRating !== undefined && (data.averageRating < 1 || data.averageRating > 5)) {
    errors.push("Invalid averageRating: Must be a value between 1.0 and 5.0.");
  }

  if (data.totalReviews !== undefined && (data.totalReviews < 0 || !Number.isInteger(data.totalReviews))) {
    errors.push("Invalid totalReviews: Must be a non-negative integer.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Review Submission Validation Assertions
 */
export function validateReview(data: Partial<Review>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.casinoId || data.casinoId.length === 0 || data.casinoId.length > 128) {
    errors.push("Invalid casinoId: Missing or exceeds 128 characters.");
  }

  if (!data.userId || data.userId.length === 0 || data.userId.length > 128) {
    errors.push("Invalid userId: Missing or exceeds 128 characters.");
  }

  if (data.rating === undefined || data.rating < 1 || data.rating > 5) {
    errors.push("Invalid rating: Star rating must be an integer or float between 1.0 and 5.0.");
  }

  if (!data.title || data.title.trim().length < 3 || data.title.length > 128) {
    errors.push("Invalid title: Review title must be between 3 and 128 characters.");
  }

  if (!data.comment || data.comment.trim().length < 10 || data.comment.length > 4096) {
    errors.push("Invalid comment: Review comment must be between 10 and 4096 characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sell Request Submission Validation Assertions
 */
export function validateSellRequest(data: Partial<SellRequest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2 || data.name.length > 256) {
    errors.push("Invalid name: Submitter's name must be between 2 and 256 characters.");
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("Invalid email: Submitter's email must be a valid email structure under 256 characters.");
  }

  if (!data.casinoName || data.casinoName.trim().length < 2 || data.casinoName.length > 256) {
    errors.push("Invalid casinoName: Requested casino name must be between 2 and 256 characters.");
  }

  if (!data.affiliateLink || !isValidUrl(data.affiliateLink) || data.affiliateLink.length > 2048) {
    errors.push("Invalid affiliateLink: Must provide a valid destination URL under 2048 characters.");
  }

  if (data.amount === undefined || data.amount < 0) {
    errors.push("Invalid amount: Selling price or jackpot amount must be a positive number.");
  }

  if (!data.message || data.message.trim().length < 10 || data.message.length > 4096) {
    errors.push("Invalid message: Pitch message must be between 10 and 4096 characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Bonus Verification Validation Assertions
 */
export function validateBonus(data: Partial<Bonus>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.casinoId || data.casinoId.length === 0 || data.casinoId.length > 128) {
    errors.push("Invalid casinoId: Attached casinoId is required.");
  }

  if (!data.title || data.title.trim().length < 3 || data.title.length > 256) {
    errors.push("Invalid title: Bonus title must be between 3 and 256 characters.");
  }

  if (!data.description || data.description.trim().length < 5 || data.description.length > 2048) {
    errors.push("Invalid description: Description must be between 5 and 2048 characters.");
  }

  if (!data.bonusType || data.bonusType.trim().length === 0 || data.bonusType.length > 128) {
    errors.push("Invalid bonusType: Bonus offer type is required.");
  }

  if (data.amount === undefined || data.amount < 0) {
    errors.push("Invalid amount: Bonus allocation value must be non-negative.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Promo Offer Verification Validation Assertions
 */
export function validatePromoOffer(data: Partial<PromoOffer>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.casinoId || data.casinoId.length === 0 || data.casinoId.length > 128) {
    errors.push("Invalid casinoId: Associated casinoId is required.");
  }

  if (!data.promoCode || data.promoCode.trim().length === 0 || data.promoCode.length > 128) {
    errors.push("Invalid promoCode: Code cannot be empty.");
  }

  if (!data.title || data.title.trim().length < 3 || data.title.length > 256) {
    errors.push("Invalid title: Promotional title must be between 3 and 256 characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
