import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium outline-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:pointer-events-none rounded-lg cursor-pointer select-none';

  const sizeClasses = {
    xs: 'text-[11px] px-2 py-1 gap-1',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-teal-600 text-white hover:bg-teal-700 border border-transparent',
    secondary:
      'bg-slate-800 text-white hover:bg-slate-900 border border-transparent',
    outline:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 border border-transparent',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
    soft:
      'bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 border border-teal-200/60',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
};
