import React, { useState, useEffect } from "react";
import {
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  UserCheck,
  Zap,
  ArrowRight,
  ShieldAlert,
  FileText,
  Search,
  Eye,
  Bot,
  Send,
  CornerDownRight
} from "lucide-react";
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Agent, Skill, Workflow, WorkflowNode, WorkflowRun, WorkflowStepLog } from "../../types/firestore";
import { WorkflowBuilderCanvas } from "./WorkflowBuilderCanvas";

interface WorkflowEngineManagerProps {
  agents: Agent[];
}

export const WorkflowEngineManager: React.FC<WorkflowEngineManagerProps> = ({ agents }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"builder" | "runs">("builder");

  // Workflow Editor State
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Trigger Run State
  const [triggerModalOpen, setTriggerModalOpen] = useState<boolean>(false);
  const [targetWorkflowId, setTargetWorkflowId] = useState<string>("");
  const [triggerInput, setTriggerInput] = useState<string>(
    JSON.stringify({ casinoName: "MegaSpin Casino", targetKeywords: "bKash deposit casino, 100% welcome bonus", category: "Slot & Live Dealer" }, null, 2)
  );
  const [isStartingRun, setIsStartingRun] = useState<boolean>(false);

  // Run Details Log Modal
  const [selectedRunLogs, setSelectedRunLogs] = useState<{ run: WorkflowRun; steps: WorkflowStepLog[] } | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Approval Modal
  const [approvalModalRun, setApprovalModalRun] = useState<WorkflowRun | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  // Subscribe to Workflows, Skills & Workflow Runs
  useEffect(() => {
    const unsubWorkflows = onSnapshot(
      query(collection(db, "workflows"), orderBy("updatedAt", "desc")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Workflow));
        setWorkflows(list);
        if (list.length > 0 && !selectedWorkflow) {
          setSelectedWorkflow(list[0]);
        }
        if (list.length === 0 && !snap.metadata.hasPendingWrites) {
          seedDefaultExamplePipeline();
        }
      },
      (err) => console.warn("Workflows sub info:", err)
    );

    const unsubSkills = onSnapshot(
      query(collection(db, "skills"), orderBy("createdAt", "desc")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Skill));
        setSkills(list);
      },
      (err) => console.warn("Skills sub info:", err)
    );

    const unsubRuns = onSnapshot(
      query(collection(db, "workflowRuns"), orderBy("startedAt", "desc")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkflowRun));
        setRuns(list);
      },
      (err) => console.warn("WorkflowRuns sub info:", err)
    );

    return () => {
      unsubWorkflows();
      unsubSkills();
      unsubRuns();
    };
  }, []);

  // Seed standard example pipeline: Research -> Promo -> Data Analyst -> Content Writer -> SEO -> Quality -> Approval -> Publish
  const seedDefaultExamplePipeline = async () => {
    const researchAgent = agents.find((a) => a.role.toLowerCase().includes("research")) || agents[0];
    const promoAgent = agents.find((a) => a.role.toLowerCase().includes("promo") || a.role.toLowerCase().includes("marketing")) || agents[0];
    const dataAgent = agents.find((a) => a.role.toLowerCase().includes("analyst") || a.role.toLowerCase().includes("data")) || agents[0];
    const writerAgent = agents.find((a) => a.role.toLowerCase().includes("writer") || a.role.toLowerCase().includes("content")) || agents[0];
    const seoAgent = agents.find((a) => a.role.toLowerCase().includes("seo")) || agents[0];
    const qualityAgent = agents.find((a) => a.role.toLowerCase().includes("moderation") || a.role.toLowerCase().includes("audit")) || agents[0];

    const defaultPipeline: Workflow = {
      id: "casino_publishing_pipeline",
      name: "Full Casino Publishing Pipeline",
      description: "Autonomous multi-agent research, writing, SEO optimization, quality audit, human approval, and publishing pipeline.",
      category: "content_pipeline",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: "node_start",
          type: "start",
          label: "Start Pipeline",
          config: {}
        },
        {
          id: "node_research",
          type: "agent",
          label: "1. Research Agent",
          config: {
            agentId: researchAgent?.id || "default",
            promptTemplate: "Research payout speeds, game licenses, and user reputation for casino: {{input.casinoName}}. Target keywords: {{input.targetKeywords}}"
          }
        },
        {
          id: "node_promo",
          type: "agent",
          label: "2. Promo Agent",
          config: {
            agentId: promoAgent?.id || "default",
            promptTemplate: "Craft exclusive welcome bonus promo terms and rollover rules based on research: {{nodes.node_research.output}}"
          }
        },
        {
          id: "node_analyst",
          type: "agent",
          label: "3. Data Analyst",
          config: {
            agentId: dataAgent?.id || "default",
            promptTemplate: "Analyze game provider RTPs and local payment gateway support (bKash/Nagad) from promo data: {{nodes.node_promo.output}}"
          }
        },
        {
          id: "node_writer",
          type: "agent",
          label: "4. Content Writer",
          config: {
            agentId: writerAgent?.id || "default",
            promptTemplate: "Write a high-converting casino review landing page for {{input.casinoName}} incorporating analysis: {{nodes.node_analyst.output}}"
          }
        },
        {
          id: "node_seo",
          type: "agent",
          label: "5. SEO Agent",
          config: {
            agentId: seoAgent?.id || "default",
            promptTemplate: "Optimize review meta title, description, and subheadings for Google ranking: {{nodes.node_writer.output}}"
          }
        },
        {
          id: "node_quality",
          type: "agent",
          label: "6. Quality Agent",
          config: {
            agentId: qualityAgent?.id || "default",
            promptTemplate: "Audit review for compliance, accuracy, and tone. Output PASS or FAIL: {{nodes.node_seo.output}}"
          }
        },
        {
          id: "node_approval",
          type: "approval",
          label: "7. Human Approval Gate",
          config: {
            approvalMessage: "Please review generated casino review and SEO meta before publishing."
          }
        },
        {
          id: "node_end",
          type: "end",
          label: "8. Publish Listing",
          config: {
            autoPublishAction: true
          }
        }
      ],
      edges: [
        { id: "e1", source: "node_start", target: "node_research" },
        { id: "e2", source: "node_research", target: "node_promo" },
        { id: "e3", source: "node_promo", target: "node_analyst" },
        { id: "e4", source: "node_analyst", target: "node_writer" },
        { id: "e5", source: "node_writer", target: "node_seo" },
        { id: "e6", source: "node_seo", target: "node_quality" },
        { id: "e7", source: "node_quality", target: "node_approval" },
        { id: "e8", source: "node_approval", target: "node_end", label: "approve" }
      ]
    };

    await setDoc(doc(db, "workflows", defaultPipeline.id), defaultPipeline);
  };

  // Save updated workflow to Firestore
  const handleSaveWorkflow = async (updatedWorkflow: Workflow) => {
    await setDoc(doc(db, "workflows", updatedWorkflow.id), updatedWorkflow, { merge: true });
    setSelectedWorkflow(updatedWorkflow);
  };

  // Create fresh workflow draft
  const handleCreateNewWorkflow = async () => {
    const id = `wf_${crypto.randomUUID().slice(0, 8)}`;
    const newWf: Workflow = {
      id,
      name: "New Custom Pipeline",
      description: "Custom visual workflow editor pipeline",
      category: "custom_pipeline",
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: "node_start",
          type: "start",
          label: "Start Trigger",
          config: {},
          position: { x: 60, y: 100 }
        },
        {
          id: "node_agent_1",
          type: "agent",
          label: "AI Task Step",
          config: { agentId: agents[0]?.id || "" },
          position: { x: 300, y: 100 }
        },
        {
          id: "node_end",
          type: "end",
          label: "Finish Step",
          config: {},
          position: { x: 540, y: 100 }
        }
      ],
      edges: [
        { id: "e1", source: "node_start", target: "node_agent_1", label: "default" },
        { id: "e2", source: "node_agent_1", target: "node_end", label: "default" }
      ]
    };

    await setDoc(doc(db, "workflows", newWf.id), newWf);
    setSelectedWorkflow(newWf);
  };

  // Start Workflow Execution
  const handleStartWorkflow = async () => {
    if (!targetWorkflowId) return;
    setIsStartingRun(true);

    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(triggerInput);
      } catch (e) {
        alert("Invalid JSON format in initial input.");
        setIsStartingRun(false);
        return;
      }

      const res = await fetch(`/api/workflows/${targetWorkflowId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialInput: parsedInput, triggeredBy: "admin_ui" })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start workflow");
      }

      setTriggerModalOpen(false);
      setActiveSubTab("runs");
    } catch (err: any) {
      alert(`Error starting workflow: ${err.message}`);
    } finally {
      setIsStartingRun(false);
    }
  };

  // Handle Human Approval (Approve / Reject)
  const handleApprovalAction = async (action: "approve" | "reject") => {
    if (!approvalModalRun) return;
    setIsSubmittingApproval(true);

    try {
      const res = await fetch(`/api/workflow-runs/${approvalModalRun.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: approvalNotes, approvedBy: "admin" })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process approval action");
      }

      setApprovalModalRun(null);
      setApprovalNotes("");
    } catch (err: any) {
      alert(`Approval processing error: ${err.message}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // View Step Logs for Run
  const handleViewRunLogs = async (run: WorkflowRun) => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/workflow-runs/${run.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedRunLogs({ run: data.run, steps: data.steps || [] });
      } else {
        alert("Failed to fetch step logs.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Retry Failed Step
  const handleRetryRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/workflow-runs/${runId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Retry failed");
      alert("Workflow execution retried successfully!");
    } catch (err: any) {
      alert(`Retry Error: ${err.message}`);
    }
  };

  // Cancel Run
  const handleCancelRun = async (runId: string) => {
    if (!confirm("Are you sure you want to cancel this active workflow run?")) return;
    try {
      const res = await fetch(`/api/workflow-runs/${runId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by admin" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Cancel failed");
    } catch (err: any) {
      alert(`Cancel Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Multi-Agent Workflow Engine</h2>
            <p className="text-xs text-slate-500">
              Chain agents, conditional gates, human approval, and automated actions in Firestore workflows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab("builder")}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeSubTab === "builder" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Workflows ({workflows.length})
            </button>
            <button
              onClick={() => setActiveSubTab("runs")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeSubTab === "runs" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Execution Runs ({runs.length})</span>
              {runs.some((r) => r.status === "waiting_approval") && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </button>
          </div>

          <button
            onClick={seedDefaultExamplePipeline}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            title="Reset Default Example Pipeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================
          SUB-TAB 1: WORKFLOW BUILDER & LIST
          ========================================================= */}
      {activeSubTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <button
                onClick={handleCreateNewWorkflow}
                className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-3">
              {workflows
                .filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((wf) => (
                  <div
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                      selectedWorkflow?.id === wf.id
                        ? "bg-indigo-50/60 border-indigo-400 text-slate-900 shadow-xs"
                        : "bg-white border-slate-200 hover:border-indigo-200 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded-md uppercase">
                        {wf.category || "pipeline"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          wf.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {wf.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{wf.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{wf.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                      <span>{wf.nodes.length} Nodes</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetWorkflowId(wf.id);
                          setTriggerModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Drag-and-Drop Visual Canvas & Editor */}
          <div className="lg:col-span-2">
            <WorkflowBuilderCanvas
              workflow={selectedWorkflow}
              agents={agents}
              skills={skills}
              onSave={handleSaveWorkflow}
              onTest={(wfId) => {
                setTargetWorkflowId(wfId);
                setTriggerModalOpen(true);
              }}
              onNewWorkflow={handleCreateNewWorkflow}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-TAB 2: WORKFLOW RUNS & LOGS
          ========================================================= */}
      {activeSubTab === "runs" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Workflow Execution Runs</h3>
            <span className="text-xs text-slate-400">{runs.length} Total Runs Logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="pb-3 font-semibold">Run ID</th>
                  <th className="pb-3 font-semibold">Workflow</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Started At</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 font-mono text-[11px] text-slate-500">{r.id.slice(0, 8)}...</td>
                    <td className="py-3 font-bold text-slate-900">{r.workflowName}</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          r.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "waiting_approval"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : r.status === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {r.status === "waiting_approval" && <Clock className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {new Date(r.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3 flex items-center gap-2">
                      <button
                        onClick={() => handleViewRunLogs(r)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Logs</span>
                      </button>

                      {r.status === "waiting_approval" && (
                        <button
                          onClick={() => {
                            setApprovalModalRun(r);
                            setApprovalNotes("");
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 shadow-xs"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Approve Gate</span>
                        </button>
                      )}

                      {r.status === "failed" && (
                        <button
                          onClick={() => handleRetryRun(r.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}

                      {r.status === "running" && (
                        <button
                          onClick={() => handleCancelRun(r.id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] rounded-lg transition"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {runs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No workflow executions recorded yet. Execute a pipeline to view step logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          TRIGGER RUN MODAL
          ========================================================= */}
      {triggerModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                Trigger Workflow Execution
              </h3>
              <button
                onClick={() => setTriggerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Workflow</label>
                <select
                  value={targetWorkflowId}
                  onChange={(e) => setTargetWorkflowId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                >
                  <option value="">-- Choose Pipeline --</option>
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.nodes.length} nodes)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Initial Input JSON</label>
                <textarea
                  rows={6}
                  value={triggerInput}
                  onChange={(e) => setTriggerInput(e.target.value)}
                  className="w-full bg-slate-900 text-slate-100 font-mono text-[11px] p-3 rounded-xl focus:outline-none"
                />
              </div>

              <button
                onClick={handleStartWorkflow}
                disabled={isStartingRun || !targetWorkflowId}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                {isStartingRun ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Start Pipeline Execution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          HUMAN APPROVAL GATE MODAL
          ========================================================= */}
      {approvalModalRun && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 -mx-6 -mt-6 p-6 rounded-t-3xl">
              <div className="flex items-center gap-2 text-amber-800">
                <UserCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold">Human Approval Gate Required</h3>
              </div>
              <button
                onClick={() => setApprovalModalRun(null)}
                className="text-amber-800/60 hover:text-amber-900 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Workflow <strong className="text-slate-900">{approvalModalRun.workflowName}</strong> requires administrator authorization before proceeding to downstream publishing nodes.
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Approval / Feedback Notes</label>
                <textarea
                  rows={3}
                  placeholder="Optional review notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleApprovalAction("reject")}
                  disabled={isSubmittingApproval}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject & Stop</span>
                </button>

                <button
                  onClick={() => handleApprovalAction("approve")}
                  disabled={isSubmittingApproval}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isSubmittingApproval ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Approve & Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          RUN EXECUTION LOGS MODAL
          ========================================================= */}
      {selectedRunLogs && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Execution Step Logs</h3>
                <p className="text-xs text-slate-500 font-mono">Run ID: {selectedRunLogs.run.id}</p>
              </div>
              <button
                onClick={() => setSelectedRunLogs(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedRunLogs.steps.map((step, idx) => (
                <div key={step.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded uppercase">
                        {step.nodeType}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{step.nodeLabel}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        step.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : step.status === "waiting_approval"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {step.status} ({step.executionTimeMs || 0}ms)
                    </span>
                  </div>

                  {step.input && (
                    <div className="bg-white border border-slate-200 rounded-xl p-2 font-mono text-[10px] text-slate-700">
                      <span className="text-slate-400 font-sans block text-[9px]">Input:</span>
                      {JSON.stringify(step.input, null, 2)}
                    </div>
                  )}

                  {step.output && (
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                      <span className="text-indigo-300 font-sans block text-[9px] mb-1">Output:</span>
                      {typeof step.output === "object" ? JSON.stringify(step.output, null, 2) : String(step.output)}
                    </div>
                  )}

                  {step.error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 text-xs">
                      <strong>Error:</strong> {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
