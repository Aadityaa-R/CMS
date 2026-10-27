import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  showItemRange?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = '',
  showItemRange = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Hide pagination bar entirely when there is only 1 page (or 0 items)
  if (totalPages <= 1) {
    return null;
  }

  // Generate page items to display (first, last, current with ... if overflowing)
  const getPageItems = (): (number | string)[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | string)[] = [];
    items.push(1);
    if (currentPage > 2) {
      items.push('...');
    }
    if (currentPage !== 1 && currentPage !== totalPages) {
      items.push(currentPage);
    }
    if (currentPage < totalPages - 1) {
      items.push('...');
    }
    items.push(totalPages);
    return items;
  };

  const pages = getPageItems();

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 select-none ${className}`}
    >
      <div className="text-xs text-slate-600 dark:text-slate-400">
        {showItemRange ? (
          <>
            Showing{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {start}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {end}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalItems}
            </span>
          </>
        ) : (
          <>
            Page{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {currentPage}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalPages}
            </span>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
              currentPage <= 1
                ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Numbered Page Buttons with ... */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="min-w-[28px] h-7 px-1 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center select-none"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium tabular-nums cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-teal-600 text-white font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-label={`Page ${p}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
              currentPage >= totalPages
                ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            aria-label="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
