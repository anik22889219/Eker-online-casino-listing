import React from "react";
import { AlertTriangle, Trash2, X, Archive } from "lucide-react";
import { Agent } from "../../../types/firestore";

interface AgentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onConfirmDelete: (agentId: string) => Promise<void>;
  onConfirmArchive: (agentId: string) => Promise<void>;
  isDeleting: boolean;
}

export const AgentDeleteModal: React.FC<AgentDeleteModalProps> = ({
  isOpen,
  onClose,
  agent,
  onConfirmDelete,
  onConfirmArchive,
  isDeleting,
}) => {
  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-extrabold text-white">
              Delete or Archive Agent?
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Are you sure you want to remove <strong className="text-white">{agent.name}</strong>?
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-left text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Action Choices:</p>
            <p>• <strong>Archive</strong>: Disables the agent and marks it as archived, preserving run history.</p>
            <p>• <strong>Delete</strong>: Permanently removes the agent document from Firestore.</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirmArchive(agent.id)}
              disabled={isDeleting}
              className="flex-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 font-semibold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
            <button
              onClick={() => onConfirmDelete(agent.id)}
              disabled={isDeleting}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
