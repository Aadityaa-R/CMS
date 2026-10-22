import React, { useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  // Normalize and deduplicate suggestions
  const normalizedList = useMemo<{ label: string; keywords: string[] }[]>(() => {
    const seen = new Set<string>();
    const list: { label: string; keywords: string[] }[] = [];

    for (const item of suggestions) {
      const label = typeof item === 'string' ? item : item.label;
      if (label && label.trim()) {
        const clean = label.trim();
        const lower = clean.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          const keywords = [lower];
          if (typeof item !== 'string') {
            if (item.sublabel) keywords.push(item.sublabel.toLowerCase());
            if (item.category) keywords.push(item.category.toLowerCase());
            if (item.value && item.value !== item.label) keywords.push(item.value.toLowerCase());
          }
          list.push({ label: clean, keywords });
        }
      }
    }
    return list;
  }, [suggestions]);

  // Find best matching suggestion
  const matchedSuggestion = useMemo<string | null>(() => {
    const query = value.trim().toLowerCase();
    if (!query) return null;

    // 1. Priority match: label startsWith query
    const prefixMatch = normalizedList.find((item) =>
      item.label.toLowerCase().startsWith(query)
    );
    if (prefixMatch) return prefixMatch.label;

    // 2. Substring match: label includes query
    const substringMatch = normalizedList.find((item) =>
      item.label.toLowerCase().includes(query)
    );
    if (substringMatch) return substringMatch.label;

    // 3. Keyword match (sublabel, MRN, phone, code)
    const keywordMatch = normalizedList.find((item) =>
      item.keywords.some((kw) => kw.includes(query))
    );
    if (keywordMatch) return keywordMatch.label;

    return null;
  }, [normalizedList, value]);

  // Ghost completion suffix when label startsWith current input
  const completionSuffix = useMemo<string | null>(() => {
    if (!matchedSuggestion) return null;
    const query = value.toLowerCase();
    if (matchedSuggestion.toLowerCase().startsWith(query)) {
      return matchedSuggestion.slice(value.length);
    }
    return null;
  }, [matchedSuggestion, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      if (
        matchedSuggestion &&
        matchedSuggestion.toLowerCase() !== value.trim().toLowerCase()
      ) {
        e.preventDefault();
        onChange(matchedSuggestion);
      }
    } else if (e.key === 'Escape') {
      if (value) {
        e.preventDefault();
        handleClear();
      }
    }
  };

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (ghostRef.current) {
      ghostRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-20" />

        {/* Input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs leading-5 min-h-[38px] font-sans text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-teal-500"
        />

        {/* Inline Ghost Text Completion */}
        {completionSuffix && (
          <div
            ref={ghostRef}
            className="absolute inset-0 flex items-center pl-9 pr-8 py-2 text-xs leading-5 font-sans pointer-events-none select-none z-10 overflow-hidden whitespace-pre"
            aria-hidden="true"
          >
            <span className="opacity-0">{value}</span>
            <span className="text-slate-500/80 dark:text-slate-400 font-normal">
              {completionSuffix}
            </span>
          </div>
        )}

        {/* Clear Button */}
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer z-20"
            title="Clear search" aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
