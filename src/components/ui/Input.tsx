import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'label'> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            icon ? '!pl-11 pr-3.5' : 'px-3'
          } py-2 text-sm text-slate-900 placeholder-slate-500 shadow-sm focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${
            error
              ? 'border-rose-300 focus:border-rose-500'
              : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};
