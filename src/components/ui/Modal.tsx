import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { focusIfKeyboard } from '@/lib/inputMode';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '80%' | 'screen80';
  minHeight?: string;
  fullScreenOnMobile?: boolean;
  overflowVisible?: boolean;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  minHeight,
  fullScreenOnMobile = false,
  overflowVisible = false,
  bodyClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      const mainContent = document.getElementById('main-content');
      const prevMainOverflow = mainContent ? mainContent.style.overflow : '';
      if (mainContent) {
        mainContent.style.overflow = 'hidden';
      }

      const timer = setTimeout(() => {
        if (modalRef.current) {
          // If focus is already inside modal (e.g. user focused or typed), do not steal it
          if (modalRef.current.contains(document.activeElement)) {
            return;
          }
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 30);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCloseRef.current();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusable = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );

          if (focusable.length === 0) {
            e.preventDefault();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        if (mainContent) {
          mainContent.style.overflow = prevMainOverflow;
        }
        window.removeEventListener('keydown', handleKeyDown);
        if (openerRef.current) {
          focusIfKeyboard(openerRef.current);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses: Record<string, string> = {
    sm: 'w-full max-w-sm',
    md: 'w-[92vw] sm:w-[80vw] max-w-[80vw]',
    lg: 'w-[92vw] sm:w-[80vw] max-w-[80vw]',
    xl: 'w-[92vw] sm:w-[80vw] max-w-[80vw]',
    '2xl': 'w-[92vw] sm:w-[80vw] max-w-[80vw]',
    '80%': 'w-[92vw] sm:w-[80vw] max-w-[80vw]',
    screen80: 'w-[92vw] sm:w-[80vw] max-w-[80vw]',
  };

  const defaultMinHeight = '';
  const effectiveMinHeight = minHeight !== undefined ? minHeight : defaultMinHeight;

  const containerPadding = fullScreenOnMobile ? 'p-0 sm:p-6' : 'p-4 sm:p-6';
  const dialogLayout = fullScreenOnMobile
    ? `w-full h-full sm:h-auto rounded-none sm:rounded-xl my-0 sm:my-8 max-h-screen sm:max-h-[90vh] ${effectiveMinHeight} flex flex-col`
    : `rounded-xl my-8 ${effectiveMinHeight} max-h-[88vh] flex flex-col`.trim();

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${containerPadding} overflow-y-auto modal-wrapper`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm modal-overlay modal-backdrop"
        onClick={() => onCloseRef.current()}
      />

      {/* Modal Dialog Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative ${dialogLayout} ${maxWidthClasses[maxWidth] || maxWidthClasses.md} bg-white dark:bg-slate-900 shadow-modal dark:shadow-none print:shadow-none border border-slate-200 dark:border-slate-800 ${
          overflowVisible ? 'overflow-visible' : 'overflow-hidden'
        } z-10 modal-panel`}
      >
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 modal-header ${
          overflowVisible ? 'rounded-t-xl' : ''
        }`}>
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-0 no-print"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`px-4 sm:px-6 py-4 sm:py-5 ${
            overflowVisible
              ? 'overflow-visible'
              : 'overflow-y-auto max-h-[75vh]'
          } text-slate-800 dark:text-slate-200 modal-body ${bodyClassName}`}
        >
          {children}
        </div>

        {footer && (
          <div className={`px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 modal-footer ${
            overflowVisible ? 'rounded-b-xl' : ''
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
