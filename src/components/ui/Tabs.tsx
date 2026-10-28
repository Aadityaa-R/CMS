import React, { useRef, useEffect } from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number | string;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: 'default' | 'sm';
  controls?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Navigation Tabs',
  className = '',
  size = 'default',
  controls,
}) => {
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const tablistRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll selected tab into view when activeTab changes
  useEffect(() => {
    if (activeTabRef.current && typeof activeTabRef.current.scrollIntoView === 'function') {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) return;
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex !== -1) {
      const nextTab = enabledTabs[nextIndex];
      onChange(nextTab.id);
      // Focus the newly active tab button
      const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (buttons) {
        const targetBtn = Array.from(buttons).find(
          (btn) => btn.getAttribute('data-tab-id') === nextTab.id
        );
        targetBtn?.focus();
      }
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      className={`tab-row flex items-end justify-between border-b border-slate-200 dark:border-slate-800 w-full shrink-0 ${className}`}
    >
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className="flex items-end gap-[0.25rem] overflow-x-auto overflow-y-hidden scrollbar-none no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap shrink-0"
      >
        {tabs.map((tab, idx) => {
          const isSelected = activeTab === tab.id;
          const isFirst = idx === 0;
          return (
            <button
              key={tab.id}
              ref={isSelected ? activeTabRef : null}
              type="button"
              role="tab"
              data-tab-id={tab.id}
              id={`tab-${tab.id}`}
              aria-controls={`tabpanel-${tab.id}`}
              aria-selected={isSelected}
              aria-current={isSelected ? 'page' : undefined}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => {
                if (!tab.disabled) {
                  onChange(tab.id);
                }
              }}
              style={isFirst ? { paddingInlineStart: 0 } : undefined}
              className={`relative inline-flex items-center whitespace-nowrap cursor-pointer transition-colors shrink-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 dark:focus-visible:outline-teal-400 focus-visible:-outline-offset-2 ${
                isFirst ? 'justify-start text-left pl-0 [padding-inline-start:0]' : 'justify-center'
              } pt-0 pb-[0.625rem] leading-[1.3] ${
                isSmall
                  ? isFirst
                    ? 'text-[0.9375rem] pr-2.5'
                    : 'text-[0.9375rem] px-2.5'
                  : isFirst
                  ? 'text-[1.0625rem] pr-[1.125rem]'
                  : 'text-[1.0625rem] px-[1.125rem]'
              } ${
                isSelected
                  ? 'font-bold text-[var(--text)] after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[0.1875rem] after:bg-teal-600 dark:after:bg-teal-400 after:rounded-full'
                  : 'font-medium text-[var(--text-muted)] hover:text-[var(--text)]'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {tab.label}
              {tab.count !== undefined ? ` (${tab.count})` : null}
              {tab.badge ? <span className="ml-1.5">{tab.badge}</span> : null}
            </button>
          );
        })}
      </div>
      {controls && (
        <div className="tab-row-controls flex items-center shrink-0 self-center my-auto">
          {controls}
        </div>
      )}
    </div>
  );
};
