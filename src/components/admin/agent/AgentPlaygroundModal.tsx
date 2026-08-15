import React, { useState } from "react";
import {
  X,
  Play,
  Bot,
  Send,
  Loader2,
  Sparkles,
  RefreshCw,
  Cpu,
  Copy,
  Check
} from "lucide-react";
import { Agent } from "../../../types/firestore";

interface AgentPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

export const AgentPlaygroundModal: React.FC<AgentPlaygroundModalProps> = ({
  isOpen,
  onClose,
  agent,
}) => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !agent) return null;

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse("");

    try {
      // Call server endpoint for AI execution
      const res = await fetch("/api/ai/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          prompt: prompt.trim(),
          modelConfig: agent.modelConfig,
          systemInstructions: agent.systemInstructions,
          shortContext: agent.shortContext,
          personality: agent.personality,
        }),
      });

      if (!res.ok) {
        // Fallback to standard ai chat
        const fallbackRes = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: agent.systemInstructions || "You are an AI Agent." },
              { role: "user", content: prompt.trim() },
            ],
          }),
        });
        const fallbackData = await fallbackRes.json();
        setResponse(fallbackData.response || fallbackData.text || JSON.stringify(fallbackData, null, 2));
      } else {
        const data = await res.json();
        setResponse(data.response || data.text || "Execution completed.");
      }
    } catch (err: any) {
      setResponse(`[Agent Execution Error]: ${err?.message || "Failed to execute prompt."}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Playground: {agent.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Model: {agent.modelConfig?.modelName || "gemini-2.5-flash"} | Temp: {agent.modelConfig?.temperature ?? 0.7}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Test Prompt
            </label>
            <textarea
              rows={3}
              placeholder={`Enter prompt to test with ${agent.name}...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleTest}
              disabled={loading || !prompt.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-amber-950/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing Agent...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Test
                </>
              )}
            </button>
          </div>

          {response && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Output Response
                </span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
