import { NotificationRepository } from "../repositories/SupportingRepositories";
import { AppNotification } from "../types/firestore";

export class NotificationService {
  private notificationRepo: NotificationRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
  }

  /**
   * Dispatches a standardized alert into a user's notification collection feed.
   */
  async sendNotification(userId: string, title: string, message: string, type: string = "info"): Promise<AppNotification> {
    const notification: Omit<AppNotification, "id"> = {
      userId,
      title,
      message,
      read: false,
      type,
      createdAt: new Date().toISOString()
    };

    return this.notificationRepo.create(notification);
  }

  /**
   * Toggles a notification document's read status.
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepo.update(notificationId, { read: true });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
