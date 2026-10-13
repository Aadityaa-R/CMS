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
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
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
}) => {
  const { currentRole, currentUser, logout } = useAuth();

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
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Role header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm tracking-wide uppercase">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <span>Clinic Portal</span>
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

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info & quick logout */}
        <div className="p-4 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-3 text-slate-400">
            <div>
              <div className="font-medium text-slate-200">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                {currentUser.email}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/60 transition-colors text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};
