import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-indigo-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  };

  const backgrounds = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    error: 'bg-rose-50 border-rose-100 text-rose-800',
    info: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-800',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-md transition-all duration-300 max-w-sm ${backgrounds[type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button 
        onClick={() => onClose(id)} 
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition text-current opacity-70 hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
