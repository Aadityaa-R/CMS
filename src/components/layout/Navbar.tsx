import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Bell,
  Search,
  Building2,
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
import { Input } from '@/components/ui/Input';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { currentUser, currentRole, logout, updateCurrentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileBadgeNumber, setProfileBadgeNumber] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileFeedback, setProfileFeedback] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
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
    setIsEditingProfile(false);
    setProfileName(currentUser.name);
    setProfileTitle(currentUser.title || '');
    setProfileDepartment(currentUser.department || '');
    setProfileBadgeNumber(currentUser.badgeNumber || '');
    setProfileEmail(currentUser.email);
    setProfileFeedback(false);
    setIsProfileModalOpen(true);
  };

  const handleStartEdit = () => {
    setProfileName(currentUser.name);
    setProfileTitle(currentUser.title || '');
    setProfileDepartment(currentUser.department || '');
    setProfileBadgeNumber(currentUser.badgeNumber || '');
    setProfileEmail(currentUser.email);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateCurrentUser({
      name: profileName.trim() || currentUser.name,
      title: profileTitle.trim() || currentUser.title,
      department: profileDepartment.trim() || currentUser.department,
      badgeNumber: profileBadgeNumber.trim() || currentUser.badgeNumber,
      email: profileEmail.trim() || currentUser.email,
    });
    setIsEditingProfile(false);
    setProfileFeedback(true);
    setTimeout(() => {
      setProfileFeedback(false);
    }, 3500);
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
      <header className="h-20 bg-slate-50 dark:bg-slate-950 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
        {/* Brand / Clinic Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-teal-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg leading-tight tracking-tight">
                  Beacon Health Clinic
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                Clinical Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Search, Notifications, Profile Dropdown */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Search bar */}
          <div className="hidden md:flex items-center relative w-72 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search records, patients..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg !pl-11 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
            />
          </div>

          {/* Notifications indicator with interactive popover */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer relative outline-none focus:outline-none focus:ring-0"
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Notification Dropdown Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Notifications</span>
                    <span className="text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-semibold px-2 py-0.5 rounded-full border border-teal-200/50 dark:border-teal-800/50">
                      0 Unread
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">All caught up</span>
                </div>
                <div className="py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2.5 text-slate-400 dark:text-slate-500">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">No new notifications</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                    Clinical alerts, consultation updates, and critical reminders will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Container: only the profile icon */}
          <div className="relative pl-3 border-l border-slate-200 dark:border-slate-800" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center font-medium shadow-sm transition-all cursor-pointer outline-none focus:outline-none focus:ring-0"
              aria-label="User profile menu"
              aria-expanded={isDropdownOpen}
            >
              <User className="w-5 h-5 text-white" />
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
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer outline-none focus:outline-none focus:ring-0"
                >
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Profile</span>
                </button>

                {/* Option 2: Settings */}
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer outline-none focus:outline-none focus:ring-0"
                >
                  <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Settings</span>
                </button>

                {/* Option 3: Theme Switcher (Light / Dark Mode) */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer outline-none focus:outline-none focus:ring-0"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-teal-400" />
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
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors text-left font-medium cursor-pointer outline-none focus:outline-none focus:ring-0"
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
        title={isEditingProfile ? 'Edit Personnel Profile' : 'Personnel Profile'}
        description={
          isEditingProfile
            ? 'Update your authorized clinical credentials and departmental assignment.'
            : 'Authorized account credentials and departmental assignment.'
        }
        maxWidth="md"
        footer={
          isEditingProfile ? (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingProfile(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveProfile}
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                {profileFeedback ? 'Profile updated successfully.' : ''}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartEdit}
                >
                  Edit Details
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )
        }
      >
        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <Input
              label="Full Name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Dr. Marcus Vance, MD"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Professional Title / Position"
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
                placeholder="e.g. Lead Consulting Physician"
              />
              <Input
                label="Badge / Terminal ID"
                value={profileBadgeNumber}
                onChange={(e) => setProfileBadgeNumber(e.target.value)}
                placeholder="e.g. DOC-101"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Department"
                value={profileDepartment}
                onChange={(e) => setProfileDepartment(e.target.value)}
                placeholder="e.g. Clinical Consultation"
              />
              <Input
                label="Email Address"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="e.g. marcus.vance@beaconhealth.com"
                required
              />
            </div>
          </form>
        ) : (
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
                <span className="font-medium text-teal-700 dark:text-teal-400">
                  Active & Verified
                </span>
              </div>
            </div>
          </div>
        )}
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
