import React, { useState, useMemo } from "react";
import {
  Bot,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  FolderOpen
} from "lucide-react";
import { Agent, AgentCategory, AgentStatus } from "../../../types/firestore";
import { AgentCard } from "./AgentCard";

interface AgentDashboardProps {
  agents: Agent[];
  loading: boolean;
  onOpenAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onTestAgent: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onCloneAgent: (agent: Agent) => void;
  onCreateAgent: () => void;
  onSeedDefaults: () => Promise<void>;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  agents,
  loading,
  onOpenAgent,
  onEditAgent,
  onTestAgent,
  onToggleStatus,
  onDeleteAgent,
  onCloneAgent,
  onCreateAgent,
  onSeedDefaults,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === "active").length;
    const totalRuns = agents.reduce((acc, a) => acc + (a.totalRuns || 0), 0);
    const successfulRuns = agents.reduce((acc, a) => acc + (a.successfulRuns || 0), 0);
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100;

    return { total, active, totalRuns, successRate };
  }, [agents]);

  // Filter Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        !searchTerm.trim() ||
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || agent.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || agent.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [agents, searchTerm, categoryFilter, statusFilter]);

  const hasActiveFilters = searchTerm !== "" || categoryFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Agents</p>
            <h4 className="text-2xl font-black text-white mt-0.5">{metrics.total}</h4>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Agents</p>
            <h4 className="text-2xl font-black text-emerald-400 mt-0.5">{metrics.active}</h4>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Executions</p>
            <h4 className="text-2xl font-black text-amber-400 mt-0.5">{metrics.totalRuns}</h4>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Success Rate</p>
            <h4 className="text-2xl font-black text-cyan-400 mt-0.5">{metrics.successRate}%</h4>
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Selectors */}
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="seo">SEO & Marketing</option>
              <option value="content">Content</option>
              <option value="moderation">Moderation</option>
              <option value="casino">Casino Intelligence</option>
              <option value="analytics">Analytics</option>
              <option value="customer_support">Customer Support</option>
              <option value="general">General</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {agents.length === 0 && (
            <button
              onClick={onSeedDefaults}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              Load Default Agents
            </button>
          )}

          <button
            onClick={onCreateAgent}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-950 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 h-64 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-800 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-slate-800/40 rounded-xl" />
              <div className="h-8 bg-slate-800/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onOpen={onOpenAgent}
              onEdit={onEditAgent}
              onTest={onTestAgent}
              onToggleStatus={onToggleStatus}
              onDelete={onDeleteAgent}
              onClone={onCloneAgent}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No AI Agents Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {hasActiveFilters
                ? "No agents match your current search criteria or category filter."
                : "You have not configured any AI agents yet. Get started by creating your first specialized agent or loading default platform agents."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Clear Search Filters
              </button>
            ) : (
              <>
                <button
                  onClick={onSeedDefaults}
                  className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  Load System Default Agents
                </button>
                <button
                  onClick={onCreateAgent}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 flex items-center gap-2 shadow-lg shadow-indigo-950"
                >
                  <Plus className="w-4 h-4" />
                  Create Agent
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
