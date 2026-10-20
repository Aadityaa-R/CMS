import React, { createContext, useContext } from 'react';

export type StackBreakpoint = 'sm' | 'md' | 'lg';
export type HideBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

export interface ColumnDef<T = any> {
  key: string;
  header: React.ReactNode;
  label?: string;
  hideBelow?: HideBreakpoint;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  isPrimary?: boolean;
  isActions?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

interface TableContextValue {
  stackBelow: StackBreakpoint;
}

const TableContext = createContext<TableContextValue>({ stackBelow: 'md' });

export interface TableProps<T = any> extends React.TableHTMLAttributes<HTMLTableElement> {
  stackBelow?: StackBreakpoint;
  columns?: ColumnDef<T>[];
  data?: T[];
  keyExtractor?: (item: T, index: number) => string | number;
}

export const Table = <T = any,>({
  className = '',
  stackBelow = 'md',
  columns,
  data,
  keyExtractor,
  children,
  ...props
}: TableProps<T>): React.ReactElement => {
  if (columns && data) {
    return (
      <TableContext.Provider value={{ stackBelow }}>
        <table className={`w-full text-left text-xs ${className}`} {...props}>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  hideBelow={col.hideBelow}
                  className={`${col.headerClassName || ''} ${
                    col.align === 'right' ? 'text-right' : ''
                  } ${
                    col.isActions
                      ? 'sticky right-0 bg-slate-50 dark:bg-slate-800 z-10'
                      : ''
                  }`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, rowIdx) => (
              <TableRow key={keyExtractor ? keyExtractor(item, rowIdx) : rowIdx}>
                {columns.map((col) => {
                  const content = col.render ? col.render(item, rowIdx) : (item as any)[col.key];
                  const colLabel = col.label || (typeof col.header === 'string' ? col.header : undefined);
                  return (
                    <TableCell
                      key={col.key}
                      hideBelow={col.hideBelow}
                      label={colLabel}
                      isPrimary={col.isPrimary}
                      isActions={col.isActions}
                      className={`${col.className || ''} ${
                        col.align === 'right' ? 'text-right' : ''
                      } ${
                        col.isActions
                          ? 'sticky right-0 bg-white dark:bg-slate-900 z-10'
                          : ''
                      }`}
                    >
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </TableContext.Provider>
    );
  }

  return (
    <TableContext.Provider value={{ stackBelow }}>
      <table className={`w-full text-left text-xs ${className}`} {...props}>
        {children}
      </table>
    </TableContext.Provider>
  );
};

export const DataTable = Table;

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
  sm: 'block sm:table-row-group',
  md: 'block md:table-row-group',
  lg: 'block lg:table-row-group',
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
  sm: 'block sm:table-row bg-white dark:bg-slate-900 py-3.5 px-3 sm:p-0 border-b border-slate-100 dark:border-slate-800 last:border-b-0 space-y-2 sm:space-y-0',
  md: 'block md:table-row bg-white dark:bg-slate-900 py-3.5 px-3 md:p-0 border-b border-slate-100 dark:border-slate-800 last:border-b-0 space-y-2 md:space-y-0',
  lg: 'block lg:table-row bg-white dark:bg-slate-900 py-3.5 px-3 lg:p-0 border-b border-slate-100 dark:border-slate-800 last:border-b-0 space-y-2 lg:space-y-0',
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

export const HIDE_BELOW_CLASSES = hideBelowClasses;

const stickyActionsHeadClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:sticky sm:right-0 sm:bg-slate-50 sm:dark:bg-slate-800 sm:z-10',
  md: 'md:sticky md:right-0 md:bg-slate-50 md:dark:bg-slate-800 md:z-10',
  lg: 'lg:sticky lg:right-0 lg:bg-slate-50 lg:dark:bg-slate-800 lg:z-10',
};

const stickyActionsCellClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:sticky sm:right-0 sm:bg-white sm:dark:bg-slate-900 sm:z-10',
  md: 'md:sticky md:right-0 md:bg-white md:dark:bg-slate-900 md:z-10',
  lg: 'lg:sticky lg:right-0 lg:bg-white lg:dark:bg-slate-900 lg:z-10',
};

const stackButtonMinHeight: Record<StackBreakpoint, string> = {
  sm: 'max-sm:[&_button]:min-h-[44px] max-sm:[&_button]:h-auto max-sm:[&_button]:py-2.5',
  md: 'max-md:[&_button]:min-h-[44px] max-md:[&_button]:h-auto max-md:[&_button]:py-2.5',
  lg: 'max-lg:[&_button]:min-h-[44px] max-lg:[&_button]:h-auto max-lg:[&_button]:py-2.5',
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  hideBelow?: HideBreakpoint;
  isActions?: boolean;
}

export const TableHead: React.FC<TableHeadProps> = ({
  className = '',
  hideBelow,
  isActions = false,
  children,
  scope = 'col',
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const hideClass = hideBelow ? hideBelowClasses[hideBelow] : '';
  const stickyClass = isActions && stackBelow ? stickyActionsHeadClasses[stackBelow] : isActions ? 'sticky right-0 bg-slate-50 dark:bg-slate-800 z-10' : '';
  return (
    <th
      scope={scope}
      className={`px-4 py-3 align-middle ${hideClass} ${stickyClass} ${className}`}
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
  isPrimary?: boolean;
  isActions?: boolean;
}

const hideLabelClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
};

const stackCellClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-cell py-1 sm:py-3 px-0 sm:px-4',
  md: 'block md:table-cell py-1 md:py-3 px-0 md:px-4',
  lg: 'block lg:table-cell py-1 lg:py-3 px-0 lg:px-4',
};

const fullWidthStackClasses: Record<StackBreakpoint, string> = {
  sm: 'block w-full pt-2 sm:pt-0 border-t sm:border-t-0 sm:table-cell sm:w-auto',
  md: 'block w-full pt-2 md:pt-0 border-t md:border-t-0 md:table-cell md:w-auto',
  lg: 'block w-full pt-2 lg:pt-0 border-t lg:border-t-0 lg:table-cell lg:w-auto',
};

export const TableCell: React.FC<TableCellProps> = ({
  className = '',
  label,
  hideBelow,
  fullWidthOnStack = false,
  isPrimary = false,
  isActions = false,
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const hideClass = hideBelow ? hideBelowClasses[hideBelow] : '';
  const stackCellClass = stackBelow ? stackCellClasses[stackBelow] : '';
  const stickyClass = isActions && stackBelow ? stickyActionsCellClasses[stackBelow] : isActions ? 'sticky right-0 bg-white dark:bg-slate-900 z-10' : '';

  // 1. Primary cell in stack mode: bold first line, no label
  if (stackBelow && isPrimary) {
    const desktopDisplay = stackBelow === 'sm' ? 'sm:block' : stackBelow === 'lg' ? 'lg:block' : 'md:block';
    return (
      <td
        className={`px-0 sm:px-4 py-1 sm:py-3 align-middle ${hideClass} ${stackCellClass} ${className}`}
        {...props}
      >
        <div className={`font-bold text-sm text-slate-900 dark:text-slate-100 ${desktopDisplay}`}>
          {children}
        </div>
      </td>
    );
  }

  // 2. Actions cell in stack mode: full width, wrapping row of buttons at least 44px high
  if (stackBelow && (isActions || fullWidthOnStack)) {
    const fullStackClass = fullWidthStackClasses[stackBelow];
    const buttonMinHeightClass = stackButtonMinHeight[stackBelow];
    const desktopDisplay = stackBelow === 'sm' ? 'sm:block' : stackBelow === 'lg' ? 'lg:block' : 'md:block';
    return (
      <td
        className={`px-0 sm:px-4 py-2 sm:py-3 align-middle ${hideClass} ${fullStackClass} ${stickyClass} ${className}`}
        {...props}
      >
        <div
          className={`flex flex-wrap items-center gap-2 w-full ${buttonMinHeightClass} ${desktopDisplay}`}
        >
          {children}
        </div>
      </td>
    );
  }

  // 3. Regular labeled row in stack mode: muted label on left, value left-aligned
  if (stackBelow && label) {
    const hideLabelClass = hideLabelClasses[stackBelow];
    const desktopDisplay = stackBelow === 'sm' ? 'sm:block' : stackBelow === 'lg' ? 'lg:block' : 'md:block';

    return (
      <td
        className={`px-0 sm:px-4 py-1 sm:py-3 align-middle ${hideClass} ${stackCellClass} ${className}`}
        {...props}
      >
        <div className={`flex items-start sm:items-center gap-2 sm:gap-3 text-left ${desktopDisplay}`}>
          <span
            className={`${hideLabelClass} text-xs text-slate-500 dark:text-slate-400 w-28 sm:w-36 shrink-0 text-left select-none`}
          >
            {label}
          </span>
          <div className="text-xs text-slate-800 dark:text-slate-200 text-left flex-1 break-words">
            {children}
          </div>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`px-0 sm:px-4 py-1 sm:py-3 align-middle ${hideClass} ${stackCellClass} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

export interface TableTruncateProps {
  children?: React.ReactNode;
  text?: string;
  className?: string;
  maxWidth?: string;
}

export const TableTruncate: React.FC<TableTruncateProps> = ({
  children,
  text,
  className = '',
  maxWidth = 'max-w-[140px] sm:max-w-[180px]',
}) => {
  const content = children ?? text;
  return (
    <span
      className={`table-cell-truncate truncate ${maxWidth} inline-block align-bottom ${className}`}
      title={typeof content === 'string' ? content : undefined}
    >
      {content}
    </span>
  );
};
