import { BaseRepository } from "./BaseRepository";
import { 
  Bonus, 
  PromoOffer, 
  JackpotScreenshot, 
  SellRequest, 
  AiHistoryEntry, 
  AppNotification, 
  SystemSettings 
} from "../types/firestore";
import { where } from "firebase/firestore";

/**
 * Repository to manage casino promotional bonuses.
 */
export class BonusRepository extends BaseRepository<Bonus> {
  constructor() {
    super("bonuses");
  }

  /**
   * Retrieves active bonuses registered for a target casino.
   */
  async getActiveBonuses(casinoId: string): Promise<Bonus[]> {
    return this.query([
      where("casinoId", "==", casinoId),
      where("active", "==", true)
    ]);
  }
}

/**
 * Repository to manage casino discount promos and codes.
 */
export class PromoOfferRepository extends BaseRepository<PromoOffer> {
  constructor() {
    super("promoOffers");
  }

  /**
   * Retrieves active promotional offers for a target casino.
   */
  async getActivePromoOffers(casinoId: string): Promise<PromoOffer[]> {
    return this.query([
      where("casinoId", "==", casinoId),
      where("active", "==", true)
    ]);
  }
}

/**
 * Repository to manage user submitted win validation screenshots.
 */
export class JackpotRepository extends BaseRepository<JackpotScreenshot> {
  constructor() {
    super("jackpotScreenshots");
  }

  /**
   * Retrieves approved jackpot win records for a target casino.
   */
  async getApprovedJackpots(casinoId: string): Promise<JackpotScreenshot[]> {
    return this.query([
      where("casinoId", "==", casinoId),
      where("approved", "==", true)
    ]);
  }
}

/**
 * Repository to manage user listing acquisition submissions.
 */
export class SellRequestRepository extends BaseRepository<SellRequest> {
  constructor() {
    super("sellRequests");
  }
}

/**
 * Repository to audit server-side AI generation events.
 */
export class AiHistoryRepository extends BaseRepository<AiHistoryEntry> {
  constructor() {
    super("aiHistory");
  }
}

/**
 * Repository to manage user inbox notifications and alerts.
 */
export class NotificationRepository extends BaseRepository<AppNotification> {
  constructor() {
    super("notifications");
  }

  /**
   * Retrieves unread notifications for a specified user ID.
   */
  async getUnreadNotifications(userId: string): Promise<AppNotification[]> {
    return this.query([
      where("userId", "==", userId),
      where("read", "==", false)
    ]);
  }
}

/**
 * Repository to read and update global configuration flags (maintenance mode, defaults, etc.).
 */
export class SettingsRepository extends BaseRepository<SystemSettings> {
  constructor() {
    super("settings");
  }
}
