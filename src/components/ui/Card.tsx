import React from 'react';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-[var(--radius,0.5rem)] shadow-card dark:shadow-none print:shadow-none overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', action }) => {
  return (
    <div
      className={`p-6 pb-2 flex items-center justify-between ${className}`}
    >
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const cleanClassName = className.replace(/\btext-(xs|sm|base|lg|xl|2xl|3xl)\b/g, '').trim();
  return (
    <h3 className={`text-fs-title font-semibold text-slate-900 dark:text-slate-100 ${cleanClassName}`}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const cleanClassName = className.replace(/\btext-(xs|sm|base|lg|xl|2xl|3xl)\b/g, '').trim();
  return (
    <p className={`text-fs-label text-slate-500 dark:text-slate-400 mt-0.5 ${cleanClassName}`}>{children}</p>
  );
};

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export interface KpiCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  className = '',
  onClick,
  children,
}) => {
  return (
    <Card
      onClick={onClick}
      className={`p-5 flex flex-col justify-between min-h-0 h-auto ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex flex-col min-h-0 h-auto" style={{ gap: '0.25rem' }}>
        <span
          className="font-semibold text-fs-kpi-label leading-tight text-slate-900 dark:text-slate-100 truncate"
          style={{ fontSize: 'var(--fs-kpi-label)', fontWeight: 600 }}
        >
          {label}
        </span>
        <span
          className="font-bold tracking-tight text-slate-900 dark:text-slate-100 text-fs-kpi leading-none truncate"
          style={{ fontSize: 'var(--fs-kpi)', fontWeight: 700 }}
        >
          {value}
        </span>
      </div>
      {children}
    </Card>
  );
};
