import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'label'> {
  label?: React.ReactNode;
  labelClassName?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>((
  {
    label,
    labelClassName = '',
    error,
    helperText,
    icon,
    rightElement,
    className = '',
    id,
    ...props
  },
  ref
) => {
  const autoId = React.useId();
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : `input-${autoId}`);
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-fs-label font-normal text-slate-700 dark:text-slate-300 mb-1.5 ${labelClassName}`}
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
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            icon ? '!pl-11' : 'pl-3'
          } ${rightElement ? '!pr-12' : 'pr-3'} py-2 h-[2.75rem] text-fs-body text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-0 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 ${
            error
              ? 'border-rose-300 focus:border-rose-500'
              : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1 z-10">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="mt-1 text-fs-label text-rose-600">{error}</p>}
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-fs-label text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
