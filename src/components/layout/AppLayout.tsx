import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from '@/context/SidebarContext';
import { LoginView } from '@/views/LoginView';

// Role views
import { DashboardView } from '@/views/DashboardView';
import { DoctorView } from '@/views/DoctorView';
import { PatientView } from '@/views/PatientView';
import { ReceptionistView } from '@/views/ReceptionistView';
import { AccessControlView } from '@/views/AccessControlView';
import { AttendanceView } from '@/views/AttendanceView';
import { BillingView } from '@/views/BillingView';
import { ProfileView } from '@/views/ProfileView';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { isAdmin, hasCapability, canViewBilling } from '@/lib/permissions';
import { useClinic } from '@/context/ClinicContext';

import { PageContainer } from './PageContainer';

export const AppLayout: React.FC = () => {
  const { currentRole, currentUser, isAuthenticated, isRoleSuspended, logout } = useAuth();
  const { modules } = useClinic();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const pathname = window.location.pathname.toLowerCase();
      if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'profile') return 'profile';
      if (tabParam) return tabParam;
      return currentRole === 'patient' ? 'overview' : 'dashboard';
    } catch {
      return currentRole === 'patient' ? 'overview' : 'dashboard';
    }
  });
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('subtab') || undefined;
    } catch {
      return undefined;
    }
  });
  const [isProfileDirty, setIsProfileDirty] = useState<boolean>(false);
  const [pendingNav, setPendingNav] = useState<{ tab: string; subTab?: string } | null>(null);

  // Sync URL history state on popstate
  useEffect(() => {
    const handlePopState = () => {
      try {
        const pathname = window.location.pathname.toLowerCase();
        if (pathname === '/profile' || pathname.startsWith('/profile/')) {
          setActiveTab('profile');
          setActiveSubTab(undefined);
          return;
        }
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'profile') {
          setActiveTab('profile');
          setActiveSubTab(undefined);
          return;
        }
        setActiveTab(tabParam || (currentRole === 'patient' ? 'overview' : 'dashboard'));
        setActiveSubTab(params.get('subtab') || undefined);
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentRole]);

  // Whenever the active role changes upon login, reset the active module tab to default landing tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('tab')) {
      setActiveTab(currentRole === 'patient' ? 'overview' : 'dashboard');
      setActiveSubTab(undefined);
    }
  }, [currentRole]);

  // If a user was viewing access_control and their admin capability was revoked, return immediately to dashboard
  useEffect(() => {
    if (activeTab === 'access_control' && !isAdmin(currentUser, modules)) {
      setActiveTab('dashboard');
      setActiveSubTab(undefined);
    }
  }, [activeTab, currentUser, modules]);

  // If user signed out, display login screen
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // If active role is suspended by the MD, display security lock screen
  if (isRoleSuspended(currentRole)) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center p-6 text-center ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-card dark:shadow-none print:shadow-none space-y-4">
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
            <Button variant="primary" size="sm" onClick={() => logout()}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const executeNavigate = (tab: string, subTab?: string) => {
    if (tab === 'profile') {
      try {
        window.history.pushState({}, '', '/profile');
      } catch {}
    } else {
      try {
        const url = new URL(window.location.href);
        if (url.pathname === '/profile') {
          url.pathname = '/';
        }
        url.searchParams.set('tab', tab);
        if (subTab) {
          url.searchParams.set('subtab', subTab);
        } else {
          url.searchParams.delete('subtab');
        }
        window.history.pushState({}, '', url.pathname + url.search);
      } catch {}
    }
    setActiveTab(tab);
    setActiveSubTab(subTab);
    const mainEl = document.getElementById('main-content');
    if (mainEl && typeof mainEl.scrollTo === 'function') {
      mainEl.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleNavigate = (tab: string, subTab?: string) => {
    if (activeTab === 'profile' && isProfileDirty && tab !== 'profile') {
      setPendingNav({ tab, subTab });
      return;
    }
    executeNavigate(tab, subTab);
  };

  const renderActiveView = () => {
    if (activeTab === 'profile' || (typeof window !== 'undefined' && window.location.pathname.toLowerCase() === '/profile')) {
      return (
        <ProfileView
          onNavigate={handleNavigate}
          onDirtyChange={setIsProfileDirty}
        />
      );
    }

    if (currentRole === 'patient') {
      return <PatientView activeTab={activeSubTab || (activeTab === 'dashboard' ? 'overview' : activeTab)} />;
    }

    if (activeTab === 'dashboard') {
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'doctor' || activeTab === 'role_doctor') {
      if (hasCapability(currentUser, 'consultationWorkstation', modules)) {
        return <DoctorView activeTab={activeSubTab || 'overview'} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'consulting_calendar') {
      if (hasCapability(currentUser, 'consultingCalendar', modules)) {
        return <DoctorView activeTab={activeSubTab || 'overview'} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'role_receptionist' || activeTab === 'receptionist' || activeTab === 'calendar') {
      if (
        hasCapability(currentUser, 'patientRegistration', modules) ||
        hasCapability(currentUser, 'patientCheckIn', modules) ||
        hasCapability(currentUser, 'booking', modules) ||
        hasCapability(currentUser, 'paymentRecording', modules) ||
        isAdmin(currentUser, modules)
      ) {
        return <ReceptionistView activeTab={activeTab === 'calendar' ? 'calendar' : (activeSubTab || 'overview')} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'access_control') {
      if (isAdmin(currentUser, modules)) {
        return <AccessControlView activeTab={activeSubTab || 'modules'} />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'role_patient' || activeTab === 'patient') {
      return <PatientView activeTab={activeSubTab || 'overview'} />;
    }

    if (activeTab === 'admin_billing' || activeTab === 'billing') {
      if (canViewBilling(currentUser, modules)) {
        return <BillingView />;
      }
      return <DashboardView onNavigate={handleNavigate} />;
    }

    if (activeTab === 'attendance') {
      return <AttendanceView activeTab={activeSubTab} />;
    }

    return <DashboardView onNavigate={handleNavigate} />;
  };

  return (
    <SidebarProvider>
      <div className={`h-screen flex flex-col font-sans antialiased overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#fafafa] text-slate-800'}`}>
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:dark:bg-slate-900 focus:text-slate-900 focus:dark:text-slate-100 focus:border focus:border-slate-300 focus:dark:border-slate-700 focus:rounded-lg focus:shadow-modal focus:outline-none text-xs font-semibold"
        >
          Skip to main content
        </a>

        {/* Global polite live region for screen reader announcements */}
        <div
          id="global-status-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        <div className="flex-1 flex overflow-hidden h-full">
          {/* Dynamic Role-specific Sidebar: strictly provides only this role's modules */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => handleNavigate(tab)}
          />

          {/* Content Shell */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Header with profile & logout - pinned at top */}
            <Navbar
              activeTab={activeTab}
              onNavigate={handleNavigate}
            />

            {/* Main View Area - dedicated scrollable container extending full width flush against panels */}
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto [scrollbar-gutter:stable] w-full p-3 sm:px-6 sm:pt-3.5 sm:pb-6 outline-none">
              <ErrorBoundary>
                <PageContainer>
                  {renderActiveView()}
                </PageContainer>
              </ErrorBoundary>
            </main>
          </div>
        </div>

        {/* Discard changes dialog when attempting to navigate away from dirty profile */}
        {pendingNav && (
          <Modal
            isOpen={true}
            onClose={() => setPendingNav(null)}
            title="Discard changes?"
            description="You have unsaved changes to your contact details. Are you sure you want to discard them?"
            maxWidth="sm"
            footer={
              <div className="flex items-center justify-end gap-3 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingNav(null)}
                >
                  Keep editing
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsProfileDirty(false);
                    const target = pendingNav;
                    setPendingNav(null);
                    if (target) {
                      executeNavigate(target.tab, target.subTab);
                    }
                  }}
                >
                  Discard
                </Button>
              </div>
            }
          >
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Any modifications you made will not be saved.
            </p>
          </Modal>
        )}
      </div>
    </SidebarProvider>
  );
};
