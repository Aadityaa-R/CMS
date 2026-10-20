import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 3,
  ...props
}) => {
  const autoId = React.useId();
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : `textarea-${autoId}`);
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-teal-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 resize-y ${
          error
            ? 'border-rose-300 focus:border-rose-500'
            : 'border-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

