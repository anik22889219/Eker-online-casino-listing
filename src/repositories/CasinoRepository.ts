import { BaseRepository } from "./BaseRepository";
import { Casino } from "../types/firestore";
import { where } from "firebase/firestore";

/**
 * Repository to manage casino listings, search criteria, and published assets.
 */
export class CasinoRepository extends BaseRepository<Casino> {
  constructor() {
    super("casinos");
  }

  /**
   * Retrieves all casinos currently in 'published' state.
   */
  async getPublishedCasinos(): Promise<Casino[]> {
    return this.query([where("status", "==", "published")]);
  }

  /**
   * Retrieves a single casino document by its matching slug.
   */
  async getCasinoBySlug(slug: string): Promise<Casino | null> {
    const results = await this.query([where("slug", "==", slug)]);
    return results.length > 0 ? results[0] : null;
  }
}
export default CasinoRepository;
