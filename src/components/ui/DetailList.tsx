import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

export interface DetailListItem {
  label: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  key?: string | number;
}

export interface DetailListProps extends React.HTMLAttributes<HTMLDListElement> {
  items?: DetailListItem[];
  children?: React.ReactNode;
  className?: string;
  dense?: boolean;
  columns?: 1 | 2;
  paddingYRem?: number;
}

export interface DetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  dense?: boolean;
  paddingYRem?: number;
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
}

const DetailListContext = createContext<DetailListContextValue>({ dense: false });

export interface BalancedGridCardContextValue {
  paddingYRem?: number;
  bottomSpacePx?: number;
  paddingFactor?: number;
}

export const BalancedGridCardContext = createContext<BalancedGridCardContextValue>({});

export function useContainerWidth<T extends HTMLElement>(breakpointPx = 448) {
  const ref = useRef<T | null>(null);
  const [isWide, setIsWide] = useState<boolean>(true);

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const update = (w: number) => {
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

  return [ref, isWide, setIsWide] as const;
}

export const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  subtitle,
  children,
  className = '',
  dense: propDense,
  paddingYRem: propPaddingY,
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
  if (!isDense && activePaddingYRem !== undefined) {
    paddingStyle.paddingTop = `${activePaddingYRem}rem`;
    paddingStyle.paddingBottom = `${activePaddingYRem}rem`;
  }

  const paddingClass = isDense
    ? 'py-2 px-3 sm:px-4'
    : activePaddingYRem !== undefined
    ? 'px-3 sm:px-4'
    : 'py-3 px-3 sm:px-4';

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
      style={paddingStyle}
      className={`grid grid-cols-[8rem_1fr] sm:grid-cols-[10rem_1fr] items-baseline gap-3 text-xs sm:text-sm text-left ${paddingClass} ${className}`}
      {...props}
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
  columns = 1,
  paddingYRem,
  ...props
}) => {
  const [containerRef, isWide] = useContainerWidth<HTMLDListElement>(448);
  const cardContext = useContext(BalancedGridCardContext);
  const effectivePaddingYRem = paddingYRem ?? cardContext.paddingYRem;

  // Single-column mode (default)
  if (columns === 1) {
    return (
      <DetailListContext.Provider value={{ dense, paddingYRem: effectivePaddingYRem }}>
        <dl
          ref={containerRef}
          className={`divide-y divide-slate-100 dark:divide-slate-800 text-left w-full detail-list-container ${className}`}
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
                />
              ))
            : children}
        </dl>
      </DetailListContext.Provider>
    );
  }

  // Two-column paired mode (columns={2})
  const elements = items
    ? items.map((item, idx) => (
        <DetailItem
          key={item.key ?? idx}
          label={item.label}
          value={item.value}
          subtitle={item.subtitle}
          dense={dense}
        />
      ))
    : React.Children.toArray(children);

  const pairs: [React.ReactNode, React.ReactNode | null][] = [];
  for (let i = 0; i < elements.length; i += 2) {
    pairs.push([elements[i], elements[i + 1] || null]);
  }

  return (
    <DetailListContext.Provider value={{ dense, paddingYRem: effectivePaddingYRem }}>
      <dl
        ref={containerRef}
        data-testid="detail-list-two-col"
        className={`divide-y divide-slate-100 dark:divide-slate-800 text-left w-full detail-list-container ${className}`}
        {...props}
      >
        {pairs.map(([first, second], pairIdx) => (
          <div
            key={pairIdx}
            data-testid="detail-pair-row"
            className={`detail-pair-row ${
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
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [balanceState, setBalanceState] = useState<{
    card1PaddingYRem?: number;
    card3PaddingYRem?: number;
    card1BottomSpacePx?: number;
    card3BottomSpacePx?: number;
    paddingFactor?: number;
  }>({});

  useEffect(() => {
    if (!balanced || !gridRef.current) return;

    const measureAndBalance = () => {
      if (!gridRef.current) return;
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setBalanceState({ paddingFactor: 1.0 });
        return;
      }

      const cards = Array.from(gridRef.current.children) as HTMLElement[];
      if (cards.length < 3) return;

      const card1 = cards[0]; // Left column (Personal Info)
      const card2 = cards[1]; // Right column top (Medical Profile)
      const card3 = cards[2]; // Right column bottom (Latest Vitals)

      const card1Rows =
        card1.querySelectorAll('div[data-testid="detail-item"], dl > div').length || 9;
      const card3Rows =
        card3.querySelectorAll('.detail-pair-row, div[data-testid="detail-item"]').length || 3;

      const h1 = card1.offsetHeight;
      const hRight = card2.offsetHeight + 24 + card3.offsetHeight; // 24px is gap-6 token

      if (hRight > h1) {
        const extra = hRight - h1;
        const res = calculateBalancedPadding(extra, card1Rows);
        setBalanceState({
          card1PaddingYRem: res.rowPaddingYRem,
          card1BottomSpacePx: res.remainingBottomSpacePx,
          paddingFactor: res.paddingFactor,
        });
      } else if (h1 > hRight) {
        const extra = h1 - hRight;
        const res = calculateBalancedPadding(extra, card3Rows);
        setBalanceState({
          card3PaddingYRem: res.rowPaddingYRem,
          card3BottomSpacePx: res.remainingBottomSpacePx,
          paddingFactor: res.paddingFactor,
        });
      } else {
        setBalanceState({ paddingFactor: 1.0 });
      }
    };

    measureAndBalance();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measureAndBalance());
      ro.observe(gridRef.current);
    }
    window.addEventListener('resize', measureAndBalance);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measureAndBalance);
    };
  }, [balanced]);

  if (balanced) {
    const childrenArray = React.Children.toArray(children);
    return (
      <div
        ref={gridRef}
        data-testid="detail-grid-balanced"
        className={`grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[auto_auto] items-stretch gap-6 w-full ${className}`}
        {...props}
      >
        {childrenArray.map((child, idx) => {
          if (!React.isValidElement(child)) return child;

          let posClass = '';
          let cardContextValue: BalancedGridCardContextValue = {};

          if (idx === 0) {
            posClass = 'lg:row-span-2 lg:col-start-1 lg:row-start-1 flex flex-col h-full';
            cardContextValue = {
              paddingYRem: balanceState.card1PaddingYRem,
              bottomSpacePx: balanceState.card1BottomSpacePx,
              paddingFactor: balanceState.paddingFactor,
            };
          } else if (idx === 1) {
            posClass = 'lg:col-start-2 lg:row-start-1 flex flex-col h-full';
            cardContextValue = {
              paddingFactor: balanceState.paddingFactor,
            };
          } else if (idx === 2) {
            posClass = 'lg:col-start-2 lg:row-start-2 flex flex-col h-full';
            cardContextValue = {
              paddingYRem: balanceState.card3PaddingYRem,
              bottomSpacePx: balanceState.card3BottomSpacePx,
              paddingFactor: balanceState.paddingFactor,
            };
          }

          return (
            <BalancedGridCardContext.Provider key={idx} value={cardContextValue}>
              {React.cloneElement(child, {
                className: `${(child.props as any).className || ''} ${posClass}`,
                ...(cardContextValue.paddingFactor
                  ? { 'data-padding-factor': cardContextValue.paddingFactor }
                  : {}),
              } as any)}
            </BalancedGridCardContext.Provider>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
