import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-rose-100 rounded-2xl bg-rose-50/25 ${className}`}>
      <div className="p-3 bg-rose-100/50 rounded-full text-rose-600 mb-4 animate-pulse">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-rose-950">{title}</h3>
      <p className="text-sm text-rose-800/80 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="mt-5">
          Try Again
        </Button>
      )}
    </div>
  );
};
