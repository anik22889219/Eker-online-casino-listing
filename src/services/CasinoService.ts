import { CasinoRepository } from "../repositories/CasinoRepository";
import { validateCasino } from "../validation/index";
import { Casino } from "../types/firestore";

export class CasinoService {
  private casinoRepo: CasinoRepository;

  constructor() {
    this.casinoRepo = new CasinoRepository();
  }

  /**
   * Safe creation of a casino listing with schema validation.
   */
  async createCasinoListing(casinoData: Omit<Casino, "id" | "createdAt" | "updatedAt">): Promise<Casino> {
    const payload: Partial<Casino> = {
      ...casinoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const validation = validateCasino(payload);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    return this.casinoRepo.create(payload as Omit<Casino, "id">);
  }

  /**
   * Safe partial modification of a casino listing.
   */
  async updateCasinoListing(id: string, updatedFields: Partial<Casino>): Promise<void> {
    const existing = await this.casinoRepo.get(id);
    if (!existing) {
      throw new Error("Casino document not found.");
    }

    const merged = { ...existing, ...updatedFields, updatedAt: new Date().toISOString() };
    const validation = validateCasino(merged);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    await this.casinoRepo.update(id, {
      ...updatedFields,
      updatedAt: new Date().toISOString()
    });
  }
}

export const casinoService = new CasinoService();
export default casinoService;
