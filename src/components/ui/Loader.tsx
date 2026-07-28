import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  fullScreen = false,
  text,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const loaderElement = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div 
        className={`${sizeClasses[size]} border-slate-200 border-t-indigo-600 rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
      {text && <span className="text-sm font-medium text-slate-500">{text}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {loaderElement}
      </div>
    );
  }

  return loaderElement;
};
