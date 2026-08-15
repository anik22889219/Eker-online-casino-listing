import React, { useState } from "react";
import {
  Bot,
  Sparkles,
  Shield,
  Search,
  Cpu,
  FileText,
  MessageSquare,
  Activity,
  MoreVertical,
  Play,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BookOpen,
  Layers,
  ArrowUpRight,
  UserCheck,
  TrendingUp
} from "lucide-react";
import { Agent } from "../../../types/firestore";

interface AgentCardProps {
  agent: Agent;
  onOpen: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onTest: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onClone: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onOpen,
  onEdit,
  onTest,
  onToggleStatus,
  onDelete,
  onClone,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Pick dynamic icon based on avatar string or category
  const renderAvatarIcon = () => {
    const iconName = (agent.avatar || agent.category || "").toLowerCase();
    if (iconName.includes("seo") || iconName.includes("search")) {
      return <Search className="w-5 h-5 text-indigo-400" />;
    }
    if (iconName.includes("shield") || iconName.includes("moderation")) {
      return <Shield className="w-5 h-5 text-emerald-400" />;
    }
    if (iconName.includes("content") || iconName.includes("file")) {
      return <FileText className="w-5 h-5 text-amber-400" />;
    }
    if (iconName.includes("casino") || iconName.includes("zap")) {
      return <Zap className="w-5 h-5 text-purple-400" />;
    }
    if (iconName.includes("support") || iconName.includes("message")) {
      return <MessageSquare className="w-5 h-5 text-cyan-400" />;
    }
    if (iconName.includes("cpu") || iconName.includes("analytics")) {
      return <Cpu className="w-5 h-5 text-rose-400" />;
    }
    return <Bot className="w-5 h-5 text-indigo-400" />;
  };

  // Calculate success rate percentage
  const totalRuns = agent.totalRuns || 0;
  const successfulRuns = agent.successfulRuns || 0;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100;

  // Format last run time
  const formatLastRun = (isoStr?: string | null) => {
    if (!isoStr) return "Never executed";
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Unknown";
    }
  };

  const categoryColorMap: Record<string, string> = {
    seo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    content: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    moderation: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    casino: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    analytics: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    customer_support: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    general: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const badgeStyle = categoryColorMap[agent.category] || "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";

  return (
    <div
      id={`agent-card-${agent.id}`}
      className="group relative bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/20 flex flex-col justify-between"
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {renderAvatarIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-base group-hover:text-indigo-300 transition-colors">
                  {agent.name}
                </h3>
                {agent.isSystemAgent && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    System
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium line-clamp-1">{agent.role}</p>
            </div>
          </div>

          {/* Quick Actions & Menu */}
          <div className="relative shrink-0 flex items-center gap-1">
            <button
              onClick={() => onToggleStatus(agent)}
              title={agent.status === "active" ? "Disable Agent" : "Enable Agent"}
              className={`p-1.5 rounded-lg border transition-all ${
                agent.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300"
              }`}
            >
              {agent.status === "active" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-9 z-20 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 text-xs text-slate-300">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpen(agent);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Open Chat
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onTest(agent);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    Test Playground
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(agent);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    Edit Configuration
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onClone(agent);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800 hover:text-white flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    Clone Agent
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(agent);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-500/10 text-rose-400 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Agent
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
          {agent.description || "No description provided for this agent."}
        </p>

        {/* Category & Model tags */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle}`}>
            {agent.category.replace("_", " ").toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            {agent.modelConfig?.modelName || "gemini-2.5-flash"}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/50 text-slate-400 border border-slate-700/40 flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-400" />
            {agent.skillIds?.length || 0} Skills
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/50 text-slate-400 border border-slate-700/40 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-400" />
            {agent.knowledgeIds?.length || 0} Knowledge
          </span>
        </div>
      </div>

      {/* Bottom Metrics Bar */}
      <div>
        <div className="pt-3 border-t border-slate-800/70 grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
            <p className="text-[10px] text-slate-400 font-medium">Executions</p>
            <p className="text-xs font-bold text-white mt-0.5">{totalRuns}</p>
          </div>
          <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
            <p className="text-[10px] text-slate-400 font-medium">Success Rate</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">{successRate}%</p>
          </div>
          <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
            <p className="text-[10px] text-slate-400 font-medium">Last Activity</p>
            <p className="text-[11px] font-medium text-slate-300 mt-0.5 truncate" title={agent.lastRunAt || undefined}>
              {formatLastRun(agent.lastRunAt)}
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpen(agent)}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Open Agent Session
          </button>
          <button
            onClick={() => onTest(agent)}
            title="Test Prompt"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2.5 rounded-xl border border-slate-700/60 transition-all"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
