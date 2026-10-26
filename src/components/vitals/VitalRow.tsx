import React from 'react';
import { Input } from '@/components/ui/Input';

export interface VitalRowProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  showError?: boolean;
  marker?: 'High' | 'Low' | null;
}

export const VitalRow = React.memo<VitalRowProps>(({
  id,
  label,
  value,
  placeholder,
  onChange,
  disabled,
  error,
  showError,
  marker,
}) => {
  return (
    <div className="py-[0.625rem] px-3 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <label
            htmlFor={id}
            className="text-xs sm:text-sm font-normal text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
          {marker && (
            <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs">
              {marker}
            </span>
          )}
        </div>
        <div className="w-[8rem] shrink-0">
          <Input
            id={id}
            inputMode="numeric"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-[8rem] text-sm py-1 font-medium text-right min-h-[44px] h-[2.75rem] ${
              showError && error ? '!border-rose-500 dark:!border-rose-500' : ''
            }`}
          />
        </div>
      </div>
      {showError && error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

VitalRow.displayName = 'VitalRow';

