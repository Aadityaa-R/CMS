import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RoleSwitcher } from './RoleSwitcher';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { LoginView } from '@/views/LoginView';

// Role views
import { ClinicAdminView } from '@/views/ClinicAdminView';
import { DoctorView } from '@/views/DoctorView';
import { PatientView } from '@/views/PatientView';
import { ReceptionistView } from '@/views/ReceptionistView';
import { NurseView } from '@/views/NurseView';
import { PharmacistView } from '@/views/PharmacistView';
import { AccountantView } from '@/views/AccountantView';
import { LabTechnicianView } from '@/views/LabTechnicianView';

export const AppLayout: React.FC = () => {
  const { currentRole, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // If user signed out, display login screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentRole) {
      case 'clinic_admin':
        return <ClinicAdminView activeTab={activeTab} />;
      case 'doctor':
        return <DoctorView activeTab={activeTab} />;
      case 'patient':
        return <PatientView activeTab={activeTab} />;
      case 'receptionist':
        return <ReceptionistView activeTab={activeTab} />;
      case 'nurse':
        return <NurseView activeTab={activeTab} />;
      case 'pharmacist':
        return <PharmacistView activeTab={activeTab} />;
      case 'accountant':
        return <AccountantView activeTab={activeTab} />;
      case 'lab_technician':
        return <LabTechnicianView activeTab={activeTab} />;
      default:
        return <ClinicAdminView activeTab={activeTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      {/* 1-Click Role Switcher Bar */}
      <RoleSwitcher />

      <div className="flex-1 flex overflow-hidden">
        {/* Dynamic Role-specific Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content Shell */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header */}
          <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

          {/* Main View Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderActiveView()}
          </main>
        </div>
      </div>
    </div>
  );
};
