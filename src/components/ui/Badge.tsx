import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  className = '',
}) => {
  const styles = {
    primary: 'bg-indigo-50 border-indigo-150 text-indigo-700',
    secondary: 'bg-slate-100 border-slate-200 text-slate-700',
    success: 'bg-emerald-50 border-emerald-150 text-emerald-700',
    danger: 'bg-rose-50 border-rose-150 text-rose-700',
    warning: 'bg-amber-50 border-amber-150 text-amber-700',
    info: 'bg-cyan-50 border-cyan-150 text-cyan-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
