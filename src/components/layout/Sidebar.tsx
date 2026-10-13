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
  ChevronLeft,
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
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        } ${
          isOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Role header */}
        <div className={`border-b border-slate-800 ${isCollapsed ? 'p-3 text-center' : 'p-5'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400"
                title="Clinic Portal"
              >
                <ShieldCheck className="w-5 h-5 text-teal-400" />
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-10 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Expand Side Panel"
                  aria-label="Expand Side Panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm tracking-wide uppercase">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <span>Clinic Portal</span>
                </div>
                {onToggleCollapse && (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Collapse Side Panel"
                    aria-label="Collapse Side Panel"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Current Workspace
                </div>
                <div className="text-sm font-semibold text-white capitalize mt-0.5">
                  {currentRole.replace('_', ' ')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation Menu
            </div>
          )}
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
                className={`w-full flex items-center rounded-lg text-xs font-medium transition-all ${
                  isCollapsed
                    ? 'justify-center p-3'
                    : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

