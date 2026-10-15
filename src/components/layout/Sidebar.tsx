import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  CreditCard,
  Pill,
  PlusCircle,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Stethoscope,
  User,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
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
  isOpen,
  onClose,
  isCollapsed = true,
  onToggleCollapse,
}) => {
  const { currentRole, currentUser } = useAuth();

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'md':
      case 'admin':
        // Option 1: Clinical-First MD Work Order
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'doctor', label: 'Consultation Desk', icon: <Stethoscope className="w-4 h-4" /> },
          { id: 'role_receptionist', label: 'Reception Desk', icon: <Calendar className="w-4 h-4" /> },
          { id: 'role_patient', label: 'Patient Directory', icon: <User className="w-4 h-4" /> },
          { id: 'access_control', label: 'Administrative', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'admin_billing', label: 'Billing & Revenue', icon: <CreditCard className="w-4 h-4" /> },
        ];

      case 'doctor': {
        // Staff Doctor working under the MD
        const items: NavItem[] = [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'doctor', label: 'Consultation Desk', icon: <Stethoscope className="w-4 h-4" /> },
          { id: 'role_patient', label: 'Patient Directory', icon: <User className="w-4 h-4" /> },
        ];
        if (currentUser && (currentUser.role === 'admin' || currentUser.isOriginalAdmin || currentUser.capabilities?.includes('perm-admin') || currentUser.capabilities?.includes('administrativeAccess'))) {
          items.push({ id: 'access_control', label: 'Administrative', icon: <ShieldCheck className="w-4 h-4" /> });
        }
        return items;
      }

      case 'receptionist':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'overview', label: 'Front Desk Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'checkin', label: 'Patient Check-In', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'registration', label: 'Register New Patient', icon: <PlusCircle className="w-4 h-4" /> },
          { id: 'booking', label: 'Book Appointment', icon: <Calendar className="w-4 h-4" /> },
        ];

      case 'patient':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'overview', label: 'My Health Portal', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'appointments', label: 'My Appointments', icon: <Calendar className="w-4 h-4" /> },
          { id: 'prescriptions', label: 'My Prescriptions', icon: <Pill className="w-4 h-4" /> },
          { id: 'billing', label: 'My Invoices', icon: <CreditCard className="w-4 h-4" /> },
        ];

      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width] overflow-hidden shrink-0 select-none h-full ${
          isCollapsed ? 'lg:w-14 w-14' : 'lg:w-64 w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Role header & Single Console Toggle Control */}
        <div className="h-20 px-2 flex items-center justify-between shrink-0">
          <div className="flex items-center min-w-0">
            {/* Sidebar Console Toggle Icon with Arrow */}
            {onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-teal-400 hover:text-teal-300 hover:bg-slate-800/70 transition-colors duration-200 cursor-pointer shrink-0 outline-none focus:outline-none focus:ring-0"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-teal-400 hover:text-teal-300 transition-colors" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-teal-400 hover:text-teal-300 transition-colors" />
                )}
              </button>
            ) : (
              <div
                className="w-7 h-7 flex items-center justify-center text-teal-400 shrink-0"
                title="Clinic Portal"
                aria-label="Clinic Portal"
              >
                <PanelLeft className="w-4 h-4 text-teal-400" />
              </div>
            )}

            {/* Clinic Portal Brand Details */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap ${
                isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[170px] opacity-100 ml-2.5'
              }`}
            >
              <div className="text-xs font-bold text-teal-400 tracking-wide uppercase">
                Clinic Operations
              </div>
              <div className="text-xs font-semibold text-slate-300 capitalize truncate mt-0.5">
                {currentRole === 'md' || currentRole === 'admin'
                  ? 'MD'
                  : currentRole === 'doctor'
                  ? 'Doctor'
                  : currentRole.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <div
            className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ${
              isCollapsed ? 'max-w-0 opacity-0 pb-0' : 'max-w-[170px] opacity-100 pb-2'
            }`}
          >
            Navigation Pane
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                title={item.label}
                aria-label={item.label}
                className={`w-full h-10 flex items-center px-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-0 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span
                  title={item.label}
                  aria-label={item.label}
                  className={`w-7 h-7 flex items-center justify-center shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                >
                  {item.icon}
                </span>
                <span
                  className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap truncate ${
                    isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[170px] opacity-100 ml-2.5'
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

