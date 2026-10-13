import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: 'teal' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorScheme = 'teal',
}) => {
  const iconColorClasses = {
    teal: 'bg-teal-50 text-teal-600 border border-teal-100',
    blue: 'bg-sky-50 text-sky-600 border border-sky-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border border-rose-100',
    slate: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColorClasses[colorScheme]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
};
