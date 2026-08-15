import React, { useState } from "react";
import {
  Cpu,
  Database,
  Server,
  Zap,
  Code,
  Terminal,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  Download,
  Info,
  Layers,
  Bot,
  Wrench,
  GitBranch,
  FileText,
  Lock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight
} from "lucide-react";

export const SystemDetailsView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeSubSection, setActiveSubSection] = useState<"overview" | "schema" | "agents" | "api" | "manual">("overview");
  const [expandedCollection, setExpandedCollection] = useState<string | null>("casinos");

  const systemBlueprint = {
    appName: "RefDirect Lead System",
    version: "2.5.0-PROD",
    environment: "Cloud Run Container Sandbox",
    runtimePort: 3000,
    serverType: "Express v4/v5 + Vite Dev Middleware",
    aiModelSDK: "@google/genai TypeScript SDK",
    primaryModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
    databaseType: "Google Cloud Firestore (default)",
    storagePipeline: "Cloudinary CDN + Firebase Storage",
    authProvider: "Firebase Authentication (Email/Password + Anonymous)",
    securityRules: "firestore.rules (Role-based Admin & Public access)",
    collectionsCount: 13,
    activeAgentsCount: 4,
  };

  const collectionsList = [
    {
      id: "casinos",
      name: "casinos",
      purpose: "Stores online casino operator listings, affiliate links, deposit methods, ratings, and SEO text.",
      fields: [
        { name: "id", type: "string", desc: "Unique Firestore Document ID / Slug" },
        { name: "casinoName", type: "string", desc: "Operator brand title (e.g. QQ777, TK10)" },
        { name: "affiliateLink", type: "string", desc: "Monetized affiliate tracking redirect URL" },
        { name: "casinoLogo", type: "string", desc: "URL to CDN logo asset" },
        { name: "rating", type: "number", desc: "Rating out of 5.0 (e.g. 4.9)" },
        { name: "welcomeBonus", type: "string", desc: "Bonus summary (e.g. 100% up to 10,000 BDT)" },
        { name: "paymentMethods", type: "array<string>", desc: "Supported payment gateways (bKash, Nagad, Rocket, Crypto)" },
        { name: "shortDescription", type: "string", desc: "Card teaser excerpt for homepage grid" },
        { name: "landingContent", type: "string", desc: "Full markdown review body" },
        { name: "seoTitle", type: "string", desc: "Search-engine optimized title tag (<60 chars)" },
        { name: "metaDescription", type: "string", desc: "Meta description snippet (<155 chars)" },
        { name: "status", type: "string ('published'|'draft'|'archived')", desc: "Visibility lifecycle status" },
        { name: "updatedAt", type: "ISO string", desc: "Timestamp of last modification" },
      ]
    },
    {
      id: "reviews",
      name: "reviews",
      purpose: "Contains user-submitted player reviews, ratings, winning screenshots, and moderation statuses.",
      fields: [
        { name: "id", type: "string", desc: "Unique Review ID" },
        { name: "casinoId", type: "string", desc: "Foreign key linking to target casino doc" },
        { name: "userName", type: "string", desc: "DisplayName or anonymous handle" },
        { name: "rating", type: "number", desc: "Rating given by user (1 to 5)" },
        { name: "comment", type: "string", desc: "Review comment body text" },
        { name: "screenshotUrl", type: "string (optional)", desc: "Uploaded proof screenshot URL" },
        { name: "approved", type: "boolean", desc: "Admin moderation flag (true = public)" },
        { name: "aiModerated", type: "boolean", desc: "Whether auto-scanned by Compliance Auditor" },
        { name: "createdAt", type: "ISO string", desc: "Submission timestamp" },
      ]
    },
    {
      id: "sellRequests",
      name: "sellRequests",
      purpose: "B2B casino operator partnership requests and link acquisition deals.",
      fields: [
        { name: "id", type: "string", desc: "Proposal ID" },
        { name: "casinoName", type: "string", desc: "Applicant operator name" },
        { name: "contactEmail", type: "string", desc: "Partner business email" },
        { name: "bidAmount", type: "number", desc: "Offered sponsorship amount" },
        { name: "message", type: "string", desc: "Inquiry or deal terms text" },
        { name: "status", type: "string ('pending'|'accepted'|'rejected')", desc: "Deal review state" },
        { name: "createdAt", type: "ISO string", desc: "Request timestamp" },
      ]
    },
    {
      id: "blogs",
      name: "blogs",
      purpose: "Dynamic gambling guide, strategy, and platform news articles.",
      fields: [
        { name: "id", type: "string", desc: "Blog ID / Slug" },
        { name: "title", type: "string", desc: "Article main headline" },
        { name: "slug", type: "string", desc: "URL-friendly permalink" },
        { name: "excerpt", type: "string", desc: "Short preview paragraph" },
        { name: "content", type: "string (markdown)", desc: "Article body in Markdown" },
        { name: "coverImage", type: "string", desc: "Header banner image URL" },
        { name: "author", type: "string", desc: "Author profile name" },
        { name: "published", type: "boolean", desc: "Public visibility toggle" },
        { name: "createdAt", type: "ISO string", desc: "Creation date" },
      ]
    },
    {
      id: "agents",
      name: "agents",
      purpose: "Stores multi-agent configurations, system instructions, permissions, and performance stats.",
      fields: [
        { name: "id", type: "string", desc: "Unique Agent Identifier" },
        { name: "name", type: "string", desc: "Agent display title" },
        { name: "role", type: "string", desc: "Specialized role definition" },
        { name: "category", type: "string", desc: "seo, moderation, casino, customer_support, analytics" },
        { name: "systemInstructions", type: "string", desc: "Core directive prompt injected to model" },
        { name: "modelConfig", type: "object", desc: "modelName, temperature, maxTokens, topP" },
        { name: "permissions", type: "object", desc: "canReadData, canWriteData, canExecuteActions" },
        { name: "skillIds", type: "array<string>", desc: "Linked skill IDs" },
        { name: "totalRuns", type: "number", desc: "Execution count metric" },
        { name: "successfulRuns", type: "number", desc: "Successful run count" },
        { name: "status", type: "string", desc: "active | inactive | archived" },
      ]
    },
    {
      id: "skills",
      name: "skills",
      purpose: "Reusable AI capability execution directives (e.g. SEO Optimizer, OCR Auditor).",
      fields: [
        { name: "id", type: "string", desc: "Skill ID" },
        { name: "name", type: "string", desc: "Skill title" },
        { name: "category", type: "string", desc: "Functional classification" },
        { name: "instructions", type: "string", desc: "Prompt directives for execution" },
        { name: "enabled", type: "boolean", desc: "Active toggle" },
        { name: "version", type: "number", desc: "Skill revision counter" },
      ]
    },
    {
      id: "workflows",
      name: "workflows",
      purpose: "Visual Node Graph workflows connecting triggers, agents, conditions, and actions.",
      fields: [
        { name: "id", type: "string", desc: "Workflow ID" },
        { name: "name", type: "string", desc: "Workflow pipeline title" },
        { name: "nodes", type: "array<WorkflowNode>", desc: "Triggers, Agent Nodes, Condition Nodes, Action Nodes" },
        { name: "edges", type: "array<WorkflowEdge>", desc: "Connecting graph links" },
        { name: "status", type: "string", desc: "active | draft | paused" },
      ]
    },
    {
      id: "notifications",
      name: "notifications",
      purpose: "Admin alerts, diagnostic health reports, missing field warnings, and scheduled tasks.",
      fields: [
        { name: "id", type: "string", desc: "Notification ID" },
        { name: "title", type: "string", desc: "Alert headline" },
        { name: "message", type: "string", desc: "Detailed issue report" },
        { name: "priority", type: "string ('low'|'medium'|'high'|'critical')", desc: "Severity level" },
        { name: "type", type: "string", desc: "seo_missing, review_flag, system_alert, admin_task" },
        { name: "read", type: "boolean", desc: "Read status flag" },
        { name: "scheduledAt", type: "ISO string (optional)", desc: "Scheduled reminder trigger date" },
      ]
    },
    {
      id: "memories",
      name: "ai-agent-memories",
      purpose: "Persistent memory cells containing user preferences, formatting rules, and business tags.",
      fields: [
        { name: "id", type: "string", desc: "Memory Cell ID" },
        { name: "text", type: "string", desc: "Guideline directive text" },
        { name: "category", type: "string", desc: "project, seo, firebase, style" },
        { name: "pinned", type: "boolean", desc: "If true, auto-injected into ALL agent prompts" },
      ]
    },
    {
      id: "knowledge",
      name: "ai-agent-knowledge",
      purpose: "Structural reference documentation blocks (bKash payout rules, SEO meta formulas).",
      fields: [
        { name: "id", type: "string", desc: "Knowledge Doc ID" },
        { name: "title", type: "string", desc: "Reference document title" },
        { name: "content", type: "string", desc: "Full guidelines or code/schema references" },
        { name: "category", type: "string", desc: "seo_rules, business_rules, firebase_structure" },
      ]
    }
  ];

  const agentSwarmSpecs = [
    {
      name: "SEO Listing Specialist",
      role: "Casino & SEO Content Strategist",
      model: "gemini-2.5-flash",
      skills: ["SEO Keyword Optimizer", "Meta Tag Generator"],
      duties: "Optimizes casino titles, meta descriptions, focus keywords, and schema markup to rank #1 on Google."
    },
    {
      name: "Content Compliance Auditor",
      role: "Review & Screenshot Moderation Agent",
      model: "gemini-2.5-flash",
      skills: ["Image OCR", "Text Moderation Engine"],
      duties: "Audits user-submitted reviews and jackpot winning screenshots for authenticity, fraud, and offensive language."
    },
    {
      name: "Casino Intel Analyst",
      role: "Operator & Bonus Intelligence Specialist",
      model: "gemini-2.5-pro",
      skills: ["Casino Evaluator", "Payment Gateway Scanner"],
      duties: "Compares casino deposit bonuses, wagering multipliers, rollover requirements, and bKash/Nagad options."
    },
    {
      name: "Affiliate Support Assistant",
      role: "User Help & FAQ Specialist",
      model: "gemini-2.5-flash",
      skills: ["FAQ Retriever", "Affiliate Link Guide"],
      duties: "Assists platform players with deposit bonuses, referral link redirects, and user account support."
    }
  ];

  const apiEndpoints = [
    { method: "POST", route: "/api/ai-agent/chat", desc: "Primary agent chat endpoint with memory & knowledge retrieval." },
    { method: "POST", route: "/api/ai-agent/scan", desc: "System-wide diagnostic database scanner for SEO and review issues." },
    { method: "POST", route: "/api/ai-agent/execute", desc: "Direct agent task execution endpoint with skill bindings." },
    { method: "POST", route: "/api/ai-agent/workflow", desc: "Workflow pipeline execution engine endpoint." },
    { method: "POST", route: "/api/cloudinary/sign", desc: "Generates secure Cloudinary signature for direct screenshot uploads." }
  ];

  const handleCopySpecs = () => {
    navigator.clipboard.writeText(JSON.stringify(systemBlueprint, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 text-slate-800 antialiased">
      {/* Hero System Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-5 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>Full System Architecture & Technical Specifications</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>সিস্টেম ডিটেইলস ও টেকনিক্যাল ইনফরমেশন</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-medium">
              Complete technical overview of RefDirect Lead Platform: Full-Stack Express Server, Gemini AI Engine, Firestore Realtime Database, Cloudinary Vision Pipeline, and Multi-Agent Architecture.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopySpecs}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied JSON!" : "Copy System Spec"}</span>
            </button>
          </div>
        </div>

        {/* Realtime System Live Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Dev Server Port</span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Port 3000 (0.0.0.0)</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">AI Core SDK</span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-400">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>@google/genai</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Database Engine</span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-400">
              <Database className="w-3 h-3 text-amber-300" />
              <span>Firestore (default)</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Collections</span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-300">
              <Layers className="w-3 h-3 text-indigo-300" />
              <span>13 Active Collections</span>
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Security Rules</span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-purple-300">
              <ShieldCheck className="w-3 h-3 text-purple-300" />
              <span>Active & Audited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-section Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubSection("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubSection === "overview"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span>System Architecture</span>
        </button>

        <button
          onClick={() => setActiveSubSection("schema")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubSection === "schema"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>Database Collections ({collectionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubSection("agents")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubSection === "agents"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Swarm & Agents</span>
        </button>

        <button
          onClick={() => setActiveSubSection("api")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubSection === "api"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>API & Endpoints Map</span>
        </button>

        <button
          onClick={() => setActiveSubSection("manual")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubSection === "manual"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span>Admin Operations Manual</span>
        </button>
      </div>

      {/* =========================================================
          SUB SECTION: SYSTEM OVERVIEW
          ========================================================= */}
      {activeSubSection === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Component Card 1: Frontend Stack */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Frontend Presentation Tier</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Single Page Application (SPA)</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">UI Library</span>
                <span className="font-mono text-[11px] text-indigo-600">React 18 + Vite</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Styling System</span>
                <span className="font-mono text-[11px] text-indigo-600">Tailwind CSS (v4)</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Iconography</span>
                <span className="font-mono text-[11px] text-indigo-600">Lucide React</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">State & Firestore</span>
                <span className="font-mono text-[11px] text-indigo-600">Real-time Snapshots</span>
              </li>
            </ul>
          </div>

          {/* Component Card 2: Express Server & Proxy */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-cyan-50 border border-cyan-100 text-cyan-600 rounded-2xl">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Express & Vite Server Core</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Backend Node Proxy (`server.ts`)</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Host & Port</span>
                <span className="font-mono text-[11px] text-cyan-700">0.0.0.0:3000</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Vite Integration</span>
                <span className="font-mono text-[11px] text-cyan-700">Development Middleware</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Build Bundler</span>
                <span className="font-mono text-[11px] text-cyan-700">esbuild &rarr; dist/server.cjs</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">API Security</span>
                <span className="font-mono text-[11px] text-cyan-700">Server-side Key Proxy</span>
              </li>
            </ul>
          </div>

          {/* Component Card 3: AI Engine */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gemini AI Model Engine</h3>
                <p className="text-[10px] text-slate-500 font-semibold">@google/genai SDK Integration</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Fast Model</span>
                <span className="font-mono text-[11px] text-amber-700">gemini-2.5-flash</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Reasoning Model</span>
                <span className="font-mono text-[11px] text-amber-700">gemini-2.5-pro</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Vision / OCR</span>
                <span className="font-mono text-[11px] text-amber-700">Gemini Multimodal OCR</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Context Engine</span>
                <span className="font-mono text-[11px] text-amber-700">Memory + Knowledge Base</span>
              </li>
            </ul>
          </div>

          {/* Component Card 4: Database Tier */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Firestore Persistence Layer</h3>
                <p className="text-[10px] text-slate-500 font-semibold">NoSQL Cloud Document Store</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Database ID</span>
                <span className="font-mono text-[11px] text-emerald-700">(default)</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Security Rules</span>
                <span className="font-mono text-[11px] text-emerald-700">firestore.rules</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Repositories</span>
                <span className="font-mono text-[11px] text-emerald-700">CasinoRepo, ReviewRepo, UserRepo</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Realtime Sync</span>
                <span className="font-mono text-[11px] text-emerald-700">onSnapshot Listeners</span>
              </li>
            </ul>
          </div>

          {/* Component Card 5: Media & Storage */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-purple-50 border border-purple-100 text-purple-600 rounded-2xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cloudinary Asset Pipeline</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Media CDN & Image Uploads</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Upload Service</span>
                <span className="font-mono text-[11px] text-purple-700">cloudinaryService.ts</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Screenshot Uploads</span>
                <span className="font-mono text-[11px] text-purple-700">Jackpot Proofs & Logos</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">CDN Optimization</span>
                <span className="font-mono text-[11px] text-purple-700">Auto WebP / Quality Compression</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Fallback Storage</span>
                <span className="font-mono text-[11px] text-purple-700">Firebase Cloud Storage</span>
              </li>
            </ul>
          </div>

          {/* Component Card 6: Cloud Functions */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Firebase Cloud Functions</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Serverless Microservices (`/functions`)</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Casino Service</span>
                <span className="font-mono text-[11px] text-rose-700">functions/src/casino/index.ts</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Review Service</span>
                <span className="font-mono text-[11px] text-rose-700">functions/src/review/index.ts</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">AI Agent Service</span>
                <span className="font-mono text-[11px] text-rose-700">functions/src/ai/index.ts</span>
              </li>
              <li className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-150">
                <span className="font-bold">Notification Service</span>
                <span className="font-mono text-[11px] text-rose-700">functions/src/notifications/index.ts</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB SECTION: DATABASE SCHEMA
          ========================================================= */}
      {activeSubSection === "schema" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  <span>Firestore Document Collections Directory</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click on any collection name to expand and inspect its data schema and field structure.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-mono font-bold">
                10 Primary Collections
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {collectionsList.map((col) => {
                const isExpanded = expandedCollection === col.id;
                return (
                  <div
                    key={col.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition bg-slate-50/50"
                  >
                    <button
                      onClick={() => setExpandedCollection(isExpanded ? null : col.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/70 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-bold shadow-xs">
                          {col.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black font-mono text-slate-900">{col.name}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">{col.purpose}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                          {col.fields.length} fields
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-3 animate-fade-in">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-medium">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2 px-3">Field Name</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3">Description & Usage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {col.fields.map((f, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition">
                                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 text-[11px]">
                                    {f.name}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[10px] text-amber-700">
                                    {f.type}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                    {f.desc}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB SECTION: AI SWARM & AGENTS
          ========================================================= */}
      {activeSubSection === "agents" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>Multi-Agent Swarm Specifications & Roles</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Overview of active specialized system agents designed to handle automation, compliance, SEO, and support.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agentSwarmSpecs.map((agent, index) => (
                <div
                  key={index}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-indigo-300 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{agent.name}</h4>
                        <span className="text-[10px] text-slate-500 font-semibold">{agent.role}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold rounded-md border border-indigo-100">
                      {agent.model}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {agent.duties}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Bound Skills:</span>
                    {agent.skills.map((sk, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB SECTION: API & ENDPOINTS MAP
          ========================================================= */}
      {activeSubSection === "api" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <span>Backend Express API Endpoints Directory</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All server-side proxy routes handled by Express (`server.ts`).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Endpoint Route</th>
                    <th className="py-2.5 px-3">Description & Behavior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {apiEndpoints.map((ep, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[10px] font-black">
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600 text-[11px]">
                        {ep.route}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        {ep.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB SECTION: ADMIN OPERATIONS MANUAL
          ========================================================= */}
      {activeSubSection === "manual" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Admin Operations & System Maintenance Guide (অপারেটিং নির্দেশিকা)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Detailed Bengali & English step-by-step documentation for managing the system, creating skills, and running diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 leading-relaxed font-medium">
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>১. এআই এজেন্ট তৈরি ও টিউনিং (Agent Creation)</span>
              </h4>
              <p>
                'Agent Manager' ট্যাবে গিয়ে "Create Agent" বাটনে ক্লিক করুন। এজেন্টের নাম, রোল, এবং স্পষ্ট System Instructions প্রদান করুন। নির্দিষ্ট মডেলে টেম্পারেচার (0.2 থেকে 0.7) সেট করে সেভ করুন।
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>২. স্কিল রেজিষ্ট্রি ও ইনস্ট্রাকশন সেট (Skill Registry)</span>
              </h4>
              <p>
                'Skills Registry' ট্যাবে নতুন পুনর্ব্যবহারযোগ্য স্কিল যোগ করুন (যেমন: SEO Title Formatting, Screenshot OCR Check)। প্রতিটি স্কিল প্রয়োজন অনুযায়ী অ্যাক্টিভ/ডিজেবল করা যায়।
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>৩. মেমোরি ও নলেজ বেস ইনজেকশন (Memory & Knowledge)</span>
              </h4>
              <p>
                'Memory Engine'-এ গুরুত্বপূর্ণ নিয়ম যুক্ত করুন এবং Pin করে দিন। 'Knowledge Base'-এ bKash/Nagad ডিপোজিট নিয়ম, ক্যাসিনো স্কিমা এবং রাইটিং গাইডলাইন লোড করে রাখুন।
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-600" />
                <span>৪. ডায়াগনস্টিক স্ক্যান ও এলার্ট (Diagnostic Scans)</span>
              </h4>
              <p>
                'AI Alerts' ট্যাবে 'Run Diagnostic Scan' বাটনে ক্লিক করলে সিস্টেম অটোমেটিক ডাটাবেজে মিসিং এসইও ফিল্ড, অপ্রকাশিত রিভিউ এবং সম্ভাব্য ট্র্যাকিং ইস্যু স্ক্যান করে নোটিফিকেশন পাঠাবে।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
