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
    sm: 'text-[0.6875rem]',
    md: 'text-xs',
  };

  const variantClasses = {
    success: 'text-teal-700 dark:text-teal-400 font-semibold',
    warning: 'text-amber-700 dark:text-amber-400 font-semibold',
    amber: 'text-amber-700 dark:text-amber-400 font-semibold',
    danger: 'text-rose-700 dark:text-rose-400 font-semibold',
    info: 'text-teal-700 dark:text-teal-400 font-semibold',
    neutral: 'text-slate-600 dark:text-slate-400 font-medium',
    teal: 'text-teal-700 dark:text-teal-400 font-semibold',
    purple: 'text-teal-700 dark:text-teal-400 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
