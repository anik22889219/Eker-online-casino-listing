import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-8 ${className}`}>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1.5">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-3 self-start sm:self-auto">{action}</div>}
    </div>
  );
};
