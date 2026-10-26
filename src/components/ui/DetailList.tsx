import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

export interface DetailListItem {
  label: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  key?: string | number;
  reversed?: boolean;
}

export interface DetailListProps extends React.HTMLAttributes<HTMLDListElement> {
  items?: DetailListItem[];
  children?: React.ReactNode;
  className?: string;
  dense?: boolean;
  columns?: 1 | 2 | 3;
  paddingYRem?: number;
  reversed?: boolean;
}

export interface DetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  dense?: boolean;
  paddingYRem?: number;
  reversed?: boolean;
}

export interface BalanceResult {
  paddingFactor: number;
  rowPaddingYRem: number;
  remainingBottomSpacePx: number;
  appliedExtraPx: number;
}

/**
 * Pure calculation to distribute extra height evenly across rows up to 1.5x standard padding.
 * Any remaining space stays as bottom padding inside the card.
 */
export function calculateBalancedPadding(
  extraHeightPx: number,
  rowCount: number,
  standardPaddingRem = 0.75,
  remInPx = 16
): BalanceResult {
  if (extraHeightPx <= 0 || rowCount <= 0) {
    return {
      paddingFactor: 1.0,
      rowPaddingYRem: standardPaddingRem,
      remainingBottomSpacePx: 0,
      appliedExtraPx: 0,
    };
  }

  const maxFactor = 1.5;
  const maxPaddingRem = standardPaddingRem * maxFactor; // 1.125rem
  const maxExtraPaddingPerEdgeRem = maxPaddingRem - standardPaddingRem; // 0.375rem
  const maxExtraPaddingPerRowPx = maxExtraPaddingPerEdgeRem * 2 * remInPx; // 12px

  const extraPerRowPx = extraHeightPx / rowCount;
  const appliedExtraPerRowPx = Math.min(extraPerRowPx, maxExtraPaddingPerRowPx);

  const appliedExtraPerEdgeRem = appliedExtraPerRowPx / (2 * remInPx);
  const rowPaddingYRem = standardPaddingRem + appliedExtraPerEdgeRem;
  const paddingFactor = rowPaddingYRem / standardPaddingRem;

  const totalAbsorbedPx = appliedExtraPerRowPx * rowCount;
  const remainingBottomSpacePx = Math.max(0, extraHeightPx - totalAbsorbedPx);

  return {
    paddingFactor: Number(paddingFactor.toFixed(3)),
    rowPaddingYRem: Number(rowPaddingYRem.toFixed(3)),
    remainingBottomSpacePx: Math.round(remainingBottomSpacePx),
    appliedExtraPx: Math.round(totalAbsorbedPx),
  };
}

interface DetailListContextValue {
  dense: boolean;
  paddingYRem?: number;
  columns?: 1 | 2 | 3;
  reversed?: boolean;
}

const DetailListContext = createContext<DetailListContextValue>({ dense: false, reversed: false });

export interface BalancedGridCardContextValue {
  paddingYRem?: number;
  bottomSpacePx?: number;
  paddingFactor?: number;
}

export const BalancedGridCardContext = createContext<BalancedGridCardContextValue>({});

export function useContainerWidth<T extends HTMLElement>(breakpointPx = 448) {
  const ref = useRef<T | null>(null);
  const [isWide, setIsWide] = useState<boolean>(true);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const update = (w: number) => {
      setWidth(w);
      setIsWide(w >= breakpointPx);
    };
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });
    ro.observe(ref.current);
    update(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [breakpointPx]);

  return [ref, isWide, setIsWide, width] as const;
}

export const DetailItem = React.memo<DetailItemProps>(({
  label,
  value,
  subtitle,
  children,
  className = '',
  dense: propDense,
  paddingYRem: propPaddingY,
  reversed: propReversed,
  style,
  ...props
}) => {
  const listContext = useContext(DetailListContext);
  const cardContext = useContext(BalancedGridCardContext);

  const isDense = propDense !== undefined ? propDense : listContext.dense;
  const activePaddingYRem =
    propPaddingY !== undefined
      ? propPaddingY
      : listContext.paddingYRem ?? cardContext.paddingYRem;

  const paddingStyle: React.CSSProperties = { ...style };
  if (activePaddingYRem !== undefined) {
    paddingStyle.paddingTop = `${activePaddingYRem}rem`;
    paddingStyle.paddingBottom = `${activePaddingYRem}rem`;
  }

  const paddingClass = isDense
    ? 'py-2 px-3 sm:px-4'
    : activePaddingYRem !== undefined
    ? 'px-3 sm:px-4'
    : 'py-[0.625rem] px-3 sm:px-4';

  const rawValue = value !== undefined ? value : children;
  const isEmpty =
    rawValue === undefined ||
    rawValue === null ||
    rawValue === '' ||
    (typeof rawValue === 'string' && rawValue.trim() === '');
  const valContent = isEmpty ? '—' : rawValue;

  const isThreeCol = listContext.columns === 3;

  const labelClass =
    'text-fs-body font-bold text-[var(--text)] text-left select-none break-words min-w-0';

  const valueClass = `text-fs-body font-semibold text-[var(--text-grey-strong)] ${
    isThreeCol ? 'text-right shrink-0' : 'text-left'
  } break-words min-w-0`;

  return (
    <div
      data-testid="detail-item"
      style={paddingStyle}
      className={`${
        isThreeCol
          ? 'flex items-baseline justify-between gap-2'
          : 'grid grid-cols-[8rem_1fr] sm:grid-cols-[10rem_1fr] items-baseline gap-3'
      } text-left flex-auto max-h-[4.5rem] ${paddingClass} ${className}`}
      {...props}
    >
      <dt className={labelClass}>
        {label}
      </dt>
      <dd
        className={valueClass}
      >
        <div>{valContent}</div>
        {subtitle && (
          <span className="block text-fs-body text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            {subtitle}
          </span>
        )}
      </dd>
    </div>
  );
});

DetailItem.displayName = 'DetailItem';

export const DetailList: React.FC<DetailListProps> = ({
  items,
  children,
  className = '',
  dense = false,
  columns = 1,
  paddingYRem,
  reversed = false,
  ...props
}) => {
  const [containerRef, isWide, , containerWidth] = useContainerWidth<HTMLDListElement>(448);
  const cardContext = useContext(BalancedGridCardContext);
  const effectivePaddingYRem = paddingYRem ?? cardContext.paddingYRem;

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (columns !== 3 || typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [columns]);

  // Single-column mode (default)
  if (columns === 1) {
    return (
      <DetailListContext.Provider value={{ dense, paddingYRem: effectivePaddingYRem, columns: 1, reversed }}>
        <dl
          ref={containerRef}
          className={`divide-y divide-slate-100 dark:divide-slate-800 text-left w-full detail-list-container flex-1 flex flex-col justify-start ${className}`}
          {...props}
        >
          {items
            ? items.map((item, idx) => (
                <DetailItem
                  key={item.key ?? idx}
                  label={item.label}
                  value={item.value}
                  subtitle={item.subtitle}
                  dense={dense}
                  reversed={item.reversed ?? reversed}
                />
              ))
            : children}
        </dl>
      </DetailListContext.Provider>
    );
  }

  // Two-column paired mode (columns={2})
  if (columns === 2) {
    const elements = items
      ? items.map((item, idx) => (
          <DetailItem
            key={item.key ?? idx}
            label={item.label}
            value={item.value}
            subtitle={item.subtitle}
            dense={dense}
            reversed={item.reversed ?? reversed}
          />
        ))
      : React.Children.toArray(children);

    const pairs: [React.ReactNode, React.ReactNode | null][] = [];
    for (let i = 0; i < elements.length; i += 2) {
      pairs.push([elements[i], elements[i + 1] || null]);
    }

    return (
      <DetailListContext.Provider value={{ dense, paddingYRem: effectivePaddingYRem, columns: 2, reversed }}>
        <dl
          ref={containerRef}
          data-testid="detail-list-two-col"
          className={`divide-y divide-slate-100 dark:divide-slate-800 text-left w-full detail-list-container flex-1 flex flex-col justify-start ${className}`}
          {...props}
        >
          {pairs.map(([first, second], pairIdx) => (
            <div
              key={pairIdx}
              data-testid="detail-pair-row"
              className={`detail-pair-row flex-auto max-h-[4.5rem] ${
                isWide
                  ? 'grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800'
                  : 'grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800'
              }`}
            >
              <div className="w-full min-w-0">{first}</div>
              {second ? (
                <div className="w-full min-w-0">{second}</div>
              ) : isWide ? (
                <div className="w-full min-w-0" />
              ) : null}
            </div>
          ))}
        </dl>
      </DetailListContext.Provider>
    );
  }

  // Three-column responsive mode (columns={3}): 3 columns from 64rem, 2 from 40rem, 1 below
  const elements = items
    ? items.map((item, idx) => (
        <DetailItem
          key={item.key ?? idx}
          label={item.label}
          value={item.value}
          subtitle={item.subtitle}
          dense={dense}
          reversed={item.reversed ?? reversed}
        />
      ))
    : React.Children.toArray(children);

  const remPx =
    typeof window !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
  const bp64Rem = 64 * remPx; // 1024px
  const bp40Rem = 40 * remPx; // 640px

  const effW = Math.max(containerWidth || 0, windowWidth);
  let activeCols: 1 | 2 | 3 = 1;
  if (effW >= bp64Rem) {
    activeCols = 3;
  } else if (effW >= bp40Rem) {
    activeCols = 2;
  } else {
    activeCols = 1;
  }

  const rows: (React.ReactNode | null)[][] = [];
  for (let i = 0; i < elements.length; i += activeCols) {
    const row: (React.ReactNode | null)[] = [];
    for (let c = 0; c < activeCols; c++) {
      row.push(elements[i + c] || null);
    }
    rows.push(row);
  }

  return (
    <DetailListContext.Provider value={{ dense, paddingYRem: effectivePaddingYRem, columns: 3, reversed }}>
      <dl
        ref={containerRef}
        data-testid="detail-list-three-col"
        className={`divide-y divide-slate-100 dark:divide-slate-800 text-left w-full detail-list-container flex-1 flex flex-col justify-start ${className}`}
        {...props}
      >
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            data-testid="detail-three-col-row"
            className={`detail-three-col-row flex-auto max-h-[4.5rem] grid ${
              activeCols === 3
                ? 'grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800'
                : activeCols === 2
                ? 'grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800'
                : 'grid-cols-1'
            }`}
          >
            {row.map((cell, cellIdx) => (
              <div key={cellIdx} className="w-full min-w-0">
                {cell ? cell : activeCols > 1 ? <div className="w-full min-w-0" /> : null}
              </div>
            ))}
          </div>
        ))}
      </dl>
    </DetailListContext.Provider>
  );
};

export interface DetailGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  balanced?: boolean;
}

export const DetailGrid: React.FC<DetailGridProps> = ({
  children,
  className = '',
  balanced = false,
  ...props
}) => {
  if (balanced) {
    const childrenArray = React.Children.toArray(children);
    return (
      <div
        data-testid="detail-grid-balanced"
        className={`grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_auto] items-stretch gap-6 w-full ${className}`}
        {...props}
      >
        {childrenArray.map((child, idx) => {
          if (!React.isValidElement(child)) return child;

          let posClass = '';
          if (idx === 0) {
            posClass = 'lg:row-span-2 lg:col-start-1 lg:row-start-1 flex flex-col h-full';
          } else if (idx === 1) {
            posClass = 'lg:col-start-2 lg:row-start-1 flex flex-col h-full';
          } else if (idx === 2) {
            posClass = 'lg:col-start-2 lg:row-start-2 flex flex-col h-full';
          }

          return (
            <BalancedGridCardContext.Provider key={idx} value={{}}>
              {React.cloneElement(child, {
                className: `${(child.props as any).className || ''} ${posClass}`,
              } as any)}
            </BalancedGridCardContext.Provider>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
