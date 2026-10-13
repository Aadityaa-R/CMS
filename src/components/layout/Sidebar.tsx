import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  CreditCard,
  Package,
  FileText,
  Activity,
  Pill,
  FlaskConical,
  Clock,
  PlusCircle,
  FilePlus,
  ShieldCheck,
  ChevronRight,
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
  const { currentRole } = useAuth();

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'clinic_admin':
        return [
          { id: 'overview', label: 'Clinic Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'patients', label: 'Patient Directory', icon: <Users className="w-4 h-4" /> },
          { id: 'doctors', label: 'Doctor Management', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'appointments', label: 'All Appointments', icon: <Calendar className="w-4 h-4" /> },
          { id: 'billing', label: 'Revenue & Billing', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'inventory', label: 'Stock & Inventory', icon: <Package className="w-4 h-4" /> },
        ];

      case 'doctor':
        return [
          { id: 'overview', label: 'Consultation Desk', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'patients', label: 'My Patients', icon: <Users className="w-4 h-4" /> },
          { id: 'prescriptions', label: 'Write Prescription', icon: <FilePlus className="w-4 h-4" /> },
          { id: 'lab_orders', label: 'Order Lab Tests', icon: <FlaskConical className="w-4 h-4" /> },
          { id: 'schedule', label: 'Weekly Schedule', icon: <Clock className="w-4 h-4" /> },
        ];

      case 'patient':
        return [
          { id: 'overview', label: 'My Health Portal', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'appointments', label: 'My Appointments', icon: <Calendar className="w-4 h-4" /> },
          { id: 'prescriptions', label: 'My Prescriptions', icon: <Pill className="w-4 h-4" /> },
          { id: 'lab_results', label: 'My Lab Results', icon: <FlaskConical className="w-4 h-4" /> },
          { id: 'billing', label: 'My Invoices', icon: <CreditCard className="w-4 h-4" /> },
        ];

      case 'receptionist':
        return [
          { id: 'overview', label: 'Front Desk Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'checkin', label: 'Patient Check-In', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'registration', label: 'Register New Patient', icon: <PlusCircle className="w-4 h-4" /> },
          { id: 'booking', label: 'Book Appointment', icon: <Calendar className="w-4 h-4" /> },
        ];

      case 'nurse':
        return [
          { id: 'overview', label: 'Triage Station', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'vitals', label: 'Record Vital Signs', icon: <Activity className="w-4 h-4" /> },
          { id: 'queue', label: 'Patient Triage Queue', icon: <Users className="w-4 h-4" /> },
        ];

      case 'pharmacist':
        return [
          { id: 'overview', label: 'Dispensary Queue', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'prescriptions', label: 'Prescription Orders', icon: <Pill className="w-4 h-4" /> },
          { id: 'inventory', label: 'Medication Inventory', icon: <Package className="w-4 h-4" /> },
        ];

      case 'accountant':
        return [
          { id: 'overview', label: 'Billing Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'invoices', label: 'Invoices & Receipts', icon: <FileText className="w-4 h-4" /> },
          { id: 'collections', label: 'Fee Collections', icon: <CreditCard className="w-4 h-4" /> },
        ];

      case 'lab_technician':
        return [
          { id: 'overview', label: 'Laboratory Worklist', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'samples', label: 'Sample Collection', icon: <Activity className="w-4 h-4" /> },
          { id: 'results', label: 'Diagnostic Results Entry', icon: <FlaskConical className="w-4 h-4" /> },
        ];

      default:
        return [{ id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> }];
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
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-slate-800 overflow-hidden shrink-0 ${
          isCollapsed ? 'lg:w-16 w-16' : 'lg:w-64 w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Role header & Single Arrow Toggle Control */}
        <div className="border-b border-slate-800 p-2.5 flex flex-col items-center gap-2">
          <div className="w-full flex items-center justify-between overflow-hidden">
            <div className="flex items-center min-w-0">
              <div
                className="w-10 h-10 rounded-lg bg-slate-800/90 flex items-center justify-center text-teal-400 shrink-0"
                title="Clinic Portal"
              >
                <ShieldCheck className="w-5 h-5 text-teal-400" />
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap ${
                  isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[130px] opacity-100 ml-3'
                }`}
              >
                <div className="text-xs font-bold text-teal-400 tracking-wide uppercase">
                  Clinic Portal
                </div>
                <div className="text-[11px] text-slate-400 font-medium capitalize truncate">
                  {currentRole.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* Single Arrow Mark Button that stays on the side panel */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`w-full py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center transition-all duration-300 cursor-pointer ${
                isCollapsed ? 'justify-center px-1' : 'justify-between px-3'
              }`}
              title={isCollapsed ? 'Open side panel' : 'Collapse side panel'}
              aria-label={isCollapsed ? 'Open side panel' : 'Collapse side panel'}
            >
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap text-[11px] font-medium text-slate-400 ${
                  isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'
                }`}
              >
                Collapse Menu
              </div>
              <ChevronRight
                className={`w-4 h-4 text-teal-400 shrink-0 transition-transform duration-300 ease-in-out ${
                  !isCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <div
            className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ${
              isCollapsed ? 'max-w-0 opacity-0 pb-0' : 'max-w-[140px] opacity-100 pb-2'
            }`}
          >
            Navigation Menu
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
                className={`w-full flex items-center rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span
                  className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap truncate ${
                    isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[160px] opacity-100 ml-3'
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

