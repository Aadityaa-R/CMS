import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface SidebarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Starts collapsed on desktop and closed on phones on every app load (not remembered)
  const [isOpen, setIsOpenState] = useState<boolean>(false);

  const open = useCallback(() => setIsOpenState(true), []);
  const close = useCallback(() => setIsOpenState(false), []);
  const toggle = useCallback(() => setIsOpenState((prev) => !prev), []);
  const setIsOpen = useCallback((val: boolean) => setIsOpenState(val), []);

  // Crossing the 1024px breakpoint (resize, orientation, display scale) resets to closed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
    let wasAbove1024 = mql ? mql.matches : window.innerWidth >= 1024;

    const handleBreakpointChange = () => {
      const isAbove1024 = mql ? mql.matches : window.innerWidth >= 1024;
      if (isAbove1024 !== wasAbove1024) {
        wasAbove1024 = isAbove1024;
        setIsOpenState(false);
      }
    };

    window.addEventListener('resize', handleBreakpointChange);
    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleBreakpointChange);
    }

    return () => {
      window.removeEventListener('resize', handleBreakpointChange);
      if (mql && typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handleBreakpointChange);
      }
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ isOpen, open, close, toggle, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return safe fallback if rendered without provider
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      setIsOpen: () => {},
    };
  }
  return context;
};

