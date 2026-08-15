import { generateCasinoContent } from "../firebase/cloudFunctions";
import { AiHistoryRepository } from "../repositories/SupportingRepositories";

export interface AiGenerationResult {
  success: boolean;
  casinoId: string;
  slug: string;
  generationDuration: number;
  generatedData: {
    casinoName: string;
    shortDescription: string;
    landingPageIntroduction: string;
    featureHighlights: string[];
    pros: string[];
    cons: string[];
    faq: Array<{ question: string; answer: string }>;
    seoTitle: string;
    metaDescription: string;
    suggestedKeywords: string[];
    suggestedSlug: string;
  };
}

export class AiService {
  private aiHistoryRepo: AiHistoryRepository;

  constructor() {
    this.aiHistoryRepo = new AiHistoryRepository();
  }

  /**
   * Helper to format raw Firebase or Network errors into highly polished,
   * friendly, readable strings for admin displays.
   */
  public parseError(error: any): string {
    const message = error?.message || String(error);
    
    if (message.includes("unauthenticated")) {
      return "You must be signed in to generate AI content.";
    }
    if (message.includes("permission-denied")) {
      return "Access denied. Only system administrators and super admins are authorized to trigger AI listing generation.";
    }
    if (message.includes("invalid-argument") || message.includes("not a valid HTTP or HTTPS")) {
      return "The affiliate link provided is invalid. Please double-check the URL (ensure it starts with http:// or https://) and try again.";
    }
    if (message.includes("quota") || message.includes("resource-exhausted") || message.includes("429")) {
      return "The AI system is currently experiencing high demand and our quota has been temporarily exceeded. Please wait a minute and try again.";
    }
    if (message.includes("timeout") || message.includes("DEADLINE_EXCEEDED")) {
      return "The connection timed out while analyzing the affiliate website. This usually happens if the target server is slow or blocking crawler requests. You can try again now.";
    }
    if (message.includes("failed-precondition") || message.includes("configuration is missing")) {
      return "Server configuration issue: The Gemini API key is missing. Please notify the platform developer.";
    }
    
    return `An unexpected error occurred during generation: ${message}. Please check your internet connection or try again later.`;
  }

  /**
   * Generates a new casino draft listing from an affiliate link and optional banner image.
   * Creates the casino draft with "ai_generated" status and logs history on the server.
   */
  async generateCasinoDraft(
    affiliateLink: string, 
    bannerImage?: string
  ): Promise<AiGenerationResult> {
    try {
      const result = await generateCasinoContent(affiliateLink, bannerImage);
      return result as AiGenerationResult;
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }

  /**
   * Regenerates content for an existing draft or casino listing.
   * Updates the listing fields in-place and appends a new audit record in the aiHistory collection.
   */
  async regenerateCasinoContent(
    casinoId: string,
    affiliateLink: string,
    bannerImage?: string
  ): Promise<AiGenerationResult> {
    try {
      const result = await generateCasinoContent(affiliateLink, bannerImage, casinoId);
      return result as AiGenerationResult;
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }

  /**
   * Legacy wrapper to prevent breaking any existing client imports.
   */
  async generateLanderContent(
    casinoId: string, 
    affiliateLink: string, 
    promptText: string, 
    adminId: string
  ): Promise<any> {
    try {
      const result = await generateCasinoContent(affiliateLink, undefined, casinoId);
      return result;
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }
}

export const aiService = new AiService();
export default aiService;
