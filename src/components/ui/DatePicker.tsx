import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  error,
  className = '',
  required = false,
}) => {
  const autoId = React.useId();
  const pickerId = label && typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : 'datepicker-' + autoId;
  const errorId = pickerId + '-error';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const initialYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  const initialMonth = selectedDate ? selectedDate.getMonth() : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({ dateStr, dayNum: day, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const m = viewMonth + 1;
    const dateStr = `${viewYear}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ dateStr, dayNum: i, isCurrentMonth: true });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const m = viewMonth + 2 > 12 ? 1 : viewMonth + 2;
    const y = viewMonth + 2 > 12 ? viewYear + 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ dateStr, dayNum: i, isCurrentMonth: false });
  }

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const str = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(str);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const formatDisplay = (val: string) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Custom Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer text-left focus:outline-none focus:ring-0 focus:border-teal-500 ${
          error
            ? 'border-rose-300 dark:border-rose-800'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <span className={value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-2 shrink-0" />
      </button>

      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}

      {/* Custom Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-modal dark:shadow-none print:shadow-none border border-slate-200 dark:border-slate-800 p-3 z-50 animate-fadeIn">
          {/* Month / Year Navigation */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((item, idx) => {
              const isSelected = item.dateStr === value;
              const isToday =
                item.dateStr ===
                new Date().toISOString().slice(0, 10);

              const isDisabled =
                (minDate && item.dateStr < minDate) ||
                (maxDate && item.dateStr > maxDate);

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  disabled={Boolean(isDisabled)}
                  onClick={() => handleSelectDay(item.dateStr)}
                  className={`w-7 h-7 text-xs rounded-lg flex items-center justify-center font-medium cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white font-bold'
                      : item.isCurrentMonth
                      ? isToday
                        ? 'border border-teal-500 text-teal-600 dark:text-teal-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {item.dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick select Today */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface TimePickerProps {
  label?: string;
  value: string; // HH:MM
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  required?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  error,
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Standard clinic slots from 08:00 to 18:00
  const timeSlots: { value: string; label: string }[] = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let min of [0, 30]) {
      if (hour === 18 && min === 30) continue;
      const hStr = String(hour).padStart(2, '0');
      const mStr = String(min).padStart(2, '0');
      const timeVal = `${hStr}:${mStr}`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayLabel = `${String(displayHour).padStart(2, '0')}:${mStr} ${period}`;
      timeSlots.push({ value: timeVal, label: displayLabel });
    }
  }

  // Format current value display
  const formatTimeDisplay = (val: string) => {
    if (!val) return 'Select time';
    const match = timeSlots.find((s) => s.value === val);
    if (match) return match.label;
    const parts = val.split(':');
    if (parts.length >= 2) {
      const h = Number(parts[0]);
      const m = parts[1];
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${String(displayHour).padStart(2, '0')}:${m} ${period}`;
    }
    return val;
  };

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

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer text-left focus:outline-none focus:ring-0 focus:border-teal-500 ${
          error
            ? 'border-rose-300 dark:border-rose-800'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <span>{formatTimeDisplay(value)}</span>
        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-2 shrink-0" />
      </button>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-48 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-modal dark:shadow-none print:shadow-none border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn">
          {timeSlots.map((slot) => {
            const isSelected = slot.value === value;
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => {
                  onChange(slot.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{slot.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
