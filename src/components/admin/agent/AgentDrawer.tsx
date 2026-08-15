import React, { useState, useEffect } from "react";
import {
  X,
  Bot,
  Sparkles,
  Save,
  Cpu,
  Shield,
  FileText,
  Sliders,
  Lock,
  Layers,
  BookOpen,
  Check,
  AlertCircle,
  Zap,
  Search,
  MessageSquare,
  HelpCircle,
  Wrench
} from "lucide-react";
import { Agent, AgentCategory, AgentStatus, Skill, KnowledgeDoc } from "../../../types/firestore";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Partial<Agent> | null;
  onSave: (agentData: Partial<Agent>) => Promise<void>;
  isSaving: boolean;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  isOpen,
  onClose,
  agent,
  onSave,
  isSaving,
}) => {
  const [activeTab, setActiveTab] = useState<
    "identity" | "context" | "personality" | "instructions" | "skills" | "model" | "permissions"
  >("identity");

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [availableKnowledge, setAvailableKnowledge] = useState<KnowledgeDoc[]>([]);

  // Fetch available Skills and Knowledge when drawer opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          // Skills
          const sSnap = await getDocs(collection(db, "skills"));
          const sList = sSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Skill));
          setAvailableSkills(sList);

          // Knowledge
          const kSnap = await getDocs(collection(db, "ai-agent-knowledge"));
          const kList = kSnap.docs.map((d) => ({ id: d.id, ...d.data() } as KnowledgeDoc));
          setAvailableKnowledge(kList);
        } catch (err) {
          console.warn("[AgentDrawer] Error fetching skills/knowledge:", err);
        }
      };
      fetchData();
    }
  }, [isOpen]);


  // Local state initialized from prop
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: "",
    role: "",
    description: "",
    avatar: "bot",
    category: "general",
    status: "active",
    systemInstructions: "",
    shortContext: "",
    longContext: "",
    personality: "",
    writingStyle: "",
    tone: "",
    modelConfig: {
      modelName: "gemini-2.5-flash",
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.95,
    },
    permissions: {
      canReadData: true,
      canWriteData: false,
      canExecuteActions: false,
      canManageUsers: false,
    },
    skillIds: [],
    knowledgeIds: [],
    toolIds: [],
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        id: agent.id,
        name: agent.name || "",
        role: agent.role || "",
        description: agent.description || "",
        avatar: agent.avatar || "bot",
        category: agent.category || "general",
        status: agent.status || "active",
        systemInstructions: agent.systemInstructions || "",
        shortContext: agent.shortContext || "",
        longContext: agent.longContext || "",
        personality: agent.personality || "",
        writingStyle: agent.writingStyle || "",
        tone: agent.tone || "",
        modelConfig: {
          modelName: agent.modelConfig?.modelName || "gemini-2.5-flash",
          temperature: agent.modelConfig?.temperature ?? 0.7,
          maxTokens: agent.modelConfig?.maxTokens ?? 2048,
          topP: agent.modelConfig?.topP ?? 0.95,
        },
        permissions: {
          canReadData: agent.permissions?.canReadData ?? true,
          canWriteData: agent.permissions?.canWriteData ?? false,
          canExecuteActions: agent.permissions?.canExecuteActions ?? false,
          canManageUsers: agent.permissions?.canManageUsers ?? false,
        },
        skillIds: agent.skillIds || [],
        knowledgeIds: agent.knowledgeIds || [],
        toolIds: agent.toolIds || [],
        totalRuns: agent.totalRuns || 0,
        successfulRuns: agent.successfulRuns || 0,
        failedRuns: agent.failedRuns || 0,
        isSystemAgent: agent.isSystemAgent || false,
      });
    } else {
      setFormData({
        name: "",
        role: "",
        description: "",
        avatar: "bot",
        category: "general",
        status: "active",
        systemInstructions: "You are a helpful AI Assistant for our gambling affiliate platform.",
        shortContext: "",
        longContext: "",
        personality: "Professional, knowledgeable, and concise.",
        writingStyle: "Clear, engaging, and structured.",
        tone: "Friendly and objective.",
        modelConfig: {
          modelName: "gemini-2.5-flash",
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.95,
        },
        permissions: {
          canReadData: true,
          canWriteData: false,
          canExecuteActions: false,
          canManageUsers: false,
        },
        skillIds: [],
        knowledgeIds: [],
        toolIds: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
      });
    }
  }, [agent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  // Preset system instruction templates
  const applyTemplate = (type: string) => {
    if (type === "seo") {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || "SEO Listing Specialist",
        role: prev.role || "SEO & Casino Content Strategist",
        category: "seo",
        systemInstructions:
          "You are an expert SEO Specialist for gambling affiliate websites. Your primary goal is to optimize casino listing titles, meta descriptions, focus keywords, and high-converting landing page text while strictly ensuring compliance with search engine guidelines and user intent.",
        personality: "Data-driven, precise, and growth-focused.",
      }));
    } else if (type === "moderation") {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || "Content Compliance Auditor",
        role: prev.role || "Review & Screenshot Moderation Agent",
        category: "moderation",
        systemInstructions:
          "You are an AI Compliance Auditor responsible for reviewing user-submitted reviews, jackpot screenshots, and promotional submissions. Verify that the screenshots are authentic, check for spam or offensive language, and summarize findings clearly.",
        personality: "Vigilant, fair, and methodical.",
      }));
    } else if (type === "casino") {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || "Casino Intel Analyst",
        role: prev.role || "Operator & Bonus Intelligence Specialist",
        category: "casino",
        systemInstructions:
          "You are an expert Casino Intelligence Analyst. You generate in-depth casino operator reviews, analyze welcome bonuses, verify payout options (e.g., bKash, Nagad, Crypto), and outline pros & cons objectively.",
        personality: "Analytical, thorough, and trustworthy.",
      }));
    } else if (type === "support") {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || "Affiliate Support Assistant",
        role: prev.role || "User Guidance & FAQ Specialist",
        category: "customer_support",
        systemInstructions:
          "You are a friendly Customer Support Assistant. Help users navigate casino deals, understand affiliate link rewards, submit win screenshots, and resolve common queries efficiently.",
        personality: "Warm, empathetic, and direct.",
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full text-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                {agent?.id ? `Edit Agent: ${formData.name || "Unnamed"}` : "Create New AI Agent"}
              </h2>
              <p className="text-xs text-slate-400">
                Configure identity, system instructions, model settings & permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "identity"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Identity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("instructions")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "instructions"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Instructions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("context")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "context"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Context
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("personality")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "personality"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Personality
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("skills")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "skills"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Skills & Knowledge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("model")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "model"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Model Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "permissions"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Permissions
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: IDENTITY */}
          {activeTab === "identity" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Agent Name <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SEO Listing Specialist"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Role / Subtitle <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Casino SEO Strategist"
                    value={formData.role || ""}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Short Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize what this agent does in 1-2 sentences..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category || "general"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as AgentCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="seo">SEO & Marketing</option>
                    <option value="content">Content Generation</option>
                    <option value="moderation">Moderation & Safety</option>
                    <option value="casino">Casino Intelligence</option>
                    <option value="analytics">Analytics & Stats</option>
                    <option value="customer_support">Customer Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status || "active"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AgentStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Avatar Icon
                  </label>
                  <select
                    value={formData.avatar || "bot"}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="bot">Bot</option>
                    <option value="search">Search (SEO)</option>
                    <option value="shield">Shield (Moderation)</option>
                    <option value="file">File (Content)</option>
                    <option value="zap">Zap (Casino)</option>
                    <option value="support">Support (Chat)</option>
                    <option value="cpu">Cpu (Analytics)</option>
                  </select>
                </div>
              </div>

              {/* Template Presets */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <label className="block text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate("seo")}
                    className="p-2.5 bg-slate-900 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-left transition-all"
                  >
                    <p className="text-xs font-bold text-white">SEO Specialist</p>
                    <p className="text-[10px] text-slate-400">Casino listing & keyword optimization</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("moderation")}
                    className="p-2.5 bg-slate-900 hover:bg-emerald-600/20 border border-slate-800 hover:border-emerald-500/40 rounded-lg text-left transition-all"
                  >
                    <p className="text-xs font-bold text-white">Content Compliance</p>
                    <p className="text-[10px] text-slate-400">Review & screenshot auditor</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("casino")}
                    className="p-2.5 bg-slate-900 hover:bg-purple-600/20 border border-slate-800 hover:border-purple-500/40 rounded-lg text-left transition-all"
                  >
                    <p className="text-xs font-bold text-white">Casino Analyst</p>
                    <p className="text-[10px] text-slate-400">Bonus & payout intel</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("support")}
                    className="p-2.5 bg-slate-900 hover:bg-cyan-600/20 border border-slate-800 hover:border-cyan-500/40 rounded-lg text-left transition-all"
                  >
                    <p className="text-xs font-bold text-white">Support Assistant</p>
                    <p className="text-[10px] text-slate-400">User help & FAQ guidance</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM INSTRUCTIONS */}
          {activeTab === "instructions" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>System Instructions / Core Prompt</span>
                  <span className="text-[10px] text-slate-500">Defines how this agent behaves</span>
                </label>
                <textarea
                  rows={12}
                  required
                  placeholder="Enter detailed system prompt for the agent..."
                  value={formData.systemInstructions || ""}
                  onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-xl text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  System Instruction Best Practices:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Be explicit about output formatting (e.g. Markdown, JSON, structured lists).</li>
                  <li>Define rules for prohibited topics or off-limit behaviors.</li>
                  <li>Specify the exact persona, guidelines, and domain scope.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: CONTEXT */}
          {activeTab === "context" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Short Context (Quick Background Memory)
                </label>
                <textarea
                  rows={4}
                  placeholder="Essential domain background info always injected into every prompt..."
                  value={formData.shortContext || ""}
                  onChange={(e) => setFormData({ ...formData, shortContext: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Long Context / Domain Rules
                </label>
                <textarea
                  rows={6}
                  placeholder="Detailed background information, brand rules, compliance rules, or regional guidelines..."
                  value={formData.longContext || ""}
                  onChange={(e) => setFormData({ ...formData, longContext: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PERSONALITY */}
          {activeTab === "personality" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tone of Voice
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Friendly, formal, authoritative"
                    value={formData.tone || ""}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Writing Style
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Concise, bullet points, narrative"
                    value={formData.writingStyle || ""}
                    onChange={(e) => setFormData({ ...formData, writingStyle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Personality Guidelines
                </label>
                <textarea
                  rows={5}
                  placeholder="Describe personality traits, speech patterns, and specific styling rules..."
                  value={formData.personality || ""}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB: SKILLS & KNOWLEDGE ASSIGNMENT */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              {/* Skills Assignment Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-indigo-400" />
                      Assign Skills ({formData.skillIds?.length || 0} selected)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Reusable skills providing specialized execution instructions.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableSkills.map((s) => {
                    const isSelected = (formData.skillIds || []).includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          const current = formData.skillIds || [];
                          const updated = isSelected
                            ? current.filter((id) => id !== s.id)
                            : [...current, s.id];
                          setFormData({ ...formData, skillIds: updated });
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-950/40 border-indigo-500/60 text-white"
                            : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                              {s.category}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{s.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{s.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent div
                          className="w-4 h-4 accent-indigo-500 mt-1 cursor-pointer"
                        />
                      </div>
                    );
                  })}

                  {availableSkills.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No skills created yet. You can create global skills in the Skills tab.
                    </div>
                  )}
                </div>
              </div>

              {/* Knowledge Base Assignment Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      Assign Knowledge Docs ({formData.knowledgeIds?.length || 0} selected)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Reusable knowledge documents injected into agent context.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableKnowledge.map((k) => {
                    const isSelected = (formData.knowledgeIds || []).includes(k.id);
                    return (
                      <div
                        key={k.id}
                        onClick={() => {
                          const current = formData.knowledgeIds || [];
                          const updated = isSelected
                            ? current.filter((id) => id !== k.id)
                            : [...current, k.id];
                          setFormData({ ...formData, knowledgeIds: updated });
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-950/40 border-amber-500/60 text-white"
                            : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                              {k.category}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{k.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{k.content}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-amber-500 mt-1 cursor-pointer"
                        />
                      </div>
                    );
                  })}

                  {availableKnowledge.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No knowledge documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* TAB 5: MODEL SETTINGS */}
          {activeTab === "model" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gemini Model Alias
                </label>
                <select
                  value={formData.modelConfig?.modelName || "gemini-2.5-flash"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      modelConfig: {
                        ...formData.modelConfig!,
                        modelName: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast, Low Latency, Recommended)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (High Reasoning & Analysis)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Legacy Pro)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Temperature ({formData.modelConfig?.temperature ?? 0.7})
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {formData.modelConfig?.temperature! < 0.3
                      ? "Precise / Factual"
                      : formData.modelConfig?.temperature! > 0.8
                      ? "Highly Creative"
                      : "Balanced"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.modelConfig?.temperature ?? 0.7}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      modelConfig: {
                        ...formData.modelConfig!,
                        temperature: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.modelConfig?.maxTokens ?? 2048}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modelConfig: {
                          ...formData.modelConfig!,
                          maxTokens: parseInt(e.target.value) || 2048,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Top P ({formData.modelConfig?.topP ?? 0.95})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.modelConfig?.topP ?? 0.95}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modelConfig: {
                          ...formData.modelConfig!,
                          topP: parseFloat(e.target.value) || 0.95,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Explicit security permissions defining what resources this agent can access or execute.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Can Read Data</p>
                    <p className="text-[10px] text-slate-400">Allow agent to read Firestore documents & collections</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.permissions?.canReadData ?? true}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions!,
                          canReadData: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                </label>

                <div className="border-t border-slate-800/80 my-2" />

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Can Write Data</p>
                    <p className="text-[10px] text-slate-400">Allow agent to insert or modify database records</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.permissions?.canWriteData ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions!,
                          canWriteData: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                </label>

                <div className="border-t border-slate-800/80 my-2" />

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Can Execute Actions</p>
                    <p className="text-[10px] text-slate-400">Allow agent to trigger automated workflow tasks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.permissions?.canExecuteActions ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions!,
                          canExecuteActions: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                </label>

                <div className="border-t border-slate-800/80 my-2" />

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Can Manage Users</p>
                    <p className="text-[10px] text-slate-400">Allow agent to perform user administration tasks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.permissions?.canManageUsers ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions!,
                          canManageUsers: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-950 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving Agent..." : agent?.id ? "Update Agent" : "Create Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
