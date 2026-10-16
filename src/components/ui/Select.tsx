import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

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
  searchable = false,
  searchPlaceholder = 'Search options...',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (searchable) {
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, searchable]);

  // Click outside to close
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

  const handleSelect = (val: string) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        String(opt.value).toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : options;

  const triggerSizeClasses = {
    sm: 'py-1.5 px-2.5 text-xs rounded-md',
    md: 'py-2 px-3 text-xs sm:text-sm font-medium rounded-lg',
    lg: 'py-2.5 sm:py-3 px-3.5 sm:px-4 text-sm font-medium rounded-xl min-h-[44px]',
  };

  const optionItemSizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-xs sm:text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };

  const searchInputClasses = {
    sm: 'pl-7 pr-2 py-1 text-xs',
    md: 'pl-8 pr-2.5 py-1.5 text-xs sm:text-sm',
    lg: 'pl-9 pr-3 py-2 text-sm',
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

      {/* Custom Dropdown Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full relative flex items-center justify-between ${
          icon ? (size === 'lg' ? 'pl-11 pr-4' : 'pl-9 pr-3') : triggerSizeClasses[size]
        } border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors text-left shadow-xs focus:outline-none focus:ring-0 focus:border-teal-500 ${
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
          <span className={`absolute inset-y-0 left-0 ${size === 'lg' ? 'pl-3.5' : 'pl-3'} flex items-center pointer-events-none text-slate-400 dark:text-slate-500`}>
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
          className={`${size === 'lg' ? 'w-4 h-4' : 'w-4 h-4'} text-slate-400 dark:text-slate-500 ml-2 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      )}

      {/* Custom Options Popover with Optional Search Option */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 w-full ${
            size === 'lg' ? 'max-h-80' : 'max-h-64'
          } overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-fadeIn`}
        >
          {searchable && (
            <div className="px-2.5 pb-2 pt-1 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="relative">
                <Search className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute ${size === 'lg' ? 'left-3' : 'left-2.5'} top-1/2 -translate-y-1/2 pointer-events-none`} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredOptions.length > 0) {
                      e.preventDefault();
                      handleSelect(filteredOptions[0].value);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg ${searchInputClasses[size]} text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
              {searchQuery ? `No options matching "${searchQuery}"` : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value || '__empty__'}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between ${optionItemSizeClasses[size]} text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
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
