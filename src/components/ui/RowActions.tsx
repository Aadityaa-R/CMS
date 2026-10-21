import React from 'react';
import { Button } from '@/components/ui/Button';

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
      className={`flex flex-wrap items-center justify-end gap-2 w-full max-sm:justify-start ${className}`}
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

        return (
          <Button
            key={action.id || `${action.label}-${idx}`}
            size="xs"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            aria-label={accessibleName}
            aria-describedby={statusId}
            title={action.title}
            className={`min-w-[6.5rem] min-h-[2rem] max-sm:min-h-[44px] pointer-coarse:min-h-[44px] whitespace-nowrap text-center justify-center ${
              action.className || ''
            }`}
          >
            {action.label}
          </Button>
        );
      })}
      {children}
    </div>
  );
};

