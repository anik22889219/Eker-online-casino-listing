import { getFirestore } from "firebase-admin/firestore";
import { AgentExecutorService } from "./AgentExecutorService";
import { Agent } from "../types/firestore";

export interface MigrationLog {
  id: string;
  feature: string;
  mappedAgentId: string;
  mappedAgentName: string;
  status: "success" | "fallback" | "error";
  inputSummary?: string;
  outputSummary?: string;
  executionTimeMs?: number;
  timestamp: string;
  details?: Record<string, any>;
}

export const SYSTEM_AGENTS: Agent[] = [
  {
    id: "agent-casino-content-writer",
    name: "Casino Content Writer Agent",
    role: "Casino Review & Landing Page Content Generator",
    description: "Generates rich Markdown landing reviews, feature highlights, FAQs, pros/cons, short descriptions, and casino metadata.",
    avatar: "file-text",
    category: "content",
    status: "active",
    systemInstructions: `You are the Casino Content Writer Agent for RefDirect.
Your responsibility is to analyze website metadata and affiliate links to compile comprehensive, engaging, and accurate casino landing page reviews.
Include:
- Official casino name
- Short description (1-2 sentences)
- Landing page introduction
- Feature highlights (3-5 items)
- Pros and Cons
- FAQs (3-5 items)
- SEO Title (under 60 chars)
- Meta Description (under 160 chars)
- Suggested keywords and slug`,
    shortContext: "Specialized in casino review drafting, landing copy, and feature summaries.",
    personality: "Engaging, thorough, clear, and conversion-focused.",
    writingStyle: "Professional review style with structured sections.",
    tone: "Informative and persuasive.",
    modelConfig: { modelName: "gemini-2.5-flash", temperature: 0.7, maxTokens: 2048, topP: 0.95 },
    permissions: { canReadData: true, canWriteData: true, canExecuteActions: true, canManageUsers: false },
    skillIds: ["casino_review_writing", "landing_content_generator"],
    knowledgeIds: ["casino_db_schema"],
    toolIds: [],
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    isSystemAgent: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-promo-vision",
    name: "Promo Vision Agent",
    role: "Promotion Banner & Game Logo Vision Analyzer",
    description: "Analyzes promo banners and game logo images using computer vision to extract slogans, RTP win rates, multipliers, and game provider details.",
    avatar: "zap",
    category: "casino",
    status: "active",
    systemInstructions: `You are the Promo Vision Agent for RefDirect.
Your role is to visually analyze promotional banner images and game logos.
For promotional banners: extract welcome slogans, deposit match offers, free spin counts, or bonus tags.
For game logos: identify game title, software provider (e.g., Pragmatic Play, Spribe, Evolution), RTP win rate, and max win multiplier.`,
    shortContext: "Computer vision analysis of casino marketing visuals and slot logos.",
    personality: "Precise, visual-first, and observant.",
    writingStyle: "Structured JSON and concise taglines.",
    tone: "Accurate and analytical.",
    modelConfig: { modelName: "gemini-2.5-flash", temperature: 0.2, maxTokens: 1024, topP: 0.95 },
    permissions: { canReadData: true, canWriteData: false, canExecuteActions: false, canManageUsers: false },
    skillIds: ["image_ocr", "promo_extractor"],
    knowledgeIds: ["marketing_standards"],
    toolIds: [],
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    isSystemAgent: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-seo-specialist",
    name: "SEO Specialist Agent",
    role: "SEO Title, Meta & Backlinked Blog Writer",
    description: "Generates search-optimized meta tags, focus keywords, and comprehensive backlinked blog posts to maximize directory SEO ranking.",
    avatar: "search",
    category: "seo",
    status: "active",
    systemInstructions: `You are the SEO Specialist Agent for RefDirect.
Your responsibility is to optimize search engine ranking, draft SEO-rich blog articles with embedded affiliate backlinks, and generate high-CTR meta titles and descriptions.`,
    shortContext: "Affiliate directory SEO, backlink strategy, and high-CTR copywriting.",
    personality: "Data-driven, strategic, and growth-oriented.",
    writingStyle: "High-ranking Markdown articles with natural link insertion.",
    tone: "Authoritative and compelling.",
    modelConfig: { modelName: "gemini-2.5-flash", temperature: 0.7, maxTokens: 3000, topP: 0.95 },
    permissions: { canReadData: true, canWriteData: true, canExecuteActions: false, canManageUsers: false },
    skillIds: ["seo_analysis", "keyword_research", "blog_writing"],
    knowledgeIds: ["seo_rules"],
    toolIds: [],
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    isSystemAgent: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-ai-operations",
    name: "AI Operations Agent",
    role: "Platform Operations & General Companion AI Agent",
    description: "Executes database diagnostics, updates listings, creates notifications, manages memory/knowledge base, and answers operator queries.",
    avatar: "bot",
    category: "general",
    status: "active",
    systemInstructions: `You are the AI Operations Agent for RefDirect.
You manage platform operations, answer operator questions, query database listings, update casino records, trigger diagnostic scans, and create smart notifications.`,
    shortContext: "Central operations assistant with database query & update capabilities.",
    personality: "Supportive, analytical, cooperative, and precise.",
    writingStyle: "Clear, conversational, and structured.",
    tone: "Professional companion.",
    modelConfig: { modelName: "gemini-3.6-flash", temperature: 0.6, maxTokens: 4096, topP: 0.95 },
    permissions: { canReadData: true, canWriteData: true, canExecuteActions: true, canManageUsers: false },
    skillIds: ["db_operations", "diagnostic_scanner"],
    knowledgeIds: ["support_faq", "casino_db_schema"],
    toolIds: ["getDatabaseStats", "searchListings", "updateListing", "createListing", "deleteListing", "createNotification"],
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    isSystemAgent: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export class MigrationService {
  /**
   * Ensures all system agents exist in Firestore without overwriting custom edits
   */
  public static async ensureSystemAgentsSeeded(db: any): Promise<void> {
    if (!db) return;
    try {
      for (const agentDoc of SYSTEM_AGENTS) {
        const ref = db.collection("agents").doc(agentDoc.id);
        const snap = await ref.get();
        if (!snap.exists) {
          await ref.set(agentDoc);
          console.log(`[MigrationService] Seeded system agent: ${agentDoc.name} (${agentDoc.id})`);
        }
      }
    } catch (error) {
      console.warn("[MigrationService] System agent seeding warning:", error);
    }
  }

  /**
   * Log migration audit events to Firestore 'migration_logs' collection
   */
  public static async logMigrationEvent(
    db: any,
    event: Omit<MigrationLog, "id" | "timestamp">
  ): Promise<void> {
    const id = `mig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logData: MigrationLog = {
      id,
      ...event,
      timestamp: new Date().toISOString()
    };

    console.log(`[MigrationLog] [${event.feature} -> ${event.mappedAgentName}] Status: ${event.status}`);

    if (db) {
      try {
        await db.collection("migration_logs").doc(id).set(logData);
      } catch (err) {
        console.warn("[MigrationService] Failed to write migration log:", err);
      }
    }
  }

  /**
   * Records an agent execution log in 'agentRuns' and updates agent statistics in 'agents' collection.
   */
  public static async recordAgentRun(
    db: any,
    agentId: string,
    task: string,
    input: any,
    output: any,
    executionTimeMs: number,
    status: "completed" | "failed" = "completed",
    error?: string
  ): Promise<void> {
    if (!db) return;
    try {
      const agentDoc = SYSTEM_AGENTS.find((a) => a.id === agentId);
      const agentName = agentDoc ? agentDoc.name : agentId;

      const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const runLog = {
        id: runId,
        agentId,
        agentName,
        task,
        input,
        output,
        status,
        error: error || null,
        executionTimeMs,
        modelUsed: agentDoc?.modelConfig.modelName || "gemini-2.5-flash",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection("agentRuns").doc(runId).set(runLog);

      // Update agent stats
      const agentRef = db.collection("agents").doc(agentId);
      const snap = await agentRef.get();
      if (snap.exists) {
        const data = snap.data();
        const totalRuns = (data.totalRuns || 0) + 1;
        const successfulRuns = (data.successfulRuns || 0) + (status === "completed" ? 1 : 0);
        const failedRuns = (data.failedRuns || 0) + (status === "failed" ? 1 : 0);
        await agentRef.update({
          totalRuns,
          successfulRuns,
          failedRuns,
          lastRunAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[MigrationService] Failed to record agent run:", err);
    }
  }

  /**
   * Get recent migration logs for admin inspection
   */
  public static async getMigrationLogs(db: any, limitCount = 50): Promise<MigrationLog[]> {
    if (!db) return [];
    try {
      const snap = await db.collection("migration_logs").get();
      const logs = snap.docs.map((doc: any) => doc.data() as MigrationLog);
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limitCount);
    } catch (e) {
      console.error("[MigrationService] Failed to fetch migration logs:", e);
      return [];
    }
  }
}
