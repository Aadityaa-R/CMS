import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value?: string | number;
  options: SelectOption[];
  onChange?: (e: { target: { value: string } }) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
  error,
  helperText,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  required = false,
  id,
  icon,
  searchable = true,
  searchPlaceholder = 'Type to search...',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Determine what text to display in the input
  const displayValue = isSearching
    ? searchQuery
    : selectedOption && selectedOption.value !== ''
    ? selectedOption.label
    : '';

  // Click outside to close and reset active search state
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSearching(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsSearching(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
    setIsOpen(false);
  };

  const filteredOptions = searchable && isSearching && searchQuery.trim()
    ? options.filter((opt) => {
        const q = searchQuery.toLowerCase().trim();
        // Hide empty/dummy placeholder options when actively typing a search query
        if (!opt.value && opt.label.toLowerCase().includes('select ')) return false;
        return (
          opt.label.toLowerCase().includes(q) ||
          String(opt.value).toLowerCase().includes(q)
        );
      })
    : options;

  // Auto-highlight first option when typing or reset on open
  useEffect(() => {
    if (isSearching) {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    } else {
      const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : -1);
    }
  }, [searchQuery, isSearching, value, options]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const optionElements = listRef.current.querySelectorAll('[data-option-index]');
      const activeEl = optionElements[highlightedIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const triggerSizeClasses = {
    sm: 'py-1.5 text-xs rounded-xl min-h-[36px]',
    md: 'py-2 text-xs sm:text-sm font-medium rounded-xl min-h-[38px]',
    lg: 'py-2.5 sm:py-3 text-sm font-medium rounded-xl min-h-[44px]',
  };

  const triggerPaddingClasses = {
    sm: icon ? 'pl-8 pr-8' : 'px-3 pr-8',
    md: icon ? 'pl-9 pr-9' : 'px-3.5 pr-9',
    lg: icon ? 'pl-11 pr-10' : 'px-4 pr-10',
  };

  const optionItemSizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-xs sm:text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className={`block font-medium text-slate-700 dark:text-slate-300 mb-1.5 ${
            size === 'lg' ? 'text-sm font-semibold' : 'text-xs'
          }`}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Dropdown Trigger: Combobox Input when searchable, or Button Trigger when non-searchable */}
      {searchable ? (
        <div className="relative w-full">
          {icon && (
            <span
              className={`absolute inset-y-0 left-0 ${
                size === 'lg' ? 'pl-3.5' : 'pl-3'
              } flex items-center pointer-events-none text-slate-400 dark:text-slate-500 z-10`}
            >
              {icon}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            id={id}
            disabled={disabled}
            value={displayValue}
            placeholder={placeholder || searchPlaceholder}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.select(), 10);
              }
            }}
            onClick={() => {
              if (!disabled && !isOpen) {
                setIsOpen(true);
              }
            }}
            onChange={(e) => {
              setIsSearching(true);
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setIsSearching(false);
                setSearchQuery('');
                setHighlightedIndex(-1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                } else if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  );
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isOpen) {
                  setIsOpen(true);
                } else if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  );
                }
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (isOpen && filteredOptions.length > 0) {
                  const targetIdx =
                    highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
                      ? highlightedIndex
                      : filteredOptions[0].value === '' && filteredOptions.length > 1
                      ? 1
                      : 0;
                  handleSelect(filteredOptions[targetIdx].value);
                }
              } else if (e.key === 'Tab') {
                if (isOpen) {
                  setIsOpen(false);
                  setIsSearching(false);
                  setSearchQuery('');
                  setHighlightedIndex(-1);
                }
              }
            }}
            autoComplete="off"
            className={`w-full ${triggerSizeClasses[size]} ${
              isSearching && searchQuery ? 'pr-14' : triggerPaddingClasses[size]
            } ${icon ? (size === 'lg' ? 'pl-11' : size === 'sm' ? 'pl-8' : 'pl-9') : (size === 'lg' ? 'pl-4' : 'pl-3.5')} border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors text-left shadow-xs focus:outline-none focus:ring-0 focus:border-teal-500 ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
                : 'cursor-text'
            } ${
              error
                ? 'border-rose-300 dark:border-rose-800'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          />
          {isSearching && searchQuery && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-8 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                  setIsSearching(false);
                  setSearchQuery('');
                  setHighlightedIndex(-1);
                } else {
                  setIsOpen(true);
                  inputRef.current?.focus();
                }
              }
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronDown
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
            />
          </button>
        </div>
      ) : (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full relative flex items-center justify-between ${triggerSizeClasses[size]} ${triggerPaddingClasses[size]} border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors text-left shadow-xs focus:outline-none focus:ring-0 focus:border-teal-500 ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
              : 'cursor-pointer'
          } ${
            error
              ? 'border-rose-300 dark:border-rose-800'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          {icon && (
            <span
              className={`absolute inset-y-0 left-0 ${
                size === 'lg' ? 'pl-3.5' : 'pl-3'
              } flex items-center pointer-events-none text-slate-400 dark:text-slate-500`}
            >
              {icon}
            </span>
          )}
          <span
            className={`truncate ${
              selectedOption && selectedOption.value !== ''
                ? 'text-slate-900 dark:text-slate-100 font-medium'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-2 shrink-0 transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      )}

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}

      {/* Custom Options Popover */}
      {isOpen && (
        <div
          ref={listRef}
          className={`absolute left-0 mt-1.5 w-full ${
            size === 'lg' ? 'max-h-80' : 'max-h-64'
          } overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fadeIn`}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
              {searchQuery ? `No options matching "${searchQuery}"` : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.value || `__empty_${idx}__`}
                  type="button"
                  data-option-index={idx}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between ${optionItemSizeClasses[size]} text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

