import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  Play,
  Plus,
  Trash2,
  Copy,
  Settings,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Bot,
  Sliders,
  UserCheck,
  Zap,
  ArrowRight,
  Send,
  CornerDownRight,
  RefreshCw,
  Eye,
  X,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Link2,
  Unlink,
  Pause,
  UploadCloud
} from "lucide-react";
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Agent, Skill, Workflow, WorkflowNode, WorkflowEdge } from "../../types/firestore";

interface WorkflowBuilderCanvasProps {
  workflow: Workflow | null;
  agents: Agent[];
  skills: Skill[];
  onSave: (updatedWorkflow: Workflow) => Promise<void>;
  onTest: (workflowId: string) => void;
  onNewWorkflow: () => void;
}

const NODE_TYPES: Array<{
  type: WorkflowNode["type"];
  label: string;
  description: string;
  icon: any;
  color: string;
  borderColor: string;
  badgeBg: string;
}> = [
  {
    type: "start",
    label: "Start Node",
    description: "Initial trigger & input context",
    icon: Play,
    color: "text-emerald-600 bg-emerald-50",
    borderColor: "border-emerald-300",
    badgeBg: "bg-emerald-100 text-emerald-800"
  },
  {
    type: "agent",
    label: "Agent Node",
    description: "Autonomous AI agent task execution",
    icon: Bot,
    color: "text-indigo-600 bg-indigo-50",
    borderColor: "border-indigo-300",
    badgeBg: "bg-indigo-100 text-indigo-800"
  },
  {
    type: "condition",
    label: "Condition Node",
    description: "Logical branching (True / False)",
    icon: GitBranch,
    color: "text-amber-600 bg-amber-50",
    borderColor: "border-amber-300",
    badgeBg: "bg-amber-100 text-amber-800"
  },
  {
    type: "transform",
    label: "Transform Node",
    description: "JSON formatting & variable mapping",
    icon: Sliders,
    color: "text-purple-600 bg-purple-50",
    borderColor: "border-purple-300",
    badgeBg: "bg-purple-100 text-purple-800"
  },
  {
    type: "approval",
    label: "Approval Node",
    description: "Human authorization gate pause",
    icon: UserCheck,
    color: "text-rose-600 bg-rose-50",
    borderColor: "border-rose-300",
    badgeBg: "bg-rose-100 text-rose-800"
  },
  {
    type: "notification",
    label: "Notification Node",
    description: "System alert notification",
    icon: Send,
    color: "text-cyan-600 bg-cyan-50",
    borderColor: "border-cyan-300",
    badgeBg: "bg-cyan-100 text-cyan-800"
  },
  {
    type: "delay",
    label: "Delay Node",
    description: "Pause pipeline for N seconds",
    icon: Clock,
    color: "text-orange-600 bg-orange-50",
    borderColor: "border-orange-300",
    badgeBg: "bg-orange-100 text-orange-800"
  },
  {
    type: "end",
    label: "End Node",
    description: "Pipeline completion & auto-publish",
    icon: CheckCircle2,
    color: "text-teal-600 bg-teal-50",
    borderColor: "border-teal-300",
    badgeBg: "bg-teal-100 text-teal-800"
  }
];

export const WorkflowBuilderCanvas: React.FC<WorkflowBuilderCanvasProps> = ({
  workflow,
  agents,
  skills,
  onSave,
  onTest,
  onNewWorkflow
}) => {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(workflow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"canvas" | "edges">("canvas");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Drag state for interactive node position on Canvas
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Edge Creator state
  const [edgeSourceId, setEdgeSourceId] = useState<string>("");
  const [edgeTargetId, setEdgeTargetId] = useState<string>("");
  const [edgeLabel, setEdgeLabel] = useState<string>("default");

  useEffect(() => {
    setCurrentWorkflow(workflow);
  }, [workflow]);

  if (!currentWorkflow) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
        <GitBranch className="w-12 h-12 text-slate-300 mx-auto" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">No Workflow Selected</h3>
          <p className="text-xs text-slate-500">Select an existing workflow or create a new pipeline.</p>
        </div>
        <button
          onClick={onNewWorkflow}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Workflow</span>
        </button>
      </div>
    );
  }

  // Handle Save
  const handleSaveWorkflow = async (statusOverride?: "active" | "draft") => {
    setIsSaving(true);
    try {
      const updated: Workflow = {
        ...currentWorkflow,
        status: statusOverride || currentWorkflow.status,
        updatedAt: new Date().toISOString()
      };
      await onSave(updated);
      setCurrentWorkflow(updated);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto Layout Nodes in tidy sequence
  const handleAutoLayout = () => {
    const startX = 60;
    const startY = 80;
    const gapX = 260;
    const gapY = 140;

    const newNodes = currentWorkflow.nodes.map((node, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return {
        ...node,
        position: {
          x: startX + col * gapX,
          y: startY + row * gapY
        }
      };
    });

    setCurrentWorkflow({ ...currentWorkflow, nodes: newNodes });
  };

  // Add Node from Palette
  const handleAddNode = (type: WorkflowNode["type"]) => {
    const id = `node_${crypto.randomUUID().slice(0, 8)}`;
    const count = currentWorkflow.nodes.length;
    const newNode: WorkflowNode = {
      id,
      type,
      label: `${type.toUpperCase()} Step ${count + 1}`,
      config: type === "agent" ? { agentId: agents[0]?.id || "" } : {},
      position: { x: 80 + (count % 3) * 240, y: 100 + Math.floor(count / 3) * 140 }
    };

    // Auto connect from previous node if available
    let updatedEdges = [...currentWorkflow.edges];
    if (currentWorkflow.nodes.length > 0) {
      const lastNode = currentWorkflow.nodes[currentWorkflow.nodes.length - 1];
      updatedEdges.push({
        id: `e_${crypto.randomUUID().slice(0, 6)}`,
        source: lastNode.id,
        target: id,
        label: "default"
      });
    }

    setCurrentWorkflow({
      ...currentWorkflow,
      nodes: [...currentWorkflow.nodes, newNode],
      edges: updatedEdges
    });
    setSelectedNodeId(id);
  };

  // Duplicate Node
  const handleDuplicateNode = (nodeId: string) => {
    const target = currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!target) return;

    const newId = `node_${crypto.randomUUID().slice(0, 8)}`;
    const newNode: WorkflowNode = {
      ...target,
      id: newId,
      label: `${target.label} (Copy)`,
      position: {
        x: (target.position?.x || 100) + 30,
        y: (target.position?.y || 100) + 30
      }
    };

    setCurrentWorkflow({
      ...currentWorkflow,
      nodes: [...currentWorkflow.nodes, newNode]
    });
    setSelectedNodeId(newId);
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string) => {
    setCurrentWorkflow({
      ...currentWorkflow,
      nodes: currentWorkflow.nodes.filter((n) => n.id !== nodeId),
      edges: currentWorkflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Update Node Config
  const handleUpdateNodeConfig = (nodeId: string, updatedNode: Partial<WorkflowNode>) => {
    const updatedNodes = currentWorkflow.nodes.map((n) => {
      if (n.id === nodeId) {
        return { ...n, ...updatedNode, config: { ...n.config, ...updatedNode.config } };
      }
      return n;
    });
    setCurrentWorkflow({ ...currentWorkflow, nodes: updatedNodes });
  };

  // Add Edge Connection
  const handleAddEdge = () => {
    if (!edgeSourceId || !edgeTargetId || edgeSourceId === edgeTargetId) {
      alert("Please select valid, distinct Source and Target nodes.");
      return;
    }

    const newEdge: WorkflowEdge = {
      id: `e_${crypto.randomUUID().slice(0, 6)}`,
      source: edgeSourceId,
      target: edgeTargetId,
      label: edgeLabel
    };

    setCurrentWorkflow({
      ...currentWorkflow,
      edges: [...currentWorkflow.edges, newEdge]
    });
    setEdgeSourceId("");
    setEdgeTargetId("");
  };

  // Remove Edge
  const handleRemoveEdge = (edgeId: string) => {
    setCurrentWorkflow({
      ...currentWorkflow,
      edges: currentWorkflow.edges.filter((e) => e.id !== edgeId)
    });
  };

  // Node Dragging Handler on Canvas
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - (node.position?.x || 0),
        y: e.clientY - rect.top - (node.position?.y || 0)
      });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(20, Math.min(rect.width - 220, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(20, Math.min(rect.height - 120, e.clientY - rect.top - dragOffset.y));

    setCurrentWorkflow((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n))
      };
    });
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
  };

  const selectedNode = currentWorkflow.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* TOP TOOLBAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentWorkflow.name}
                onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, name: e.target.value })}
                className="text-base font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none"
              />
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  currentWorkflow.status === "active"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {currentWorkflow.status}
              </span>
            </div>
            <input
              type="text"
              value={currentWorkflow.description || ""}
              placeholder="Add pipeline description..."
              onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, description: e.target.value })}
              className="text-xs text-slate-500 w-full border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none mt-0.5"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAutoLayout}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            title="Auto-arrange canvas layout"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>Auto Layout</span>
          </button>

          <button
            onClick={() => handleSaveWorkflow("draft")}
            disabled={isSaving}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {currentWorkflow.status === "active" ? (
            <button
              onClick={() => handleSaveWorkflow("draft")}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-amber-200"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Workflow</span>
            </button>
          ) : (
            <button
              onClick={() => handleSaveWorkflow("active")}
              disabled={isSaving}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Publish Workflow</span>
            </button>
          )}

          <button
            onClick={() => onTest(currentWorkflow.id)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Workflow</span>
          </button>
        </div>
      </div>

      {/* PALETTE BAR (NODE TYPES) */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Node Palette (Click or Drag onto Canvas to Add)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {NODE_TYPES.map((nt) => {
            const IconComp = nt.icon;
            return (
              <button
                key={nt.type}
                onClick={() => handleAddNode(nt.type)}
                className={`p-2.5 rounded-2xl border ${nt.borderColor} ${nt.color} hover:scale-[1.02] active:scale-95 transition flex flex-col items-center text-center space-y-1 shadow-2xs cursor-pointer`}
              >
                <IconComp className="w-4 h-4" />
                <span className="text-[11px] font-bold text-slate-900 leading-tight">{nt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CANVAS & SIDEBAR CONFIG EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Interactive Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab("canvas")}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === "canvas" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Visual Canvas
              </button>
              <button
                onClick={() => setActiveTab("edges")}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === "edges" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Connections & Edges ({currentWorkflow.edges.length})
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              {currentWorkflow.nodes.length} Nodes Configured
            </span>
          </div>

          {activeTab === "canvas" ? (
            <div
              ref={canvasRef}
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
              className="relative w-full h-[520px] bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden select-none bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {/* Render SVG Edge Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {currentWorkflow.edges.map((edge) => {
                  const sourceNode = currentWorkflow.nodes.find((n) => n.id === edge.source);
                  const targetNode = currentWorkflow.nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const sx = (sourceNode.position?.x || 60) + 100;
                  const sy = (sourceNode.position?.y || 80) + 40;
                  const tx = (targetNode.position?.x || 60) + 100;
                  const ty = (targetNode.position?.y || 80) + 40;

                  const midX = (sx + tx) / 2;
                  const path = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;

                  return (
                    <g key={edge.id}>
                      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                      <circle cx={tx} cy={ty} r="4" fill="#818cf8" />
                      <text x={midX} y={(sy + ty) / 2 - 6} fill="#a5b4fc" fontSize="10" fontFamily="monospace" textAnchor="middle">
                        {edge.label || "default"}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Render Drag-and-Drop Nodes */}
              {currentWorkflow.nodes.map((node) => {
                const nt = NODE_TYPES.find((t) => t.type === node.type) || NODE_TYPES[1];
                const IconComp = nt.icon;
                const isSelected = selectedNodeId === node.id;
                const agent = agents.find((a) => a.id === node.config?.agentId);

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      left: `${node.position?.x || 50}px`,
                      top: `${node.position?.y || 50}px`
                    }}
                    className={`absolute w-52 bg-slate-800/90 backdrop-blur-md border rounded-2xl p-3 shadow-lg cursor-grab active:cursor-grabbing transition-all z-10 space-y-2 ${
                      isSelected
                        ? "border-indigo-400 ring-2 ring-indigo-500/50 shadow-indigo-500/10"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${nt.badgeBg}`}>
                        {node.type}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateNode(node.id);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-400 rounded transition"
                          title="Duplicate node"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                          title="Delete node"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${nt.color}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 truncate">{node.label}</h4>
                    </div>

                    {node.type === "agent" && (
                      <p className="text-[10px] text-indigo-300 font-mono truncate bg-indigo-950/60 p-1.5 rounded border border-indigo-900/50">
                        🤖 {agent?.name || "Select Agent"}
                      </p>
                    )}

                    {node.type === "condition" && node.config?.condition && (
                      <p className="text-[10px] text-amber-300 font-mono truncate bg-amber-950/60 p-1.5 rounded border border-amber-900/50">
                        🔀 {node.config.condition.leftOperand || "field"} {node.config.condition.operator || "=="}{" "}
                        {node.config.condition.rightOperand || "val"}
                      </p>
                    )}
                  </div>
                );
              })}

              {currentWorkflow.nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-2 pointer-events-none">
                  <GitBranch className="w-10 h-10 text-slate-600" />
                  <p className="text-xs font-bold">Canvas is empty. Click a node type from the palette above to start building.</p>
                </div>
              )}
            </div>
          ) : (
            /* Connections & Edges Tab */
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="text-xs font-bold text-slate-900">Add Node Connection Edge</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Source Node</label>
                  <select
                    value={edgeSourceId}
                    onChange={(e) => setEdgeSourceId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="">-- Source --</option>
                    {currentWorkflow.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Node</label>
                  <select
                    value={edgeTargetId}
                    onChange={(e) => setEdgeTargetId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="">-- Target --</option>
                    {currentWorkflow.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Branch Edge Label</label>
                  <select
                    value={edgeLabel}
                    onChange={(e) => setEdgeLabel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="default">Default Path</option>
                    <option value="true">True Branch</option>
                    <option value="false">False Branch</option>
                    <option value="approve">Approved Path</option>
                    <option value="reject">Rejected Path</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddEdge}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Connect Nodes</span>
              </button>

              <div className="space-y-2 pt-3 border-t border-slate-200">
                <h5 className="text-xs font-bold text-slate-800">Existing Edges ({currentWorkflow.edges.length})</h5>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {currentWorkflow.edges.map((edge) => {
                    const sn = currentWorkflow.nodes.find((n) => n.id === edge.source);
                    const tn = currentWorkflow.nodes.find((n) => n.id === edge.target);

                    return (
                      <div
                        key={edge.id}
                        className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sn?.label || edge.source}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-900">{tn?.label || edge.target}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold rounded">
                            {edge.label || "default"}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveEdge(edge.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* NODE CONFIGURATION DRAWER / INSPECTOR */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-600" />
              <span>Node Inspector & Config</span>
            </h3>

            {selectedNode && (
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Node Step Label</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => handleUpdateNodeConfig(selectedNode.id, { label: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              {/* AGENT NODE CONFIG */}
              {selectedNode.type === "agent" && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Select Agent *</label>
                    <select
                      value={selectedNode.config?.agentId || ""}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, agentId: e.target.value }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    >
                      <option value="">-- Choose Agent --</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Skills Override</label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-50 border border-slate-200 p-2 rounded-xl text-[11px]">
                      {skills.map((s) => {
                        const selectedSkills = selectedNode.config?.skillsOverride || [];
                        const isChecked = selectedSkills.includes(s.id);

                        return (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const nextSkills = e.target.checked
                                  ? [...selectedSkills, s.id]
                                  : selectedSkills.filter((id) => id !== s.id);
                                handleUpdateNodeConfig(selectedNode.id, {
                                  config: { ...selectedNode.config, skillsOverride: nextSkills }
                                });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-medium">{s.name}</span>
                          </label>
                        );
                      })}
                      {skills.length === 0 && (
                        <p className="text-slate-400 italic text-[10px]">No registered skills found in Firestore.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Input Mapping / Prompt Template</label>
                    <textarea
                      rows={3}
                      value={selectedNode.config?.promptTemplate || ""}
                      placeholder="e.g. Analyze casino: {{input.casinoName}} based on {{previous.output}}"
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, promptTemplate: e.target.value }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-[11px] text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Max Retries</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={selectedNode.config?.maxRetries ?? 1}
                        onChange={(e) =>
                          handleUpdateNodeConfig(selectedNode.id, {
                            config: { ...selectedNode.config, maxRetries: Number(e.target.value) }
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Timeout (s)</label>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={selectedNode.config?.timeoutSeconds ?? 30}
                        onChange={(e) =>
                          handleUpdateNodeConfig(selectedNode.id, {
                            config: { ...selectedNode.config, timeoutSeconds: Number(e.target.value) }
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Failure Behavior</label>
                    <select
                      value={selectedNode.config?.failureBehavior || "stop"}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, failureBehavior: e.target.value as any }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                    >
                      <option value="stop">Stop Pipeline (Fail Run)</option>
                      <option value="continue">Continue to Next Step</option>
                      <option value="branch">Branch to Error Handler</option>
                    </select>
                  </div>
                </div>
              )}

              {/* CONDITION NODE CONFIG */}
              {selectedNode.type === "condition" && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Field / Left Operand</label>
                    <input
                      type="text"
                      placeholder="e.g. previous.output or input.casinoName"
                      value={selectedNode.config?.condition?.leftOperand || ""}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: {
                            ...selectedNode.config,
                            condition: { ...selectedNode.config?.condition, leftOperand: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Operator</label>
                    <select
                      value={selectedNode.config?.condition?.operator || "contains"}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: {
                            ...selectedNode.config,
                            condition: { ...selectedNode.config?.condition, operator: e.target.value as any }
                          }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                    >
                      <option value="contains">Contains String</option>
                      <option value="not_contains">Does Not Contain</option>
                      <option value="equals">Equals Exactly</option>
                      <option value="not_equals">Does Not Equal</option>
                      <option value="gt">Greater Than (&gt;)</option>
                      <option value="lt">Less Than (&lt;)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Value / Right Operand</label>
                    <input
                      type="text"
                      placeholder="e.g. PASS or 100"
                      value={selectedNode.config?.condition?.rightOperand || ""}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: {
                            ...selectedNode.config,
                            condition: { ...selectedNode.config?.condition, rightOperand: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>
              )}

              {/* APPROVAL NODE CONFIG */}
              {selectedNode.type === "approval" && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Required Approver Role</label>
                    <select
                      value={selectedNode.config?.approverRole || "admin"}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, approverRole: e.target.value as any }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                    >
                      <option value="admin">Platform Administrator</option>
                      <option value="editor">Content Editor</option>
                      <option value="moderator">Casino Compliance Officer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Approval Directive Message</label>
                    <textarea
                      rows={3}
                      value={selectedNode.config?.approvalMessage || ""}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, approvalMessage: e.target.value }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Reject Behavior</label>
                    <select
                      value={selectedNode.config?.rejectBehavior || "stop"}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, rejectBehavior: e.target.value as any }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                    >
                      <option value="stop">Stop & Mark Failed</option>
                      <option value="retry">Send Back to Content Step</option>
                    </select>
                  </div>
                </div>
              )}

              {/* NOTIFICATION NODE CONFIG */}
              {selectedNode.type === "notification" && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Notification Title</label>
                    <input
                      type="text"
                      value={selectedNode.config?.notificationTitle || ""}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, notificationTitle: e.target.value }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Notification Message</label>
                    <textarea
                      rows={2}
                      value={selectedNode.config?.notificationMessage || ""}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, notificationMessage: e.target.value }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* DELAY NODE CONFIG */}
              {selectedNode.type === "delay" && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Delay Duration (Seconds)</label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={selectedNode.config?.delaySeconds ?? 5}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, delaySeconds: Number(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* END NODE CONFIG */}
              {selectedNode.type === "end" && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold">
                    <input
                      type="checkbox"
                      checked={selectedNode.config?.autoPublishAction || false}
                      onChange={(e) =>
                        handleUpdateNodeConfig(selectedNode.id, {
                          config: { ...selectedNode.config, autoPublishAction: e.target.checked }
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Auto-publish Listing to Firestore</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    If checked, the final casino review or blog post generated in upstream nodes will be automatically written to the Firestore 'casinos' database upon human approval.
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedNodeId(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs transition"
              >
                Apply Node Settings
              </button>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Sliders className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold">Click any node on the canvas to inspect and configure parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
