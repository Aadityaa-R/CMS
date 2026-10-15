import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { LoginView } from '@/views/LoginView';

// Role views
import { DashboardView } from '@/views/DashboardView';
import { AdminView } from '@/views/AdminView';
import { DoctorView } from '@/views/DoctorView';
import { PatientView } from '@/views/PatientView';
import { ReceptionistView } from '@/views/ReceptionistView';
import { AccessControlView } from '@/views/AccessControlView';
import { Button } from '@/components/ui/Button';
import { isAdmin } from '@/lib/permissions';

export const AppLayout: React.FC = () => {
  const { currentRole, currentUser, isAuthenticated, isRoleSuspended, logout } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);

  // Whenever the active role changes upon login, reset the active module tab to dashboard
  useEffect(() => {
    setActiveTab('dashboard');
    setActiveSubTab(undefined);
  }, [currentRole]);

  // If a doctor was viewing access_control and their admin capability was revoked, return immediately to dashboard
  useEffect(() => {
    if (currentRole === 'doctor' && activeTab === 'access_control' && !isAdmin(currentUser)) {
      setActiveTab('dashboard');
      setActiveSubTab(undefined);
    }
  }, [currentRole, activeTab, currentUser]);

  // If user signed out, display login screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // If active role is suspended by the MD, display security lock screen
  if (isRoleSuspended(currentRole)) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center p-6 text-center ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Station Access Suspended
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Workstation access for this role has been revoked by <strong>Dr. Marcus Vance (Managing Director)</strong>. Please contact the clinic administrator to request access clearance.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={logout}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleNavigate = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    setActiveSubTab(subTab);
  };

  const renderActiveView = () => {
    if (activeTab === 'dashboard') {
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (currentRole === 'md' || currentRole === 'admin') {
      switch (activeTab) {
        case 'doctor':
        case 'role_doctor':
          return <DoctorView activeTab={activeSubTab || 'overview'} />;
        case 'role_receptionist':
        case 'receptionist':
          return <ReceptionistView activeTab={activeSubTab || 'overview'} />;
        case 'role_patient':
        case 'patient':
          return <PatientView activeTab={activeSubTab || 'overview'} />;
        case 'access_control':
          return <AccessControlView activeTab={activeSubTab || 'add_users'} />;
        case 'admin_billing':
        case 'billing':
          return <AdminView activeTab="billing" />;
        default:
          return <DashboardView onNavigate={handleNavigate} />;
      }
    }

    if (currentRole === 'doctor') {
      switch (activeTab) {
        case 'doctor':
          return <DoctorView activeTab={activeSubTab || 'overview'} />;
        case 'role_patient':
          return <PatientView activeTab={activeSubTab || 'overview'} />;
        case 'access_control':
          if (isAdmin(currentUser)) {
            return <AccessControlView activeTab={activeSubTab || 'add_users'} />;
          }
          return <DashboardView onNavigate={handleNavigate} />;
        default:
          return <DashboardView onNavigate={handleNavigate} />;
      }
    }

    switch (currentRole) {
      case 'receptionist':
        return <ReceptionistView activeTab={activeSubTab || activeTab} />;
      case 'patient':
        return <PatientView activeTab={activeSubTab || activeTab} />;
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans antialiased overflow-hidden transition-colors ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Dynamic Role-specific Sidebar: strictly provides only this role's modules */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setActiveSubTab(undefined);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Content Shell */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header with profile & logout - pinned at top */}
          <Navbar onNavigate={handleNavigate} />

          {/* Main View Area - dedicated scrollable container extending full width flush against panels */}
          <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6">
            {renderActiveView()}
          </main>
        </div>
      </div>
    </div>
  );
};
