import { GoogleGenAI, Type } from "@google/genai";
import { Agent, AgentRunLog, Skill, KnowledgeDoc } from "../types/firestore";

interface ExecuteTaskParams {
  agentId?: string;
  task?: string;
  prompt?: string;
  input?: any;
  modelConfig?: Partial<Agent["modelConfig"]>;
  systemInstructions?: string;
  shortContext?: string;
  personality?: string;
}

interface ExecuteTaskResult {
  success: boolean;
  output: string;
  runId: string;
  agentId: string;
  agentName: string;
  executionTimeMs: number;
  modelUsed: string;
  toolCallsExecuted: any[];
  error?: string;
}

export class AgentExecutorService {
  /**
   * Main Execution Pipeline for Multi-Agent AI System
   */
  public static async executeTask(
    db: any,
    params: ExecuteTaskParams
  ): Promise<ExecuteTaskResult> {
    const startTime = Date.now();
    const taskPrompt = (params.task || params.prompt || "").trim();
    if (!taskPrompt) {
      throw new Error("Task or prompt text is required for execution.");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured on the server.");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-agent-executor",
        },
      },
    });

    let agent: Partial<Agent> = {};
    let agentId = params.agentId || "default-system-agent";

    // 1. Load Agent
    if (db && params.agentId) {
      try {
        const doc = await db.collection("agents").doc(params.agentId).get();
        if (doc.exists) {
          agent = { id: doc.id, ...doc.data() };
        }
      } catch (err: any) {
        console.warn(`[AgentExecutor] Failed to fetch agent ${params.agentId}:`, err?.message || err);
      }
    }

    // Fallbacks
    const agentName = agent.name || "Default System Agent";
    const modelName =
      agent.modelConfig?.modelName ||
      params.modelConfig?.modelName ||
      "gemini-2.5-flash";
    const temperature =
      agent.modelConfig?.temperature ??
      params.modelConfig?.temperature ??
      0.7;
    const maxTokens =
      agent.modelConfig?.maxTokens ??
      params.modelConfig?.maxTokens ??
      2048;

    // 2. Load Global Context
    let globalSettingsText = "";
    if (db) {
      try {
        const settingsDoc = await db.collection("settings").doc("ai-agent").get();
        if (settingsDoc.exists) {
          const settings = settingsDoc.data();
          globalSettingsText = `GLOBAL DIRECTIVES:\nCustom Rules: ${settings.customInstructions || "None"}\nPersonality: ${settings.personality || "Standard"}\nWriting Voice: ${settings.writingStyle || "Standard"}`;
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Load Project Context
    let projectContextText = "";
    if (db) {
      try {
        const casinosSnap = await db.collection("casinos").get();
        const blogsSnap = await db.collection("blogs").get();
        projectContextText = `PROJECT SNAPSHOT:\nTotal Active Casinos: ${casinosSnap.size}\nTotal Published Blogs: ${blogsSnap.size}`;
      } catch (e) {
        // ignore
      }
    }

    // 4. Load Agent Context
    const agentContextParts = [
      agent.systemInstructions || params.systemInstructions || "You are a helpful AI Agent for RefDirect.",
      agent.shortContext || params.shortContext ? `Short Context: ${agent.shortContext || params.shortContext}` : "",
      agent.longContext ? `Long Context: ${agent.longContext}` : "",
      agent.personality || params.personality ? `Personality: ${agent.personality || params.personality}` : "",
      agent.writingStyle ? `Writing Style: ${agent.writingStyle}` : "",
      agent.tone ? `Tone: ${agent.tone}` : "",
    ].filter(Boolean);

    // 5. Load Skills
    let skillsText = "";
    const skillIdsUsed: string[] = [];
    if (db) {
      try {
        const skillIds = agent.skillIds || [];
        if (skillIds.length > 0) {
          const skillsSnap = await db.collection("skills").get();
          const loadedSkills: Skill[] = [];
          skillsSnap.forEach((doc: any) => {
            if (skillIds.includes(doc.id)) {
              loadedSkills.push({ id: doc.id, ...doc.data() } as Skill);
              skillIdsUsed.push(doc.id);
            }
          });

          if (loadedSkills.length > 0) {
            skillsText = `ASSIGNED SKILLS:\n` + loadedSkills.map(s => `- Skill: ${s.name} (${s.category})\n  Instructions: ${s.instructions}`).join("\n");
          }
        } else {
          // Fetch global enabled skills
          const skillsSnap = await db.collection("skills").where("enabled", "==", true).get();
          if (!skillsSnap.empty) {
            const loadedSkills: Skill[] = skillsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            skillsText = `AVAILABLE SYSTEM SKILLS:\n` + loadedSkills.slice(0, 5).map(s => `- Skill: ${s.name}: ${s.instructions}`).join("\n");
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 6. Load Knowledge
    let knowledgeText = "";
    const knowledgeIdsUsed: string[] = [];
    if (db) {
      try {
        const knowledgeIds = agent.knowledgeIds || [];
        if (knowledgeIds.length > 0) {
          const kSnap = await db.collection("ai-agent-knowledge").get();
          const loadedK: KnowledgeDoc[] = [];
          kSnap.forEach((doc: any) => {
            if (knowledgeIds.includes(doc.id)) {
              loadedK.push({ id: doc.id, ...doc.data() } as KnowledgeDoc);
              knowledgeIdsUsed.push(doc.id);
            }
          });
          if (loadedK.length > 0) {
            knowledgeText = `KNOWLEDGE BASE DOCUMENTS:\n` + loadedK.map(k => `### ${k.title}\nCategory: ${k.category}\nContent: ${k.content}`).join("\n\n");
          }
        } else {
          const kSnap = await db.collection("ai-agent-knowledge").get();
          if (!kSnap.empty) {
            const loadedK: KnowledgeDoc[] = kSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
            knowledgeText = `KNOWLEDGE BASE DOCUMENTS:\n` + loadedK.slice(0, 5).map(k => `### ${k.title}\nContent: ${k.content}`).join("\n\n");
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 7. Load Memory
    let memoriesText = "";
    if (db) {
      try {
        const memSnap = await db.collection("ai-agent-memories").get();
        if (!memSnap.empty) {
          const mems = memSnap.docs.map((doc: any) => doc.data());
          const pinned = mems.filter((m: any) => m.pinned).map((m: any) => `- [PINNED] ${m.text}`);
          const recent = mems.filter((m: any) => !m.pinned).slice(0, 10).map((m: any) => `- ${m.text}`);
          memoriesText = `STORED SYSTEM MEMORIES:\n` + [...pinned, ...recent].join("\n");
        }
      } catch (e) {
        // ignore
      }
    }

    // 8. Permissions & Tools Setup
    const permissions = agent.permissions || {
      canReadData: true,
      canWriteData: false,
      canExecuteActions: false,
      canManageUsers: false,
    };

    const toolsConfig = [
      {
        functionDeclarations: [
          {
            name: "getDatabaseStats",
            description: "Retrieve platform dataset statistics.",
          },
          {
            name: "searchListings",
            description: "Search casino listings or blogs in the database.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "Search term" },
                type: { type: Type.STRING, enum: ["casino", "blog"], description: "Collection" },
              },
              required: ["query", "type"],
            },
          },
          {
            name: "getListingDetails",
            description: "Fetch full document by ID.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Document ID" },
                type: { type: Type.STRING, enum: ["casino", "blog"], description: "Collection" },
              },
              required: ["id", "type"],
            },
          },
          {
            name: "updateListing",
            description: "Update existing casino listing or blog post.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Document ID" },
                type: { type: Type.STRING, enum: ["casino", "blog"], description: "Collection" },
                fields: { type: Type.OBJECT, description: "Fields to update" },
              },
              required: ["id", "type", "fields"],
            },
          },
          {
            name: "createListing",
            description: "Create a new casino listing or blog post.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["casino", "blog"], description: "Collection" },
                fields: { type: Type.OBJECT, description: "Initial data" },
              },
              required: ["type", "fields"],
            },
          },
        ],
      },
    ];

    // 9. Build AI Context System Prompt
    const systemInstruction = `You are AI Agent: ${agentName} (Role: ${agent.role || "Specialist Agent"}).
Description: ${agent.description || "Automated AI Agent"}

=== AGENT CONFIGURATION & DIRECTIVES ===
${agentContextParts.join("\n")}

=== GLOBAL SYSTEM DIRECTIVES ===
${globalSettingsText || "Standard affiliate platform rules apply."}

=== PROJECT CONTEXT ===
${projectContextText}

${skillsText ? `=== ${skillsText} ===\n` : ""}
${knowledgeText ? `=== ${knowledgeText} ===\n` : ""}
${memoriesText ? `=== ${memoriesText} ===\n` : ""}

=== EXPLICIT PERMISSIONS ===
- Read Data: ${permissions.canReadData ? "ALLOWED" : "DENIED"}
- Write Data: ${permissions.canWriteData ? "ALLOWED" : "DENIED"}
- Execute Actions: ${permissions.canExecuteActions ? "ALLOWED" : "DENIED"}
- Manage Users: ${permissions.canManageUsers ? "ALLOWED" : "DENIED"}

If an operation requires write permissions and Write Data is DENIED, explain that you lack write authorization.
Respond clearly, structured, and accurately to the user's task prompt.
`;

    // 10. Call Gemini with Tool Execution Loop
    const contents: any[] = [
      {
        role: "user",
        parts: [{ text: taskPrompt }],
      },
    ];

    const toolCallsExecuted: any[] = [];
    let outputText = "";
    let loopCount = 0;
    const maxLoops = 4;

    try {
      while (loopCount < maxLoops) {
        loopCount++;

        // Timeout wrapper for Gemini call (30s)
        const geminiPromise = ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature,
            maxOutputTokens: maxTokens,
            tools: toolsConfig,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API call timed out after 30 seconds.")), 30000)
        );

        const response = await Promise.race([geminiPromise, timeoutPromise]);
        const functionCalls = response.functionCalls;

        if (!functionCalls || functionCalls.length === 0) {
          outputText = response.text || "Execution finished with empty response.";
          break;
        }

        contents.push(response.candidates?.[0]?.content);
        const toolResponseParts = [];

        for (const call of functionCalls) {
          let toolResult: any = {};
          const callStart = Date.now();

          try {
            // Permission Guard
            if (
              ["updateListing", "createListing", "deleteListing"].includes(call.name) &&
              !permissions.canWriteData
            ) {
              toolResult = {
                success: false,
                error: `Permission Denied: Agent '${agentName}' does not have Write Data permission.`,
              };
            } else if (call.name === "getDatabaseStats") {
              if (!permissions.canReadData) {
                toolResult = { success: false, error: "Permission Denied: Read Data disabled." };
              } else if (db) {
                const cSnap = await db.collection("casinos").get();
                const bSnap = await db.collection("blogs").get();
                toolResult = { totalCasinos: cSnap.size, totalBlogs: bSnap.size };
              } else {
                toolResult = { totalCasinos: 0, totalBlogs: 0 };
              }
            } else if (call.name === "searchListings") {
              if (!permissions.canReadData) {
                toolResult = { success: false, error: "Permission Denied: Read Data disabled." };
              } else if (db) {
                const { query: q, type } = call.args as any;
                const col = type === "casino" ? "casinos" : "blogs";
                const snap = await db.collection(col).get();
                const term = (q || "").toLowerCase();
                const matches = snap.docs
                  .map((doc: any) => ({ id: doc.id, ...doc.data() }))
                  .filter((item: any) =>
                    (item.casinoName || item.title || item.slug || "")
                      .toLowerCase()
                      .includes(term)
                  )
                  .slice(0, 5);
                toolResult = { matches };
              } else {
                toolResult = { matches: [] };
              }
            } else if (call.name === "getListingDetails") {
              if (!permissions.canReadData) {
                toolResult = { success: false, error: "Permission Denied: Read Data disabled." };
              } else if (db) {
                const { id, type } = call.args as any;
                const col = type === "casino" ? "casinos" : "blogs";
                const doc = await db.collection(col).doc(id).get();
                toolResult = doc.exists
                  ? { success: true, details: doc.data() }
                  : { success: false, error: "Not found" };
              }
            } else if (call.name === "updateListing") {
              if (db) {
                const { id, type, fields } = call.args as any;
                const col = type === "casino" ? "casinos" : "blogs";
                await db.collection(col).doc(id).set(
                  { ...fields, updatedAt: new Date().toISOString() },
                  { merge: true }
                );
                toolResult = { success: true, id };
              }
            } else if (call.name === "createListing") {
              if (db) {
                const { type, fields } = call.args as any;
                const col = type === "casino" ? "casinos" : "blogs";
                const newId = fields.id || crypto.randomUUID();
                await db.collection(col).doc(newId).set({
                  id: newId,
                  ...fields,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                toolResult = { success: true, id: newId };
              }
            } else {
              toolResult = { error: `Tool ${call.name} not implemented.` };
            }
          } catch (tErr: any) {
            toolResult = { success: false, error: tErr?.message || "Execution exception" };
          }

          toolCallsExecuted.push({
            toolName: call.name,
            params: call.args,
            result: toolResult,
            durationMs: Date.now() - callStart,
          });

          toolResponseParts.push({
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          });
        }

        contents.push({
          role: "user",
          parts: toolResponseParts,
        });
      }

      const executionTimeMs = Date.now() - startTime;
      const runId = crypto.randomUUID();

      // 11. Save Agent Run Record & Update Agent Metrics in Firestore
      if (db) {
        try {
          const runLogDoc: AgentRunLog = {
            id: runId,
            agentId,
            agentName,
            task: taskPrompt,
            input: params.input || { prompt: taskPrompt },
            output: outputText,
            status: "completed",
            executionTimeMs,
            modelUsed: modelName,
            skillIdsUsed,
            knowledgeIdsUsed,
            toolCallsExecuted,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await db.collection("agentRuns").doc(runId).set(runLogDoc);

          // Update agent stats
          if (params.agentId) {
            const agentRef = db.collection("agents").doc(params.agentId);
            const agentDoc = await agentRef.get();
            if (agentDoc.exists) {
              const currentData = agentDoc.data();
              const totalRuns = (currentData.totalRuns || 0) + 1;
              const successfulRuns = (currentData.successfulRuns || 0) + 1;
              await agentRef.set(
                {
                  totalRuns,
                  successfulRuns,
                  lastRunAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            }
          }
        } catch (dbErr) {
          console.error("[AgentExecutor] Failed to write run logs to Firestore:", dbErr);
        }
      }

      return {
        success: true,
        output: outputText,
        runId,
        agentId,
        agentName,
        executionTimeMs,
        modelUsed: modelName,
        toolCallsExecuted,
      };
    } catch (execError: any) {
      const executionTimeMs = Date.now() - startTime;
      const runId = crypto.randomUUID();
      const errorMessage = execError?.message || String(execError);

      if (db && params.agentId) {
        try {
          const agentRef = db.collection("agents").doc(params.agentId);
          const agentDoc = await agentRef.get();
          if (agentDoc.exists) {
            const currentData = agentDoc.data();
            await agentRef.set(
              {
                totalRuns: (currentData.totalRuns || 0) + 1,
                failedRuns: (currentData.failedRuns || 0) + 1,
                lastRunAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        } catch (e) {
          // ignore
        }
      }

      return {
        success: false,
        output: `Agent execution failed: ${errorMessage}`,
        error: errorMessage,
        runId,
        agentId,
        agentName,
        executionTimeMs,
        modelUsed: modelName,
        toolCallsExecuted,
      };
    }
  }
}
