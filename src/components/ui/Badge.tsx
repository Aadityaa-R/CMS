import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'teal'
  | 'purple'
  | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantClasses = {
    success: 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60',
    warning: 'bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    amber: 'bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    info: 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    teal: 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60',
    purple: 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
