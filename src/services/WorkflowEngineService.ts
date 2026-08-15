import { AgentExecutorService } from "./AgentExecutorService";
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowRun,
  WorkflowRunContext,
  WorkflowStepLog
} from "../types/firestore";

interface StartWorkflowParams {
  workflowId: string;
  initialInput?: Record<string, any>;
  triggeredBy?: string;
}

interface ApproveWorkflowParams {
  runId: string;
  action: "approve" | "reject";
  notes?: string;
  approvedBy?: string;
}

export class WorkflowEngineService {
  public static readonly MAX_STEP_COUNT = 50;

  /**
   * Variable Interpolator
   * Replaces templates like {{input.casinoName}}, {{nodes.node_id.output}}, {{previous.output}}
   */
  public static resolveTemplate(template: string, context: WorkflowRunContext, previousNodeId?: string): string {
    if (!template) return "";

    return template.replace(/\{\{\s*([a-zA-Z0-9_\.-]+)\s*\}\}/g, (match, path) => {
      const parts = path.split(".");

      // Case 1: {{input.key}}
      if (parts[0] === "input") {
        const val = parts.slice(1).reduce((obj: any, k: string) => obj?.[k], context.input);
        return val !== undefined ? (typeof val === "object" ? JSON.stringify(val) : String(val)) : "";
      }

      // Case 2: {{previous.output}}
      if (parts[0] === "previous" && previousNodeId) {
        const prevOutput = context.nodes[previousNodeId]?.output;
        if (parts[1] === "output" || !parts[1]) {
          return prevOutput !== undefined ? (typeof prevOutput === "object" ? JSON.stringify(prevOutput) : String(prevOutput)) : "";
        }
      }

      // Case 3: {{nodes.nodeId.output}} or {{nodes.nodeId.output.field}}
      if (parts[0] === "nodes" && parts[1]) {
        const nodeId = parts[1];
        const nodeData = context.nodes[nodeId];
        if (parts[2] === "output") {
          const val = parts.slice(3).reduce((obj: any, k: string) => obj?.[k], nodeData?.output);
          if (val !== undefined) return typeof val === "object" ? JSON.stringify(val) : String(val);
          return nodeData?.output !== undefined ? (typeof nodeData.output === "object" ? JSON.stringify(nodeData.output) : String(nodeData.output)) : "";
        }
      }

      // Direct fallback context lookup
      const fallbackVal = parts.reduce((obj: any, k: string) => obj?.[k], context.input);
      return fallbackVal !== undefined ? (typeof fallbackVal === "object" ? JSON.stringify(fallbackVal) : String(fallbackVal)) : match;
    });
  }

  /**
   * Start a new Workflow Run
   */
  public static async startWorkflow(db: any, params: StartWorkflowParams): Promise<WorkflowRun> {
    const { workflowId, initialInput = {}, triggeredBy = "system" } = params;

    let workflow: Workflow | null = null;

    if (db) {
      try {
        const workflowDoc = await db.collection("workflows").doc(workflowId).get();
        if (workflowDoc && workflowDoc.exists) {
          workflow = { id: workflowDoc.id, ...workflowDoc.data() } as Workflow;
        }
      } catch (err: any) {
        console.warn(`[WorkflowEngineService] Firestore read info (${err?.message || err}), using pipeline template fallback.`);
      }
    }

    if (!workflow) {
      workflow = {
        id: workflowId || "casino_publishing_pipeline",
        name: "Full Casino Publishing Pipeline",
        description: "Autonomous multi-agent research, writing, SEO optimization, quality audit, and publishing pipeline.",
        category: "content_pipeline",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [
          { id: "node_start", type: "start", label: "Start Pipeline", config: {} },
          { id: "node_research", type: "agent", label: "1. Research Agent", config: { agentId: "agent-casino-content-writer", promptTemplate: "Research payout speeds, game licenses, and user reputation for casino: {{input.casinoName}}. Target keywords: {{input.targetKeywords}}" } },
          { id: "node_promo", type: "agent", label: "2. Promo Agent", config: { agentId: "agent-promo-vision", promptTemplate: "Craft exclusive welcome bonus promo terms and rollover rules based on research: {{nodes.node_research.output}}" } },
          { id: "node_writer", type: "agent", label: "3. Content Writer", config: { agentId: "agent-casino-content-writer", promptTemplate: "Write a high-converting casino review landing page for {{input.casinoName}} incorporating analysis: {{nodes.node_promo.output}}" } },
          { id: "node_seo", type: "agent", label: "4. SEO Specialist", config: { agentId: "agent-seo-specialist", promptTemplate: "Optimize search engine ranking and meta title for {{input.casinoName}}" } },
          { id: "node_end", type: "end", label: "Publish Review", config: { autoPublishAction: true } }
        ],
        edges: [
          { id: "e1", source: "node_start", target: "node_research" },
          { id: "e2", source: "node_research", target: "node_promo" },
          { id: "e3", source: "node_promo", target: "node_writer" },
          { id: "e4", source: "node_writer", target: "node_seo" },
          { id: "e5", source: "node_seo", target: "node_end" }
        ]
      };
    }

    if (workflow.status !== "active") {
      workflow.status = "active";
    }

    const startNode = workflow.nodes.find((n) => n.type === "start") || workflow.nodes[0];
    if (!startNode) {
      throw new Error(`Workflow '${workflow.name}' has no Start node defined.`);
    }

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialContext: WorkflowRunContext = {
      input: initialInput,
      nodes: {
        [startNode.id]: {
          output: { message: "Workflow started successfully", input: initialInput, triggeredBy },
          status: "completed",
          executionTimeMs: 0
        }
      }
    };

    const runDoc: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      initialInput,
      context: initialContext,
      currentNodeId: startNode.id,
      startedAt: now,
      updatedAt: now
    };

    // Save initial Run to Firestore safely
    if (db) {
      try {
        await db.collection("workflowRuns").doc(runId).set(runDoc);
      } catch (err: any) {
        console.warn("[WorkflowEngineService] Firestore write runDoc warning:", err?.message || err);
      }
    }

    // Save Start Step Log
    await this.saveStepLog(db, {
      runId,
      workflowId: workflow.id,
      nodeId: startNode.id,
      nodeType: "start",
      nodeLabel: startNode.label || "Start",
      status: "completed",
      input: initialInput,
      output: initialContext.nodes[startNode.id].output,
      retryCount: 0,
      executionTimeMs: 0,
      timestamp: now
    });

    // Execute Next Nodes from Start Node
    return await this.executeFromNode(db, workflow, runDoc, startNode.id);
  }

  /**
   * Helper to safely update run state in Firestore
   */
  private static async saveRunDoc(db: any, run: WorkflowRun): Promise<void> {
    if (!db) return;
    try {
      await db.collection("workflowRuns").doc(run.id).set(run, { merge: true });
    } catch (err: any) {
      console.warn(`[WorkflowEngine] Firestore write run warning (${run.id}):`, err?.message || err);
    }
  }

  /**
   * Resume Workflow from Approval or Pause State
   */
  public static async resumeApproval(db: any, params: ApproveWorkflowParams): Promise<WorkflowRun> {
    if (!db) throw new Error("Database reference is required.");
    const { runId, action, notes = "", approvedBy = "admin" } = params;

    let run: WorkflowRun | null = null;
    let workflow: Workflow | null = null;

    try {
      const runDocRef = db.collection("workflowRuns").doc(runId);
      const runSnap = await runDocRef.get();
      if (runSnap.exists) {
        run = runSnap.data() as WorkflowRun;
      }
    } catch (err: any) {
      console.warn(`[WorkflowEngine] Read runSnap warning (${runId}):`, err?.message || err);
    }

    if (!run) {
      throw new Error(`Workflow run with ID '${runId}' not found.`);
    }

    if (run.status !== "waiting_approval" && run.status !== "paused") {
      throw new Error(`Workflow run '${runId}' is in '${run.status}' state and cannot be resumed.`);
    }

    try {
      const workflowSnap = await db.collection("workflows").doc(run.workflowId).get();
      if (workflowSnap.exists) {
        workflow = { id: workflowSnap.id, ...workflowSnap.data() } as Workflow;
      }
    } catch (err: any) {
      console.warn(`[WorkflowEngine] Read workflowSnap warning (${run.workflowId}):`, err?.message || err);
    }

    if (!workflow) {
      throw new Error(`Workflow definition '${run.workflowId}' missing.`);
    }

    const currentNodeId = run.currentNodeId;
    if (!currentNodeId) {
      throw new Error("No current node ID found on the paused workflow run.");
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      run.status = "failed";
      run.error = `Rejected during approval by ${approvedBy}. Notes: ${notes}`;
      run.finishedAt = now;
      run.updatedAt = now;
      run.context.approvalNotes = notes;

      await this.saveRunDoc(db, run);

      await this.saveStepLog(db, {
        runId,
        workflowId: workflow.id,
        nodeId: currentNodeId,
        nodeType: "approval",
        nodeLabel: "Human Approval",
        status: "failed",
        input: { approvedBy, notes },
        output: { result: "rejected", notes },
        error: run.error,
        retryCount: 0,
        executionTimeMs: 0,
        timestamp: now
      });

      return run;
    }

    // ACTION: APPROVE
    run.status = "running";
    run.updatedAt = now;
    run.context.approvedBy = approvedBy;
    run.context.approvalNotes = notes;
    run.context.nodes[currentNodeId] = {
      output: { approved: true, approvedBy, notes, timestamp: now },
      status: "completed",
      executionTimeMs: 0
    };

    await this.saveRunDoc(db, run);

    await this.saveStepLog(db, {
      runId,
      workflowId: workflow.id,
      nodeId: currentNodeId,
      nodeType: "approval",
      nodeLabel: "Human Approval",
      status: "completed",
      input: { approvedBy, notes },
      output: run.context.nodes[currentNodeId].output,
      retryCount: 0,
      executionTimeMs: 0,
      timestamp: now
    });

    // Continue to downstream nodes
    return await this.executeFromNode(db, workflow, run, currentNodeId, "approve");
  }

  /**
   * Retry a Failed Step or Workflow Run
   */
  public static async retryRun(db: any, runId: string, nodeId?: string): Promise<WorkflowRun> {
    const runDocRef = db.collection("workflowRuns").doc(runId);
    let runSnap: any = null;
    try {
      runSnap = await runDocRef.get();
    } catch (err: any) {
      console.warn("[WorkflowEngine] Read run warning:", err?.message || err);
    }

    if (!runSnap || !runSnap.exists) throw new Error(`Workflow run '${runId}' not found.`);

    const run = runSnap.data() as WorkflowRun;
    let workflowSnap: any = null;
    try {
      workflowSnap = await db.collection("workflows").doc(run.workflowId).get();
    } catch (e) {
      // fallback
    }

    const workflow: Workflow = (workflowSnap && workflowSnap.exists)
      ? ({ id: workflowSnap.id, ...workflowSnap.data() } as Workflow)
      : {
          id: run.workflowId,
          name: run.workflowName || "Pipeline Workflow",
          description: "Fallback workflow description",
          nodes: [],
          edges: [],
          category: "content_pipeline",
          status: "active",
          createdAt: "",
          updatedAt: ""
        };

    const targetNodeId = nodeId || run.currentNodeId || workflow.nodes.find((n) => n.type === "start")?.id;
    if (!targetNodeId) throw new Error("Could not determine node to retry.");

    run.status = "running";
    run.error = undefined;
    run.updatedAt = new Date().toISOString();

    await this.saveRunDoc(db, run);
    return await this.executeNode(db, workflow, run, targetNodeId);
  }

  /**
   * Cancel an Active Workflow Run
   */
  public static async cancelRun(db: any, runId: string, reason = "Cancelled by administrator"): Promise<WorkflowRun> {
    const runDocRef = db.collection("workflowRuns").doc(runId);
    let runSnap: any = null;
    try {
      runSnap = await runDocRef.get();
    } catch (e) {
      // fallback
    }
    if (!runSnap || !runSnap.exists) throw new Error(`Workflow run '${runId}' not found.`);

    const run = runSnap.data() as WorkflowRun;
    const now = new Date().toISOString();
    run.status = "cancelled";
    run.error = reason;
    run.finishedAt = now;
    run.updatedAt = now;

    await this.saveRunDoc(db, run);

    if (run.currentNodeId) {
      await this.saveStepLog(db, {
        runId,
        workflowId: run.workflowId,
        nodeId: run.currentNodeId,
        nodeType: "cancel",
        nodeLabel: "Cancellation",
        status: "cancelled",
        input: { reason },
        output: null,
        error: reason,
        retryCount: 0,
        executionTimeMs: 0,
        timestamp: now
      });
    }

    return run;
  }

  /**
   * Main Execution Loop from a given node
   */
  private static async executeFromNode(
    db: any,
    workflow: Workflow,
    run: WorkflowRun,
    currentNodeId: string,
    edgeLabelFilter?: string
  ): Promise<WorkflowRun> {
    // Find matching outgoing edges
    const outgoingEdges = workflow.edges.filter((e) => e.source === currentNodeId);
    if (outgoingEdges.length === 0) {
      // End of execution path
      run.status = "completed";
      run.finishedAt = new Date().toISOString();
      run.updatedAt = new Date().toISOString();
      await this.saveRunDoc(db, run);
      return run;
    }

    let nextEdge = outgoingEdges[0];
    if (edgeLabelFilter) {
      const match = outgoingEdges.find((e) => e.label === edgeLabelFilter);
      if (match) nextEdge = match;
    }

    const nextNodeId = nextEdge.target;
    return await this.executeNode(db, workflow, run, nextNodeId, currentNodeId);
  }

  /**
   * Execute an individual Workflow Node
   */
  private static async executeNode(
    db: any,
    workflow: Workflow,
    run: WorkflowRun,
    nodeId: string,
    previousNodeId?: string
  ): Promise<WorkflowRun> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      run.status = "failed";
      run.error = `Node '${nodeId}' missing from workflow definition.`;
      run.finishedAt = new Date().toISOString();
      await this.saveRunDoc(db, run);
      return run;
    }

    const startTime = Date.now();
    run.currentNodeId = nodeId;
    run.updatedAt = new Date().toISOString();

    // Increment and check MAX_STEP_COUNT safeguard to prevent infinite loops or recursive execution
    const currentSteps = (run.context.stepCount || 0) + 1;
    run.context.stepCount = currentSteps;

    if (currentSteps > WorkflowEngineService.MAX_STEP_COUNT) {
      run.status = "failed";
      run.error = `Workflow execution exceeded maximum step limit of ${WorkflowEngineService.MAX_STEP_COUNT} steps to prevent infinite loop.`;
      run.finishedAt = new Date().toISOString();
      await this.saveRunDoc(db, run);
      return run;
    }

    await this.saveRunDoc(db, run);

    try {
      // Handle node type execution
      switch (node.type) {
        case "agent": {
          const agentId = node.config?.agentId;
          if (!agentId) {
            throw new Error(`Agent Node '${node.label}' has no agent selected.`);
          }

          const rawPrompt = node.config?.promptTemplate || "Perform workflow task: {{input.task}}";
          const resolvedPrompt = this.resolveTemplate(rawPrompt, run.context, previousNodeId);

          // Retry loop support
          const maxRetries = node.config?.maxRetries ?? 1;
          let attempt = 0;
          let agentResult: any = null;

          while (attempt < maxRetries) {
            attempt++;
            try {
              agentResult = await AgentExecutorService.executeTask(db, {
                agentId,
                task: resolvedPrompt
              });

              if (agentResult.success) {
                break;
              }
              if (attempt >= maxRetries) {
                throw new Error(agentResult.error || "Agent execution failed after retries.");
              }
            } catch (aErr: any) {
              if (attempt >= maxRetries) throw aErr;
            }
          }

          const durationMs = Date.now() - startTime;
          const outputData = {
            text: agentResult.output,
            output: agentResult.output,
            agentId,
            agentName: agentResult.agentName,
            executionTimeMs: agentResult.executionTimeMs,
            toolCalls: agentResult.toolCallsExecuted
          };

          run.context.nodes[node.id] = {
            output: outputData,
            status: "completed",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "agent",
            nodeLabel: node.label || "Agent Step",
            status: "completed",
            input: { agentId, prompt: resolvedPrompt },
            output: outputData,
            retryCount: attempt - 1,
            executionTimeMs: durationMs,
            timestamp: new Date().toISOString()
          });

          await this.saveRunDoc(db, run);
          return await this.executeFromNode(db, workflow, run, node.id);
        }

        case "condition": {
          const condition = node.config?.condition;
          let evaluatedValue = false;

          const rawLeft = condition?.leftOperand || "previous.output";
          const leftVal = this.resolveTemplate(`{{${rawLeft}}}`, run.context, previousNodeId);
          const rightVal = condition?.rightOperand || "";

          const op = condition?.operator || "contains";
          if (op === "contains") {
            evaluatedValue = leftVal.toLowerCase().includes(rightVal.toLowerCase());
          } else if (op === "not_contains") {
            evaluatedValue = !leftVal.toLowerCase().includes(rightVal.toLowerCase());
          } else if (op === "equals") {
            evaluatedValue = leftVal.trim().toLowerCase() === rightVal.trim().toLowerCase();
          } else if (op === "not_equals") {
            evaluatedValue = leftVal.trim().toLowerCase() !== rightVal.trim().toLowerCase();
          } else if (op === "gt") {
            evaluatedValue = Number(leftVal) > Number(rightVal);
          } else if (op === "lt") {
            evaluatedValue = Number(leftVal) < Number(rightVal);
          }

          const durationMs = Date.now() - startTime;
          const targetBranch = evaluatedValue ? "true" : "false";

          run.context.nodes[node.id] = {
            output: { result: evaluatedValue, branch: targetBranch, leftVal, rightVal, operator: op },
            status: "completed",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "condition",
            nodeLabel: node.label || "Condition Step",
            status: "completed",
            input: { leftVal, rightVal, operator: op },
            output: run.context.nodes[node.id].output,
            retryCount: 0,
            executionTimeMs: durationMs,
            timestamp: new Date().toISOString()
          });

          await this.saveRunDoc(db, run);
          return await this.executeFromNode(db, workflow, run, node.id, targetBranch);
        }

        case "transform": {
          const rawTemplate = node.config?.transformTemplate || "{{previous.output}}";
          const transformedText = this.resolveTemplate(rawTemplate, run.context, previousNodeId);

          let parsedOutput: any = transformedText;
          try {
            parsedOutput = JSON.parse(transformedText);
          } catch {
            // Keep string text if not valid JSON
          }

          const durationMs = Date.now() - startTime;
          run.context.nodes[node.id] = {
            output: parsedOutput,
            status: "completed",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "transform",
            nodeLabel: node.label || "Transform Step",
            status: "completed",
            input: { template: rawTemplate },
            output: parsedOutput,
            retryCount: 0,
            executionTimeMs: durationMs,
            timestamp: new Date().toISOString()
          });

          await this.saveRunDoc(db, run);
          return await this.executeFromNode(db, workflow, run, node.id);
        }

        case "approval": {
          // Pause execution and wait for human approval
          const msg = node.config?.approvalMessage || "Human review and approval required before proceeding.";
          const resolvedMsg = this.resolveTemplate(msg, run.context, previousNodeId);
          const durationMs = Date.now() - startTime;

          run.status = "waiting_approval";
          run.context.nodes[node.id] = {
            output: { message: resolvedMsg, pendingApproval: true },
            status: "waiting_approval",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "approval",
            nodeLabel: node.label || "Approval Required",
            status: "waiting_approval",
            input: { message: resolvedMsg },
            output: { pendingApproval: true },
            retryCount: 0,
            executionTimeMs: durationMs,
            timestamp: new Date().toISOString()
          });

          await this.saveRunDoc(db, run);
          return run; // Pause execution here
        }

        case "notification": {
          const title = this.resolveTemplate(node.config?.notificationTitle || "Workflow Alert", run.context, previousNodeId);
          const message = this.resolveTemplate(node.config?.notificationMessage || "Workflow step completed.", run.context, previousNodeId);

          const notifId = crypto.randomUUID();
          const now = new Date().toISOString();

          if (db) {
            try {
              await db.collection("notifications").doc(notifId).set({
                id: notifId,
                userId: "admin",
                title,
                message,
                read: false,
                type: "workflow",
                createdAt: now
              });
            } catch (nErr: any) {
              console.warn("[WorkflowEngine] Notification write warning:", nErr?.message || nErr);
            }
          }

          const durationMs = Date.now() - startTime;
          run.context.nodes[node.id] = {
            output: { notifId, title, message },
            status: "completed",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "notification",
            nodeLabel: node.label || "Notification Sent",
            status: "completed",
            input: { title, message },
            output: { notifId },
            retryCount: 0,
            executionTimeMs: durationMs,
            timestamp: now
          });

          await this.saveRunDoc(db, run);
          return await this.executeFromNode(db, workflow, run, node.id);
        }

        case "delay": {
          const delaySec = Math.min(node.config?.delaySeconds || 1, 10); // cap max delay at 10s for sync execution
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));

          const durationMs = Date.now() - startTime;
          run.context.nodes[node.id] = {
            output: { delayedSeconds: delaySec },
            status: "completed",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "delay",
            nodeLabel: node.label || "Delay",
            status: "completed",
            input: { delaySeconds: delaySec },
            output: { delayedSeconds: delaySec },
            retryCount: 0,
            executionTimeMs: durationMs,
            timestamp: new Date().toISOString()
          });

          await this.saveRunDoc(db, run);
          return await this.executeFromNode(db, workflow, run, node.id);
        }

        case "end": {
          // Check for auto-publish requirement
          let publishedRecord = null;
          if (node.config?.autoPublishAction) {
            // Allow auto-publish if explicit approval is in context OR triggered by admin
            const triggeredBy = (run as any).triggeredBy;
            const isApproved = Boolean(run.context.approvedBy || triggeredBy === "admin_ui" || triggeredBy === "admin" || triggeredBy === "system");
            if (!isApproved) {
              console.warn("[WorkflowEngine] Auto-publish skipped: Explicit approval required.");
            } else {
              // Optional auto-publish casino/blog listing if data passed
              const payload = run.context.nodes[previousNodeId || ""]?.output;
              if (payload && typeof payload === "object" && payload.casinoName && db) {
                const casinoId = payload.id || crypto.randomUUID();
                try {
                  await db.collection("casinos").doc(casinoId).set(
                    {
                      ...payload,
                      status: "published",
                      updatedAt: new Date().toISOString()
                    },
                    { merge: true }
                  );
                  publishedRecord = { collection: "casinos", id: casinoId };
                } catch (pubErr: any) {
                  console.warn("[WorkflowEngine] Auto-publish write warning:", pubErr?.message || pubErr);
                  publishedRecord = { collection: "casinos", id: casinoId, note: "Published in-memory" };
                }
              }
            }
          }

          const durationMs = Date.now() - startTime;
          run.status = "completed";
          run.finishedAt = new Date().toISOString();
          run.context.nodes[node.id] = {
            output: { message: "Workflow finished successfully", publishedRecord },
            status: "completed",
            executionTimeMs: durationMs
          };

          await this.saveStepLog(db, {
            runId: run.id,
            workflowId: workflow.id,
            nodeId: node.id,
            nodeType: "end",
            nodeLabel: node.label || "Workflow Completed",
            status: "completed",
            input: {},
            output: run.context.nodes[node.id].output,
            retryCount: 0,
            executionTimeMs: durationMs,
            timestamp: new Date().toISOString()
          });

          await this.saveRunDoc(db, run);
          return run;
        }

        default: {
          throw new Error(`Unsupported node type '${node.type}'.`);
        }
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errMsg = err?.message || String(err);

      run.status = "failed";
      run.error = errMsg;
      run.finishedAt = new Date().toISOString();
      run.context.nodes[node.id] = {
        status: "failed",
        error: errMsg,
        executionTimeMs: durationMs
      };

      await this.saveStepLog(db, {
        runId: run.id,
        workflowId: workflow.id,
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label || "Node Step",
        status: "failed",
        input: {},
        output: null,
        error: errMsg,
        retryCount: 0,
        executionTimeMs: durationMs,
        timestamp: new Date().toISOString()
      });

      await this.saveRunDoc(db, run);
      return run;
    }
  }

  /**
   * Helper to write structured Workflow Step Logs
   */
  private static async saveStepLog(db: any, log: WorkflowStepLog): Promise<void> {
    if (!db) return;
    try {
      await db.collection("workflowSteps").doc(log.id || crypto.randomUUID()).set(log);
    } catch (err) {
      console.warn("[WorkflowEngine] Failed to write step log:", err);
    }
  }
}
