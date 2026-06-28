import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'text' | 'circle';
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  className = '',
  count = 1,
}) => {
  const elements = Array.from({ length: count });

  const renderSkeleton = (index: number) => {
    switch (variant) {
      case 'card':
        return (
          <div key={index} className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-200" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 rounded-sm w-1/3" />
                <div className="h-3 bg-slate-200 rounded-sm w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded-sm w-full" />
              <div className="h-3 bg-slate-200 rounded-sm w-5/6" />
            </div>
            <div className="h-10 bg-slate-200 rounded-lg w-full pt-4" />
          </div>
        );
      case 'list':
        return (
          <div key={index} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-white animate-pulse">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 bg-slate-200 rounded-sm w-1/4" />
                <div className="h-3 bg-slate-200 rounded-sm w-2/3" />
              </div>
            </div>
            <div className="w-16 h-8 bg-slate-200 rounded-lg" />
          </div>
        );
      case 'circle':
        return (
          <div key={index} className={`rounded-full bg-slate-200 animate-pulse ${className}`} />
        );
      case 'text':
      default:
        return (
          <div key={index} className={`space-y-2 animate-pulse ${className}`}>
            <div className="h-4 bg-slate-200 rounded-sm w-3/4" />
            <div className="h-3 bg-slate-200 rounded-sm w-1/2" />
          </div>
        );
    }
  };

  return (
    <>
      {elements.map((_, index) => renderSkeleton(index))}
    </>
  );
};
