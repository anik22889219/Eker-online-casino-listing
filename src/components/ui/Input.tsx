import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || React.useId();
  
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full text-sm rounded-lg border px-3 py-2 transition-all duration-200 outline-none
            ${leftIcon ? 'pl-10' : ''}
            ${error 
              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/10' 
              : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white'
            }
            ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-rose-600 font-medium">{error}</span>
      )}
      {!error && helperText && (
        <span className="text-xs text-slate-400">{helperText}</span>
      )}
    </div>
  );
};
