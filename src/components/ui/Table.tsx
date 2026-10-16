import React, { createContext, useContext } from 'react';

type StackBreakpoint = 'sm' | 'md' | 'lg';
type HideBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

interface TableContextValue {
  stackBelow?: StackBreakpoint;
}

const TableContext = createContext<TableContextValue>({});

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  stackBelow?: StackBreakpoint;
}

export const Table: React.FC<TableProps> = ({
  className = '',
  stackBelow,
  children,
  ...props
}) => {
  return (
    <TableContext.Provider value={{ stackBelow }}>
      <table className={`w-full text-left text-xs ${className}`} {...props}>
        {children}
      </table>
    </TableContext.Provider>
  );
};

const stackHeaderClasses: Record<StackBreakpoint, string> = {
  sm: 'hidden sm:table-header-group',
  md: 'hidden md:table-header-group',
  lg: 'hidden lg:table-header-group',
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const stackClass = stackBelow ? stackHeaderClasses[stackBelow] : '';
  return (
    <thead
      className={`bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap ${stackClass} ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

const stackBodyClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-row-group space-y-3 sm:space-y-0',
  md: 'block md:table-row-group space-y-3 md:space-y-0',
  lg: 'block lg:table-row-group space-y-3 lg:space-y-0',
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const stackClass = stackBelow ? stackBodyClasses[stackBelow] : '';
  return (
    <tbody
      className={`divide-y divide-slate-100 dark:divide-slate-800 ${stackClass} ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
};

const stackRowClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-row bg-white dark:bg-slate-900 border sm:border-0 border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-0 shadow-xs sm:shadow-none',
  md: 'block md:table-row bg-white dark:bg-slate-900 border md:border-0 border-slate-200 dark:border-slate-800 rounded-xl p-3.5 md:p-0 shadow-xs md:shadow-none',
  lg: 'block lg:table-row bg-white dark:bg-slate-900 border lg:border-0 border-slate-200 dark:border-slate-800 rounded-xl p-3.5 lg:p-0 shadow-xs lg:shadow-none',
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const stackClass = stackBelow ? stackRowClasses[stackBelow] : '';
  return (
    <tr className={`${stackClass} ${className}`} {...props}>
      {children}
    </tr>
  );
};

const hideBelowClasses: Record<HideBreakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  hideBelow?: HideBreakpoint;
}

export const TableHead: React.FC<TableHeadProps> = ({
  className = '',
  hideBelow,
  children,
  scope = 'col',
  ...props
}) => {
  const hideClass = hideBelow ? hideBelowClasses[hideBelow] : '';
  return (
    <th
      scope={scope}
      className={`px-4 py-3 align-middle ${hideClass} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  label?: React.ReactNode;
  hideBelow?: HideBreakpoint;
  fullWidthOnStack?: boolean;
}

const hideLabelClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
};

const stackCellClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-cell py-1.5 sm:py-3 px-1 sm:px-4',
  md: 'block md:table-cell py-1.5 md:py-3 px-1 md:px-4',
  lg: 'block lg:table-cell py-1.5 lg:py-3 px-1 lg:px-4',
};

const fullWidthStackClasses: Record<StackBreakpoint, string> = {
  sm: 'block w-full pt-2 sm:pt-3 border-t sm:border-t-0 sm:table-cell sm:w-auto',
  md: 'block w-full pt-2 md:pt-3 border-t md:border-t-0 md:table-cell md:w-auto',
  lg: 'block w-full pt-2 lg:pt-3 border-t lg:border-t-0 lg:table-cell lg:w-auto',
};

export const TableCell: React.FC<TableCellProps> = ({
  className = '',
  label,
  hideBelow,
  fullWidthOnStack = false,
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const hideClass = hideBelow ? hideBelowClasses[hideBelow] : '';
  const stackCellClass = stackBelow ? stackCellClasses[stackBelow] : '';

  if (stackBelow && fullWidthOnStack) {
    const fullStackClass = fullWidthStackClasses[stackBelow];
    return (
      <td
        className={`px-4 py-3 align-middle ${hideClass} ${fullStackClass} ${className}`}
        {...props}
      >
        {children}
      </td>
    );
  }

  if (stackBelow && label) {
    const hideLabelClass = hideLabelClasses[stackBelow];
    const breakpoint = stackBelow;
    const desktopDisplay = breakpoint === 'sm' ? 'sm:block' : breakpoint === 'lg' ? 'lg:block' : 'md:block';
    const isRightAligned = className.includes('text-right');
    const textAlignment = isRightAligned
      ? 'text-right'
      : breakpoint === 'sm'
      ? 'text-right sm:text-left'
      : breakpoint === 'lg'
      ? 'text-right lg:text-left'
      : 'text-right md:text-left';

    return (
      <td
        className={`px-4 py-3 align-middle ${hideClass} ${stackCellClass} ${className}`}
        {...props}
      >
        <div className={`flex items-center justify-between gap-2 ${desktopDisplay}`}>
          <span
            className={`${hideLabelClass} text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 select-none`}
          >
            {label}
          </span>
          <div className={`${textAlignment} flex-1`}>{children}</div>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`px-4 py-3 align-middle ${hideClass} ${stackCellClass} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

