import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { LoginView } from '@/views/LoginView';

// Role views
import { AdminView } from '@/views/AdminView';
import { DoctorView } from '@/views/DoctorView';
import { PatientView } from '@/views/PatientView';
import { ReceptionistView } from '@/views/ReceptionistView';

export const AppLayout: React.FC = () => {
  const { currentRole, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('doctor');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);

  // Whenever the active role changes upon login, reset the active module tab
  useEffect(() => {
    setActiveTab(currentRole === 'doctor' || currentRole === 'admin' ? 'doctor' : 'overview');
  }, [currentRole]);

  // If user signed out, display login screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    if (currentRole === 'doctor' || currentRole === 'admin') {
      switch (activeTab) {
        case 'doctor':
        case 'role_doctor':
          return <DoctorView activeTab="overview" />;
        case 'role_receptionist':
        case 'receptionist':
          return <ReceptionistView activeTab="overview" />;
        case 'role_patient':
        case 'patient':
          return <PatientView />;
        case 'admin_overview':
        case 'overview':
          return <AdminView activeTab="overview" />;
        case 'admin_billing':
        case 'billing':
          return <AdminView activeTab="billing" />;
        case 'admin_inventory':
        case 'inventory':
          return <AdminView activeTab="inventory" />;
        default:
          return <DoctorView activeTab="overview" />;
      }
    }

    switch (currentRole) {
      case 'receptionist':
        return <ReceptionistView activeTab={activeTab} />;
      case 'patient':
        return <PatientView />;
      default:
        return <DoctorView activeTab="overview" />;
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans antialiased overflow-hidden transition-colors ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Dynamic Role-specific Sidebar: strictly provides only this role's modules */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Content Shell */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header with profile & logout - pinned at top */}
          <Navbar />

          {/* Main View Area - dedicated scrollable container extending full width flush against panels */}
          <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6">
            {renderActiveView()}
          </main>
        </div>
      </div>
    </div>
  );
};
