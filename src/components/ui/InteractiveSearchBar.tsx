import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, CornerDownLeft, Sparkles } from 'lucide-react';

export interface SearchSuggestion {
  label: string;
  category?: string;
  sublabel?: string;
  value?: string;
}

export interface InteractiveSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: (string | SearchSuggestion)[];
  className?: string;
  disabled?: boolean;
  id?: string;
  autoFocus?: boolean;
}

export const InteractiveSearchBar: React.FC<InteractiveSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  suggestions = [],
  className = '',
  disabled = false,
  id,
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize and deduplicate suggestions
  const normalizedSuggestions = useMemo<SearchSuggestion[]>(() => {
    const seen = new Set<string>();
    const list: SearchSuggestion[] = [];

    for (const item of suggestions) {
      const obj: SearchSuggestion =
        typeof item === 'string'
          ? { label: item, value: item }
          : { ...item, value: item.value || item.label };

      const key = `${obj.label}::${obj.category || ''}`;
      if (!seen.has(key) && obj.label.trim()) {
        seen.add(key);
        list.push(obj);
      }
    }
    return list;
  }, [suggestions]);

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      // When empty, return top suggestions for quick autofill
      return normalizedSuggestions.slice(0, 8);
    }

    const matches = normalizedSuggestions.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(query);
      const matchSublabel = item.sublabel ? item.sublabel.toLowerCase().includes(query) : false;
      const matchCategory = item.category ? item.category.toLowerCase().includes(query) : false;
      return matchLabel || matchSublabel || matchCategory;
    });

    return matches.slice(0, 8);
  }, [normalizedSuggestions, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (item: SearchSuggestion) => {
    onChange(item.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Helper to highlight matching text in label
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="font-bold text-teal-600 dark:text-teal-400 bg-teal-50/70 dark:bg-teal-950/60 rounded px-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors shadow-xs"
        />

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Interactive Dropdown with Autofill Suggestions */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn max-h-72 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-500" />
                  {value.trim() ? 'Matching Autofill Results' : 'Quick Autofill Suggestions'}
                </span>
                <span className="font-normal lowercase text-[10px] text-slate-400">click to autofill</span>
              </div>

              {filteredSuggestions.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer transition-colors ${
                      isHighlighted
                        ? 'bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {renderHighlightedText(item.label, value)}
                        </span>
                        {item.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.sublabel && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {item.sublabel}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-slate-400 group-hover:text-teal-600">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">Autofill</span>
                      <CornerDownLeft className="w-3 h-3 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
              No matching suggestions found for &quot;{value}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
