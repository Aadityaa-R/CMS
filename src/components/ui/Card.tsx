import React from 'react';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-card dark:shadow-none print:shadow-none overflow-hidden ${className}`}
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
      className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between ${className}`}
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
  return <div className={`p-5 ${className}`}>{children}</div>;
};
