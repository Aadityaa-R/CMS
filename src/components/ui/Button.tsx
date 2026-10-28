import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'soft';
  size?: 'compact' | 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-[-2px] disabled:opacity-50 disabled:pointer-events-none rounded-lg cursor-pointer select-none';

  const sizeClasses = {
    compact: 'text-[0.875rem] px-3 py-0 h-8 !min-h-0 leading-none gap-1.5',
    xs: 'text-[0.6875rem] px-2 py-1 gap-1 min-h-[44px]',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[44px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[44px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[44px]',
  };

  const variantClasses = {
    primary:
      'bg-teal-600 text-white hover:bg-teal-700 border border-transparent shadow-sm',
    secondary:
      'bg-transparent text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 border-none shadow-none',
    outline:
      'bg-transparent text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 border-none shadow-none',
    danger:
      'bg-transparent text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border-none shadow-none',
    ghost:
      'bg-transparent text-slate-600 hover:text-slate-900 border-none shadow-none',
    soft:
      'bg-transparent text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 border-none shadow-none',
  };

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        !children && icon ? <span className="inline-flex shrink-0">{icon}</span> : null
      )}
      {children && <span>{children}</span>}
    </button>
  );
});

Button.displayName = 'Button';
