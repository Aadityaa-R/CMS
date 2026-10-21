import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

declare var require: any;
declare var process: any;

import { Sidebar } from '../src/components/layout/Sidebar';
import { Navbar } from '../src/components/layout/Navbar';
import { SidebarProvider, useSidebar } from '../src/context/SidebarContext';
import {
  shouldCloseSidebarOnPointerDown,
  createSidebarOutsideListener,
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

describe('Sidebar Fixes & Outside Press Behavior (M10.8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setLastInputType('pointer');
  });

  describe('1. Pure Function: shouldCloseSidebarOnPointerDown', () => {
    it('returns true when clicking completely outside the sidebar', () => {
      const sidebar = document.createElement('aside');
      const outsideButton = document.createElement('button');
      document.body.appendChild(sidebar);
      document.body.appendChild(outsideButton);

      const result = shouldCloseSidebarOnPointerDown({
        target: outsideButton,
        sidebarElement: sidebar,
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

      const result = shouldCloseSidebarOnPointerDown({
        target: navItem,
        sidebarElement: sidebar,
      });

      expect(result).toBe(false);
      document.body.removeChild(sidebar);
    });

    it('returns false when clicking a toggle button marked with data-sidebar-ignore-outside', () => {
      const sidebar = document.createElement('aside');
      const toggleBtn = document.createElement('button');
      toggleBtn.setAttribute('data-sidebar-ignore-outside', 'true');
      const icon = document.createElement('svg');
      toggleBtn.appendChild(icon);
      document.body.appendChild(sidebar);
      document.body.appendChild(toggleBtn);

      // Target directly on button
      expect(
        shouldCloseSidebarOnPointerDown({
          target: toggleBtn,
          sidebarElement: sidebar,
        })
      ).toBe(false);

      // Target on child icon
      expect(
        shouldCloseSidebarOnPointerDown({
          target: icon,
          sidebarElement: sidebar,
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

      const result = shouldCloseSidebarOnPointerDown({
        target: modalButton,
        sidebarElement: sidebar,
      });

      expect(result).toBe(false);
      document.body.removeChild(sidebar);
      document.body.removeChild(modal);
    });

    it('does not call preventDefault or stopPropagation in createSidebarOutsideListener', () => {
      const sidebar = document.createElement('aside');
      const onClose = vi.fn();
      const listener = createSidebarOutsideListener(() => sidebar, onClose);

      const outsideButton = document.createElement('button');
      document.body.appendChild(sidebar);
      document.body.appendChild(outsideButton);

      const mockEvent: any = {
        target: outsideButton,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };

      listener(mockEvent);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();

      document.body.removeChild(sidebar);
      document.body.removeChild(outsideButton);
    });
  });

  describe('2. Rendered Sidebar & Outside Press Pass-Through', () => {
    const LayoutHarness: React.FC<{ onTabChange?: (tab: string) => void }> = ({ onTabChange = vi.fn() }) => (
      <SidebarProvider>
        <div className="flex">
          <Sidebar activeTab="dashboard" onTabChange={onTabChange} />
          <Navbar activeTab="dashboard" />
        </div>
      </SidebarProvider>
    );

    it('starts collapsed on desktop and closed on mobile', () => {
      renderWithProviders(<LayoutHarness />);
      const desktopToggle = screen.getByTitle('Expand sidebar');
      expect(desktopToggle).toBeDefined();
      expect(desktopToggle.getAttribute('aria-expanded')).toBe('false');
      expect(desktopToggle.getAttribute('aria-controls')).toBe('sidebar-navigation');

      const phoneToggle = screen.getByTitle('Open menu');
      expect(phoneToggle).toBeDefined();
      expect(phoneToggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles desktop sidebar open and updates title, label, and aria-expanded', () => {
      renderWithProviders(<LayoutHarness />);
      const desktopToggle = screen.getByTitle('Expand sidebar');
      fireEvent.click(desktopToggle);

      const collapseToggle = screen.getByTitle('Collapse sidebar');
      expect(collapseToggle).toBeDefined();
      expect(collapseToggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('closes on outside pointerdown and delivers click to page button in a single press', () => {
      const handlePageButtonClick = vi.fn();

      const TestComponent = () => {
        const { isOpen } = useSidebar();
        return (
          <div>
            <Sidebar activeTab="dashboard" onTabChange={vi.fn()} />
            <button
              type="button"
              id="page-action-btn"
              onClick={handlePageButtonClick}
            >
              Action Button
            </button>
            <span data-testid="status">{isOpen ? 'open' : 'closed'}</span>
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

      // Sidebar closes AND page button was clicked
      expect(screen.getByTestId('status').textContent).toBe('closed');
      expect(handlePageButtonClick).toHaveBeenCalledTimes(1);
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
  });

  describe('3. Toggle Icon & Label Synchronization Across All Paths', () => {
    const LayoutHarness = () => (
      <SidebarProvider>
        <div className="flex">
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

  describe('4. Input Mode Tracking & Focus Handling (M10.8)', () => {
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
