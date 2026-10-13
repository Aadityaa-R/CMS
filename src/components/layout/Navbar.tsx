import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Bell,
  Search,
  Building2,
  CheckCircle2,
  PanelLeft,
  User,
  Settings,
  LogOut,
  Shield,
  Mail,
  BadgeCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    setIsProfileModalOpen(true);
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    setIsSettingsModalOpen(true);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs transition-colors">
        {/* Brand / Clinic Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle Side Navigation"
            title="Toggle Side Navigation"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-teal-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight tracking-tight">
                  Beacon Health Clinic
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Operational
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Clinical Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Search, Notifications, Profile Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search bar with ample left padding preventing icon overlap */}
          <div className="hidden md:flex items-center relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search records, patients..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg !pl-11 pr-3.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
            />
          </div>

          {/* Notifications indicator */}
          <div className="relative">
            <button
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </div>

          {/* Profile Dropdown Container: only the profile icon */}
          <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-9 h-9 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center font-medium shadow-sm ring-2 ring-teal-500/20 hover:ring-teal-500/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              aria-label="User profile menu"
              aria-expanded={isDropdownOpen}
            >
              <User className="w-4 h-4 text-white" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fadeIn">
                {/* Header item with user information */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-teal-700 dark:text-teal-400 capitalize font-medium">
                    {currentRole.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {currentUser.email}
                  </div>
                </div>

                {/* Option 1: Profile */}
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Profile</span>
                </button>

                {/* Option 2: Setting */}
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Setting</span>
                </button>

                {/* Option 3: Theme Switcher (Light / Dark Mode) */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                    <span>Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-medium border border-slate-200 dark:border-slate-700">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Option 4: Log Out */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* User Profile Details Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Personnel Profile"
        description="Authorized account credentials and departmental assignment."
        maxWidth="md"
        footer={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsProfileModalOpen(false)}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {currentUser.name}
              </div>
              <div className="text-xs text-teal-700 dark:text-teal-400 font-medium capitalize">
                {currentRole.replace('_', ' ')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser.title || 'Clinical Personnel'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email Address
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 break-all">
                {currentUser.email}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block flex items-center gap-1">
                <Shield className="w-3 h-3" /> Department
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {currentUser.department || 'Outpatient Services'}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Badge / Terminal ID
              </span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {currentUser.badgeNumber || 'STAFF-100'}
              </span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                Session Status
              </span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Active & Verified
              </span>
            </div>
          </div>
        </div>
      </Modal>

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
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              Clinical Notification Preferences
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input type="checkbox" defaultChecked className="rounded text-teal-600" />
              <span>Audible chime on high-priority / STAT orders</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input type="checkbox" defaultChecked className="rounded text-teal-600" />
              <span>Real-time queue update banners</span>
            </label>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              Display & Terminal Options
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input type="checkbox" defaultChecked className="rounded text-teal-600" />
              <span>High contrast clinical table borders</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input type="checkbox" defaultChecked className="rounded text-teal-600" />
              <span>Compact table row density</span>
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
};
