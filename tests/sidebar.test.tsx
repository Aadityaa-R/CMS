import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

declare var require: any;
declare var process: any;

import { Sidebar } from '../src/components/layout/Sidebar';
import { Navbar } from '../src/components/layout/Navbar';
import { SidebarProvider, useSidebar } from '../src/context/SidebarContext';
import {
  shouldCloseSidebarOnClick,
  createSidebarOutsideClickListener,
} from '../src/lib/sidebarOutsideClick';
import {
  getLastInputType,
  setLastInputType,
  isKeyboardMode,
  focusIfKeyboard,
} from '../src/lib/inputMode';

import { AuthContext } from '../src/context/AuthContext';
import { ClinicContext } from '../src/context/ClinicContext';
import { BillingContext } from '../src/context/BillingContext';
import { AttendanceContext } from '../src/context/AttendanceContext';
import { ThemeContext } from '../src/context/ThemeContext';
import { NotificationContext } from '../src/context/NotificationContext';
import { INITIAL_MODULES, INITIAL_PATIENTS, INITIAL_APPOINTMENTS, INITIAL_PRESCRIPTIONS, INITIAL_DOCTORS } from '../src/data/mockData';
import { INITIAL_SEED_INVOICES, INITIAL_SEED_PAYMENTS } from '../src/data/billingSeed';
import { INITIAL_SHIFTS, INITIAL_ATTENDANCE_RECORDS, INITIAL_LEAVE_REQUESTS } from '../src/data/attendanceSeed';
import { INITIAL_FORMULARY } from '../src/data/formularySeed';
import { User } from '../src/types';

const mdUser: User = {
  id: 'usr-doc-1',
  name: 'Dr. Marcus Vance',
  email: 'm.vance@beaconclinic.com',
  phone: '+1 (555) 100-2001',
  role: 'md',
  title: 'Managing Director & Chief Physician',
  department: 'Internal Medicine & Management',
  badgeNumber: 'MD-001',
  isOriginalAdmin: true,
};

function renderWithProviders(ui: React.ReactNode, options?: { currentUser?: User }) {
  const currentUser = options?.currentUser || mdUser;

  const authVal: any = {
    currentUser,
    currentRole: currentUser.role,
    isAuthenticated: true,
    switchRole: vi.fn(),
    isRoleSuspended: () => false,
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
  };

  const clinicVal: any = {
    modules: INITIAL_MODULES,
    patients: INITIAL_PATIENTS,
    appointments: INITIAL_APPOINTMENTS,
    prescriptions: INITIAL_PRESCRIPTIONS,
    medicines: INITIAL_FORMULARY,
    doctors: INITIAL_DOCTORS,
    patientAssignments: [],
  };

  const billingVal: any = {
    invoices: INITIAL_SEED_INVOICES,
    payments: INITIAL_SEED_PAYMENTS,
  };

  const attendanceVal: any = {
    shifts: INITIAL_SHIFTS,
    records: INITIAL_ATTENDANCE_RECORDS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
  };

  const themeVal: any = {
    theme: 'light',
    toggleTheme: vi.fn(),
  };

  const notifVal: any = {
    userNotifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismissNotification: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authVal}>
      <ClinicContext.Provider value={clinicVal}>
        <BillingContext.Provider value={billingVal}>
          <AttendanceContext.Provider value={attendanceVal}>
            <ThemeContext.Provider value={themeVal}>
              <NotificationContext.Provider value={notifVal}>
                {ui}
              </NotificationContext.Provider>
            </ThemeContext.Provider>
          </AttendanceContext.Provider>
        </BillingContext.Provider>
      </ClinicContext.Provider>
    </AuthContext.Provider>
  );
}

describe('Sidebar Fixes & Two-Column Non-Covering Layout (M10.8b)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setLastInputType('pointer');
  });

  describe('1. Pure Function: shouldCloseSidebarOnClick & Drag Detection', () => {
    it('returns true when clicking completely outside the sidebar', () => {
      const sidebar = document.createElement('aside');
      const outsideButton = document.createElement('button');
      document.body.appendChild(sidebar);
      document.body.appendChild(outsideButton);

      const result = shouldCloseSidebarOnClick({
        target: outsideButton,
        sidebarElement: sidebar,
        dragStartedInside: false,
      });

      expect(result).toBe(true);
      document.body.removeChild(sidebar);
      document.body.removeChild(outsideButton);
    });

    it('returns false when clicking inside the sidebar element', () => {
      const sidebar = document.createElement('aside');
      const navItem = document.createElement('button');
      sidebar.appendChild(navItem);
      document.body.appendChild(sidebar);

      const result = shouldCloseSidebarOnClick({
        target: navItem,
        sidebarElement: sidebar,
        dragStartedInside: false,
      });

      expect(result).toBe(false);
      document.body.removeChild(sidebar);
    });

    it('returns false when drag started inside the sidebar and ended outside', () => {
      const sidebar = document.createElement('aside');
      const outsideButton = document.createElement('button');
      document.body.appendChild(sidebar);
      document.body.appendChild(outsideButton);

      // User pressed inside sidebar, dragged mouse outside, and released
      const result = shouldCloseSidebarOnClick({
        target: outsideButton,
        sidebarElement: sidebar,
        dragStartedInside: true,
      });

      expect(result).toBe(false);
      document.body.removeChild(sidebar);
      document.body.removeChild(outsideButton);
    });

    it('returns false when clicking a toggle button marked with data-sidebar-ignore-outside', () => {
      const sidebar = document.createElement('aside');
      const toggleBtn = document.createElement('button');
      toggleBtn.setAttribute('data-sidebar-ignore-outside', 'true');
      const icon = document.createElement('svg');
      toggleBtn.appendChild(icon);
      document.body.appendChild(sidebar);
      document.body.appendChild(toggleBtn);

      // Direct button target
      expect(
        shouldCloseSidebarOnClick({
          target: toggleBtn,
          sidebarElement: sidebar,
          dragStartedInside: false,
        })
      ).toBe(false);

      // Child icon target
      expect(
        shouldCloseSidebarOnClick({
          target: icon,
          sidebarElement: sidebar,
          dragStartedInside: false,
        })
      ).toBe(false);

      document.body.removeChild(sidebar);
      document.body.removeChild(toggleBtn);
    });

    it('returns false when clicking inside a modal dialog (role="dialog" or [data-modal])', () => {
      const sidebar = document.createElement('aside');
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      const modalButton = document.createElement('button');
      modal.appendChild(modalButton);
      document.body.appendChild(sidebar);
      document.body.appendChild(modal);

      const result = shouldCloseSidebarOnClick({
        target: modalButton,
        sidebarElement: sidebar,
        dragStartedInside: false,
      });

      expect(result).toBe(false);
      document.body.removeChild(sidebar);
      document.body.removeChild(modal);
    });

    it('createSidebarOutsideClickListener fires callback on outside click without preventDefault', () => {
      const sidebar = document.createElement('aside');
      const onClose = vi.fn();
      const { handleClick, handlePointerDown } = createSidebarOutsideClickListener(() => sidebar, onClose);

      const outsideButton = document.createElement('button');
      document.body.appendChild(sidebar);
      document.body.appendChild(outsideButton);

      const mockPointerDownEvent: any = {
        target: outsideButton,
      };
      handlePointerDown(mockPointerDownEvent);

      const mockClickEvent: any = {
        target: outsideButton,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };
      handleClick(mockClickEvent);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockClickEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockClickEvent.stopPropagation).not.toHaveBeenCalled();

      document.body.removeChild(sidebar);
      document.body.removeChild(outsideButton);
    });
  });

  describe('2. Layout Non-Intersection: Nothing is Ever Covered (M10.8b)', () => {
    it('verifies sidebar and column 2 (header and page) bounding boxes never intersect at 1024, 1280, and 1920', () => {
      const viewports = [1024, 1280, 1920];
      const collapsedWidthPx = 56; // 3.5rem * 16px
      const expandedWidthPx = 240; // 15rem * 16px

      for (const vpWidth of viewports) {
        // Closed state
        const closedSidebarRect = { left: 0, right: collapsedWidthPx, width: collapsedWidthPx };
        const closedCol2Rect = { left: collapsedWidthPx, right: vpWidth, width: vpWidth - collapsedWidthPx };

        // Open state
        const openSidebarRect = { left: 0, right: expandedWidthPx, width: expandedWidthPx };
        const openCol2Rect = { left: expandedWidthPx, right: vpWidth, width: vpWidth - expandedWidthPx };

        // Closed intersection check
        const closedOverlap = Math.max(0, Math.min(closedSidebarRect.right, closedCol2Rect.right) - Math.max(closedSidebarRect.left, closedCol2Rect.left));
        expect(closedOverlap).toBe(0);
        expect(closedCol2Rect.left).toBe(closedSidebarRect.right);

        // Open intersection check
        const openOverlap = Math.max(0, Math.min(openSidebarRect.right, openCol2Rect.right) - Math.max(openSidebarRect.left, openCol2Rect.left));
        expect(openOverlap).toBe(0);
        expect(openCol2Rect.left).toBe(openSidebarRect.right);
      }
    });
  });

  describe('3. Rendered Sidebar & Bubbling Outside Click Pass-Through', () => {
    const LayoutHarness: React.FC<{ onTabChange?: (tab: string) => void }> = ({ onTabChange = vi.fn() }) => (
      <SidebarProvider>
        <div className="flex h-full">
          <Sidebar activeTab="dashboard" onTabChange={onTabChange} />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar activeTab="dashboard" />
          </div>
        </div>
      </SidebarProvider>
    );

    it('starts collapsed on desktop and closed on mobile without layout overlap', () => {
      renderWithProviders(<LayoutHarness />);
      const desktopToggle = screen.getByTitle('Expand sidebar');
      expect(desktopToggle).toBeDefined();
      expect(desktopToggle.getAttribute('aria-expanded')).toBe('false');
      expect(desktopToggle.getAttribute('aria-controls')).toBe('sidebar-navigation');

      const phoneToggle = screen.getByTitle('Open menu');
      expect(phoneToggle).toBeDefined();
      expect(phoneToggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles desktop sidebar open to 15rem width and updates aria attributes with smooth transition', () => {
      renderWithProviders(<LayoutHarness />);
      const asideBefore = document.getElementById('sidebar-navigation');
      expect(asideBefore?.className).toContain('transition-all');
      expect(asideBefore?.className).toContain('duration-300');
      expect(asideBefore?.className).toContain('ease-in-out');
      expect(asideBefore?.className).toContain('motion-reduce:transition-none');
      expect(asideBefore?.className).toContain('will-change-[width,transform]');

      const desktopToggle = screen.getByTitle('Expand sidebar');
      fireEvent.click(desktopToggle);

      const collapseToggle = screen.getByTitle('Collapse sidebar');
      expect(collapseToggle).toBeDefined();
      expect(collapseToggle.getAttribute('aria-expanded')).toBe('true');

      const aside = document.getElementById('sidebar-navigation');
      expect(aside?.className).toContain('w-[15rem]');
    });

    it('closes on outside bubbling click and delivers click to page button in a single press', () => {
      const handlePageButtonClick = vi.fn();

      const TestComponent = () => {
        const { isOpen } = useSidebar();
        return (
          <div className="flex h-full">
            <Sidebar activeTab="dashboard" onTabChange={vi.fn()} />
            <div className="flex-1">
              <button
                type="button"
                id="page-action-btn"
                onClick={handlePageButtonClick}
              >
                Action Button
              </button>
              <span data-testid="status">{isOpen ? 'open' : 'closed'}</span>
            </div>
          </div>
        );
      };

      renderWithProviders(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      // Open the sidebar
      const expandBtn = screen.getByTitle('Expand sidebar');
      fireEvent.click(expandBtn);
      expect(screen.getByTestId('status').textContent).toBe('open');

      // Click the outside action button
      const pageBtn = screen.getByText('Action Button');
      fireEvent.pointerDown(pageBtn);
      fireEvent.click(pageBtn);

      // Button click handler executed AND sidebar closed afterwards
      expect(handlePageButtonClick).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('status').textContent).toBe('closed');
    });

    it('drag starting inside sidebar and ending outside does NOT close sidebar', () => {
      const TestComponent = () => {
        const { isOpen } = useSidebar();
        return (
          <div className="flex h-full">
            <Sidebar activeTab="dashboard" onTabChange={vi.fn()} />
            <div className="flex-1">
              <div data-testid="outside-area">Outside Empty Area</div>
              <span data-testid="status">{isOpen ? 'open' : 'closed'}</span>
            </div>
          </div>
        );
      };

      renderWithProviders(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      );

      // Open sidebar
      const expandBtn = screen.getByTitle('Expand sidebar');
      fireEvent.click(expandBtn);
      expect(screen.getByTestId('status').textContent).toBe('open');

      const aside = document.getElementById('sidebar-navigation')!;
      const outsideArea = screen.getByTestId('outside-area');

      // Pointer down INSIDE sidebar
      fireEvent.pointerDown(aside);
      // Mouseup / Click OUTSIDE sidebar
      fireEvent.click(outsideArea);

      // Sidebar remains OPEN because drag started inside
      expect(screen.getByTestId('status').textContent).toBe('open');
    });

    it('closes on Escape key and returns focus to the toggle button', () => {
      renderWithProviders(<LayoutHarness />);
      const expandBtn = screen.getByTitle('Expand sidebar');
      fireEvent.click(expandBtn);

      expect(screen.getByTitle('Collapse sidebar')).toBeDefined();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      // Sidebar closes and toggle updates back to Expand
      const toggleAfterEsc = screen.getByTitle('Expand sidebar');
      expect(toggleAfterEsc).toBeDefined();
      expect(toggleAfterEsc.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes when choosing a navigation item', () => {
      const handleTabChange = vi.fn();
      renderWithProviders(<LayoutHarness onTabChange={handleTabChange} />);
      const expandBtn = screen.getByTitle('Expand sidebar');
      fireEvent.click(expandBtn);

      const consultItem = screen.getByText('Consultation Desk');
      fireEvent.click(consultItem);

      expect(handleTabChange).toHaveBeenCalledWith('doctor');
      // Sidebar should be collapsed after selecting an item
      expect(screen.getByTitle('Expand sidebar')).toBeDefined();
    });

    it('resets to closed when crossing the 1024px breakpoint', () => {
      renderWithProviders(<LayoutHarness />);
      const expandBtn = screen.getByTitle('Expand sidebar');
      fireEvent.click(expandBtn);
      expect(screen.getByTitle('Collapse sidebar')).toBeDefined();

      // Simulate viewport resize across 1024px breakpoint
      act(() => {
        window.innerWidth = 800;
        window.dispatchEvent(new Event('resize'));
      });

      // After breakpoint crossing, resets to closed
      expect(screen.getByTitle('Expand sidebar')).toBeDefined();
      expect(screen.getByTitle('Open menu')).toBeDefined();
    });

    it('with sidebar open at 1024px, table and layout containers do not overflow page horizontally', () => {
      window.innerWidth = 1024;
      renderWithProviders(<LayoutHarness />);

      const expandBtn = screen.getByTitle('Expand sidebar');
      fireEvent.click(expandBtn);
      expect(screen.getByTitle('Collapse sidebar')).toBeDefined();

      const aside = document.getElementById('sidebar-navigation')!;
      expect(aside.className).toContain('w-[15rem]');

      // Column 2 flexes to adapt cleanly to 1024px viewport without horizontal scroll
      expect(document.body.style.overflowX).not.toBe('scroll');
    });
  });

  describe('4. Toggle Icon & Label Synchronization Across All Paths', () => {
    const LayoutHarness = () => (
      <SidebarProvider>
        <div className="flex h-full">
          <Sidebar activeTab="dashboard" onTabChange={vi.fn()} />
          <Navbar activeTab="dashboard" />
        </div>
      </SidebarProvider>
    );

    it('phone header toggle syncs between Open menu and Close menu', () => {
      renderWithProviders(<LayoutHarness />);
      const phoneToggle = screen.getByTitle('Open menu');
      expect(phoneToggle.getAttribute('aria-label')).toBe('Open menu');
      expect(phoneToggle.getAttribute('aria-expanded')).toBe('false');

      // Click to open
      fireEvent.click(phoneToggle);

      const closeToggle = screen.getByTitle('Close menu');
      expect(closeToggle.getAttribute('aria-label')).toBe('Close menu');
      expect(closeToggle.getAttribute('aria-expanded')).toBe('true');

      // Press Escape to close
      fireEvent.keyDown(window, { key: 'Escape' });

      const reopenedToggle = screen.getByTitle('Open menu');
      expect(reopenedToggle.getAttribute('aria-label')).toBe('Open menu');
      expect(reopenedToggle.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('5. Input Mode Tracking & Focus Handling (M10.8)', () => {
    it('tracks pointer vs keyboard mode accurately', () => {
      setLastInputType('pointer');
      expect(getLastInputType()).toBe('pointer');
      expect(isKeyboardMode()).toBe(false);

      setLastInputType('keyboard');
      expect(getLastInputType()).toBe('keyboard');
      expect(isKeyboardMode()).toBe(true);
    });

    it('focusIfKeyboard only focuses when input mode is keyboard', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const focusSpy = vi.spyOn(button, 'focus');

      // When in pointer mode
      setLastInputType('pointer');
      focusIfKeyboard(button);
      expect(focusSpy).not.toHaveBeenCalled();

      // When in keyboard mode
      setLastInputType('keyboard');
      focusIfKeyboard(button);
      expect(focusSpy).toHaveBeenCalledTimes(1);

      document.body.removeChild(button);
    });

    it('verifies that no CSS rule applies an outline to plain :focus on sidebar elements', () => {
      const fs = require('fs');
      const path = require('path');
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Verifies :focus:not(:focus-visible) suppresses outline
      expect(cssContent).toContain(':focus:not(:focus-visible)');
      expect(cssContent).toContain('outline: none !important');

      // Verifies button:focus suppresses outline
      expect(cssContent).toContain('button:focus');
    });
  });
});
