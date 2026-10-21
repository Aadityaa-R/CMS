import React, { createContext, useContext } from 'react';

export interface DetailListItem {
  label: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  key?: string | number;
}

export interface DetailListProps {
  items?: DetailListItem[];
  children?: React.ReactNode;
  className?: string;
  dense?: boolean;
}

export interface DetailItemProps {
  label: React.ReactNode;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  dense?: boolean;
}

interface DetailListContextValue {
  dense: boolean;
}

const DetailListContext = createContext<DetailListContextValue>({ dense: false });

export const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  subtitle,
  children,
  className = '',
  dense: propDense,
}) => {
  const context = useContext(DetailListContext);
  const isDense = propDense !== undefined ? propDense : context.dense;
  const paddingClass = isDense ? 'py-2 px-3 sm:px-4' : 'py-3 px-3 sm:px-4';
  const rawValue = value !== undefined ? value : children;
  const isEmpty =
    rawValue === undefined ||
    rawValue === null ||
    rawValue === '' ||
    (typeof rawValue === 'string' && rawValue.trim() === '');
  const valContent = isEmpty ? '—' : rawValue;

  return (
    <div
      data-testid="detail-item"
      className={`grid grid-cols-[8rem_1fr] sm:grid-cols-[10rem_1fr] items-baseline gap-3 text-xs sm:text-sm text-left ${paddingClass} ${className}`}
    >
      <dt className="text-slate-500 dark:text-slate-400 font-normal text-left select-none break-words">
        {label}
      </dt>
      <dd className="text-slate-900 dark:text-slate-100 font-normal text-left break-words min-w-0">
        <div>{valContent}</div>
        {subtitle && (
          <span className="block text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            {subtitle}
          </span>
        )}
      </dd>
    </div>
  );
};

export const DetailList: React.FC<DetailListProps> = ({
  items,
  children,
  className = '',
  dense = false,
}) => {
  return (
    <DetailListContext.Provider value={{ dense }}>
      <dl
        className={`divide-y divide-slate-100 dark:divide-slate-800 text-left w-full ${className}`}
      >
        {items
          ? items.map((item, idx) => (
              <DetailItem
                key={item.key ?? idx}
                label={item.label}
                value={item.value}
                subtitle={item.subtitle}
                dense={dense}
              />
            ))
          : children}
      </dl>
    </DetailListContext.Provider>
  );
};

export interface DetailGridProps {
  children: React.ReactNode;
  className?: string;
}

export const DetailGrid: React.FC<DetailGridProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
