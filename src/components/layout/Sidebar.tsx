import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { useSidebar } from '@/context/SidebarContext';
import { shouldCloseSidebarOnClick } from '@/lib/sidebarOutsideClick';
import { hasCapability, canViewBilling } from '@/lib/permissions';
import {
  LayoutDashboard,
  UserCheck,
  CreditCard,
  Pill,
  PanelLeftClose,
  PanelLeftOpen,
  Stethoscope,
  ShieldCheck,
  Clock,
  FileText,
  Calendar,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen: propIsOpen,
  onClose: propOnClose,
  isCollapsed: propIsCollapsed,
  onToggleCollapse: propOnToggleCollapse,
}) => {
  const sidebarContext = useSidebar();
  const isOpen = propIsOpen !== undefined ? propIsOpen : (propIsCollapsed !== undefined ? !propIsCollapsed : sidebarContext.isOpen);
  const close = propOnClose || sidebarContext.close;
  const toggle = propOnToggleCollapse || sidebarContext.toggle;

  const asideRef = useRef<HTMLElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  // Track mobile breakpoint (< 1024px) for inert and aria-hidden attributes
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
    const handleBreakpoint = () => {
      setIsMobile(mql ? !mql.matches : window.innerWidth < 1024);
    };
    handleBreakpoint();
    window.addEventListener('resize', handleBreakpoint);
    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleBreakpoint);
    }
    return () => {
      window.removeEventListener('resize', handleBreakpoint);
      if (mql && typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handleBreakpoint);
      }
    };
  }, []);

  // Bubbling click listener outside the sidebar with drag detection (M10.8b)
  useEffect(() => {
    if (!isOpen) return;

    let dragStartedInside = false;

    const handlePointerDown = (e: Event) => {
      const sidebar = asideRef.current;
      const target = e.target as HTMLElement | null;
      dragStartedInside = !!(sidebar && target && (sidebar === target || sidebar.contains(target)));
    };

    const handleClick = (e: MouseEvent) => {
      const shouldClose = shouldCloseSidebarOnClick({
        target: e.target,
        sidebarElement: asideRef.current,
        dragStartedInside,
      });
      dragStartedInside = false;

      if (shouldClose) {
        close();
        // Do NOT call preventDefault() or stopPropagation()!
        // In bubbling phase, the clicked element's onClick has already fired.
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('click', handleClick, false);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('click', handleClick, false);
    };
  }, [isOpen, close]);

  // Escape key closes the sidebar and returns focus directly to the toggle button
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        toggleButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  const { currentRole, currentUser } = useAuth();
  const { modules } = useClinic();

  const getNavItems = (): NavItem[] => {
    if (currentRole === 'patient') {
      return [
        { id: 'overview', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
        { id: 'records', label: 'Records', icon: <FileText className="w-4 h-4" /> },
        { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" /> },
        { id: 'billing', label: 'Invoices', icon: <CreditCard className="w-4 h-4" /> },
      ];
    }

    const items: NavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ];

    if (hasCapability(currentUser, 'consultationWorkstation', modules)) {
      items.push({ id: 'doctor', label: 'Consultation Desk', icon: <Stethoscope className="w-4 h-4" /> });
    }

    if (
      hasCapability(currentUser, 'patientRegistration', modules) ||
      hasCapability(currentUser, 'patientCheckIn', modules) ||
      hasCapability(currentUser, 'paymentRecording', modules)
    ) {
      items.push({ id: 'role_receptionist', label: 'Reception', icon: <UserCheck className="w-4 h-4" /> });
      items.push({ id: 'patient', label: 'Patient Records', icon: <FileText className="w-4 h-4" /> });
    }

    if (canViewBilling(currentUser, modules)) {
      items.push({ id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> });
    }

    if (hasCapability(currentUser, 'administrativeAccess', modules)) {
      items.push({ id: 'access_control', label: 'Administrative', icon: <ShieldCheck className="w-4 h-4" /> });
    }

    items.push({ id: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" /> });

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Phone/tablet dimmed overlay (captures touches outside drawer and prevents under-press) */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden cursor-pointer transition-opacity duration-300 ease-in-out motion-reduce:transition-none ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Two-Column Shell Sidebar container: static on desktop (3.5rem collapsed, 15rem expanded), drawer on mobile */}
      <aside
        id="sidebar-navigation"
        ref={asideRef}
        aria-label="Sidebar Navigation"
        inert={!isOpen && isMobile ? '' : undefined}
        aria-hidden={!isOpen && isMobile ? 'true' : undefined}
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 flex flex-col overflow-hidden shrink-0 select-none h-full border-r border-[#eef0f3] dark:border-slate-800 transition-all duration-300 ease-in-out motion-reduce:transition-none will-change-[width,transform] ${
          isOpen
            ? 'w-[15rem] lg:w-[15rem] translate-x-0 shadow-2xl lg:shadow-none'
            : 'w-[15rem] -translate-x-full lg:translate-x-0 lg:w-[3.5rem]'
        }`}
      >
        {/* Brand / Role header & Single Console Toggle Control */}
        <div className="h-[var(--nav-cell)] px-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center min-w-0 flex-1">
            {/* Sidebar Toggle Button with 44px minimum touch target */}
            <button
              ref={toggleButtonRef}
              type="button"
              data-sidebar-ignore-outside="true"
              onClick={toggle}
              className={`w-[var(--nav-cell)] h-[var(--nav-cell)] flex items-center justify-center rounded-lg cursor-pointer shrink-0 outline-none focus:outline-none focus:ring-0 transition-colors duration-200 ${
                isOpen
                  ? 'text-teal-600 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={isOpen}
              aria-controls="sidebar-navigation"
            >
              {isOpen ? (
                <PanelLeftClose className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              )}
            </button>

            {/* Clinic Portal Brand Details */}
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                isOpen ? 'max-w-[170px] opacity-100 ml-2.5' : 'lg:max-w-0 lg:opacity-0 lg:ml-0 max-w-[170px] opacity-100 ml-2.5'
              }`}
            >
              <div className="text-xs font-bold text-teal-600 dark:text-teal-400 tracking-wide uppercase">
                Clinic Operations
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize truncate mt-0.5">
                {currentRole === 'md' || currentRole === 'admin'
                  ? 'MD'
                  : currentRole === 'doctor'
                  ? 'Doctor'
                  : currentRole.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Close button inside drawer on mobile (M10.8b) */}
          <button
            type="button"
            data-sidebar-ignore-outside="true"
            onClick={close}
            className="w-[var(--nav-cell)] h-[var(--nav-cell)] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 lg:hidden cursor-pointer outline-none focus:outline-none focus:ring-0 shrink-0 transition-colors duration-200"
            title="Close drawer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="flex-1 pt-1 pb-2 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'overview' && activeTab === 'appointments') ||
              (item.id === 'billing' && activeTab === 'invoices');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  close();
                }}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`${isOpen ? 'w-full px-2' : 'w-[var(--nav-cell)] justify-center'} h-[var(--nav-cell)] flex items-center rounded-lg text-xs font-medium cursor-pointer outline-none focus:outline-none focus:ring-0 transition-colors duration-200 ${
                  isActive
                    ? 'bg-transparent text-teal-600 dark:text-teal-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span
                  title={item.label}
                  aria-label={item.label}
                  className={`w-7 h-7 flex items-center justify-center shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  {item.icon}
                </span>
                <span
                  className={`overflow-hidden whitespace-nowrap truncate transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                    isOpen ? 'max-w-[170px] opacity-100 ml-2.5' : 'lg:max-w-0 lg:opacity-0 lg:ml-0 max-w-[170px] opacity-100 ml-2.5'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
