import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';
import { focusIfKeyboard } from '@/lib/inputMode';
import {
  Menu,
  X,
  Bell,
  Building2,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/context/NotificationContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string, subTab?: string) => void;
  activeTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate, activeTab }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { userNotifications, unreadCount, markAsRead, markAllAsRead, dismissNotification } = useNotifications();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [menuFocusedIndex, setMenuFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setMenuFocusedIndex(-1);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    if (isDropdownOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isNotificationsOpen]);

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    setMenuFocusedIndex(-1);
    onNavigate?.('profile');
    setTimeout(() => {
      const heading = document.getElementById('profile-heading');
      if (heading) {
        focusIfKeyboard(heading);
      }
    }, 50);
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    setMenuFocusedIndex(-1);
    setIsSettingsModalOpen(true);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setMenuFocusedIndex(-1);
    logout();
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMenuFocusedIndex((prev) => {
        const next = prev < 3 ? prev + 1 : 0;
        menuItemsRef.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMenuFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 3;
        menuItemsRef.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMenuFocusedIndex(0);
      menuItemsRef.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setMenuFocusedIndex(3);
      menuItemsRef.current[3]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setMenuFocusedIndex(-1);
      avatarButtonRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsDropdownOpen(false);
      setMenuFocusedIndex(-1);
    }
  };

  const handleAvatarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setMenuFocusedIndex(0);
      setTimeout(() => {
        menuItemsRef.current[0]?.focus();
      }, 20);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setMenuFocusedIndex(3);
      setTimeout(() => {
        menuItemsRef.current[3]?.focus();
      }, 20);
    }
  };

  return (
    <>
      <header className="h-[var(--nav-cell)] w-full bg-[#fafafa] dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-b border-[#eef0f3] dark:border-slate-800  flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors" style={{ paddingLeft: 'var(--page-pad)', paddingRight: 'var(--page-pad)' }}>
        {/* Brand / Clinic Title */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            data-sidebar-ignore-outside="true"
            onClick={onToggleSidebar || toggleSidebar}
            className={`w-[var(--nav-cell)] h-[var(--nav-cell)] flex items-center justify-center p-2 rounded-lg lg:hidden cursor-pointer outline-none focus:outline-none focus:ring-0 ${isSidebarOpen ? 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
            title={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-navigation"
          >
            {isSidebarOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.(currentRole === 'patient' ? 'overview' : 'dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 group"
            title={currentRole === 'patient' ? 'Go to My Portal' : 'Go to Dashboard'}
          >
            <div className="w-[var(--nav-cell)] h-[var(--nav-cell)] lg:w-8 lg:h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold ring-2 ring-teal-500/20 group-hover:bg-teal-700 transition-colors shrink-0 nav-touch-target">
              <Building2 className="w-5 h-5 lg:w-4 lg:h-4" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight tracking-tight truncate max-w-[190px] sm:max-w-none">
                Beacon Health Clinic
              </h1>
            </div>
          </button>
        </div>

        {/* Right Section: Notifications, Profile Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Notifications indicator with interactive popover */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-[var(--nav-cell)] h-[var(--nav-cell)] lg:w-8 lg:h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer relative outline-none focus:outline-none focus:ring-0 shrink-0 nav-touch-target"
              aria-label={`Notifications (${unreadCount} unread)`}
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="w-5 h-5 lg:w-4 lg:h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 lg:top-1 lg:right-1 w-2 h-2 bg-teal-500 rounded-full ring-2 ring-slate-900" />
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-modal dark:shadow-none print:shadow-none border border-slate-200 dark:border-slate-800 p-4 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Notifications</span>
                    <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-medium">
                      ({unreadCount} Unread)
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      className="text-[0.6875rem] text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {userNotifications.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2.5 text-slate-500 dark:text-slate-400">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">No notifications</p>
                    <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                      Consultation updates, schedule alerts, and booking notices will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="py-2 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {userNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-2.5 text-xs rounded-lg transition-colors ${
                          notif.read ? 'bg-transparent text-slate-600 dark:text-slate-400' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                            {notif.title}
                          </span>
                          <span className="text-[0.625rem] text-slate-500 dark:text-slate-400 shrink-0">
                            {notif.createdAt ? notif.createdAt.replace('T', ' ').slice(0, 16) : ''}
                          </span>
                        </div>
                        <p className="text-[0.6875rem] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-2 pt-1">
                          {notif.linkTab ? (
                            <button
                              type="button"
                              onClick={() => {
                                markAsRead(notif.id);
                                setIsNotificationsOpen(false);
                                onNavigate?.(notif.linkTab!);
                              }}
                              className="text-[0.6875rem] text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                            >
                              View details
                            </button>
                          ) : (
                            <span />
                          )}
                          <div className="flex items-center gap-2">
                            {!notif.read && (
                              <button
                                type="button"
                                onClick={() => markAsRead(notif.id)}
                                className="text-[0.6875rem] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => dismissNotification(notif.id)}
                              className="text-[0.6875rem] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown Container: only the profile icon */}
          <div className="relative pl-2.5 border-l border-[#eef0f3] dark:border-slate-800" ref={dropdownRef}>
            <button
              ref={avatarButtonRef}
              id="user-menu-button"
              type="button"
              onClick={() => {
                const next = !isDropdownOpen;
                setIsDropdownOpen(next);
                if (next) {
                  setMenuFocusedIndex(0);
                  setTimeout(() => menuItemsRef.current[0]?.focus(), 20);
                } else {
                  setMenuFocusedIndex(-1);
                }
              }}
              onKeyDown={handleAvatarKeyDown}
              className="w-[var(--nav-cell)] h-[var(--nav-cell)] lg:w-8 lg:h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center font-medium transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 shrink-0 nav-touch-target"
              aria-label="User profile menu"
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
              aria-controls="user-menu"
            >
              <User className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                ref={menuRef}
                id="user-menu"
                role="menu"
                aria-labelledby="user-menu-button"
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-modal dark:shadow-none print:shadow-none border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn"
              >
                {/* Header item with user information */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[0.6875rem] text-teal-700 dark:text-teal-400 capitalize font-medium">
                    {currentRole.replace('_', ' ')}
                  </div>
                  <div className="text-[0.625rem] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser.email}
                  </div>
                </div>

                {/* Option 1: Profile */}
                <button
                  ref={(el) => (menuItemsRef.current[0] = el)}
                  id="menu-item-profile"
                  type="button"
                  role="menuitem"
                  tabIndex={menuFocusedIndex === 0 ? 0 : -1}
                  aria-current={activeTab === 'profile' ? 'page' : undefined}
                  onClick={handleOpenProfile}
                  className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors text-left cursor-pointer outline-none focus:bg-slate-100 dark:focus:bg-slate-800 ${
                    activeTab === 'profile'
                      ? 'font-semibold text-teal-700 dark:text-teal-400 bg-slate-50 dark:bg-slate-800/40'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Profile</span>
                  </div>
                  {activeTab === 'profile' && (
                    <span className="text-[0.6875rem] text-teal-600 dark:text-teal-400 font-medium">Active</span>
                  )}
                </button>

                {/* Option 2: Settings */}
                <button
                  ref={(el) => (menuItemsRef.current[1] = el)}
                  id="menu-item-settings"
                  type="button"
                  role="menuitem"
                  tabIndex={menuFocusedIndex === 1 ? 0 : -1}
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 transition-colors text-left cursor-pointer outline-none"
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Settings</span>
                </button>

                {/* Option 3: Theme Switcher (Light / Dark Mode) */}
                <button
                  ref={(el) => (menuItemsRef.current[2] = el)}
                  id="menu-item-theme"
                  type="button"
                  role="menuitem"
                  tabIndex={menuFocusedIndex === 2 ? 0 : -1}
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 transition-colors text-left cursor-pointer outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    )}
                    <span>Theme</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Option 4: Log Out */}
                <button
                  ref={(el) => (menuItemsRef.current[3] = el)}
                  id="menu-item-logout"
                  type="button"
                  role="menuitem"
                  tabIndex={menuFocusedIndex === 3 ? 0 : -1}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/40 transition-colors text-left font-medium cursor-pointer outline-none"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Terminal Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Terminal & Station Settings"
        description="Configure station preferences and notifications."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsSettingsModalOpen(false)}
          >
            Save Preferences
          </Button>
        }
      >
        <div className="space-y-6 text-xs">
          {/* Category 1: Clinical Alerts & Notifications */}
          <div className="space-y-2.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Clinical Alerts & Notifications
            </div>
            <div className="space-y-2.5 pl-0.5">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Audible chime on high-priority appointments</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Real-time queue update banners</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Broadcast immediate alert on critical patient vitals</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Browser desktop notifications for patient arrivals</span>
              </div>
            </div>
          </div>

          {/* Category 2: Display & Workspace Density */}
          <div className="space-y-2.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Display & Workspace Density
            </div>
            <div className="space-y-2.5 pl-0.5">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">High contrast clinical table borders</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Compact table row density</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Auto-refresh active worklist queues every 30 seconds</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-teal-600 focus:ring-0 outline-none cursor-pointer"
                />
                <span className="cursor-default">Highlight STAT and urgent orders with high-visibility indicator</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
