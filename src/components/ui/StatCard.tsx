import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: 'teal' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend,
  colorScheme = 'teal',
}) => {
  const iconColorClasses = {
    teal: 'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    blue: 'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    purple: 'bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    amber: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    rose: 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          {title}
        </span>
        {icon ? (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColorClasses[colorScheme]}`}>
            {icon}
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>
      {icon && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </span>
          {trend && (
            <span
              className={`text-xs font-semibold ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}
            </span>
          )}
        </div>
      )}
      {subtitle && (
        <p className={`${icon ? 'mt-1' : 'mt-2'} text-xs text-slate-500 dark:text-slate-400`}>{subtitle}</p>
      )}
    </div>
  );
};

