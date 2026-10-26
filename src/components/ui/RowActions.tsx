import React from 'react';

export interface RowActionItem {
  id?: string;
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'soft';
  disabled?: boolean;
  hidden?: boolean;
  ariaLabel?: string;
  title?: string;
  className?: string;
}

export interface RowActionsProps {
  actions?: RowActionItem[];
  subject?: string;
  statusId?: string;
  className?: string;
  children?: React.ReactNode;
}

export const RowActions: React.FC<RowActionsProps> = ({
  actions,
  subject,
  statusId,
  className = '',
  children,
}) => {
  const possibleActions = (actions || []).filter((a) => !a.disabled && !a.hidden);

  if (possibleActions.length === 0 && !children) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center md:flex-nowrap justify-end gap-8 w-full max-sm:justify-start whitespace-nowrap ${className}`}
      role="group"
      aria-label={subject ? `Actions for ${subject}` : 'Row actions'}
    >
      {possibleActions.map((action, idx) => {
        let accessibleName = action.ariaLabel;
        if (!accessibleName && subject) {
          if (action.label.toLowerCase().includes('for')) {
            accessibleName = `${action.label} ${subject}`;
          } else {
            accessibleName = `${action.label} for ${subject}`;
          }
        }

        const isDanger = action.variant === 'danger';

        return (
          <button
            key={action.id || `${action.label}-${idx}`}
            type="button"
            onClick={action.onClick}
            aria-label={accessibleName}
            aria-describedby={statusId}
            title={action.title}
            className={`inline-flex items-center justify-center font-medium bg-transparent border-none shadow-none p-0 min-h-[44px] text-xs cursor-pointer select-none whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-teal-600 focus-visible:outline-offset-[-2px] ${
              isDanger
                ? 'text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300'
                : 'text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300'
            } ${action.className || ''}`}
          >
            {action.label}
          </button>
        );
      })}
      {children}
    </div>
  );
};
