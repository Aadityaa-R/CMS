import { User, UserRole, AccessModule } from '@/types';
import { hasCapability, isAdmin, canViewBilling } from '@/lib/permissions';
import { getVisibleWidgets } from '@/lib/dashboardWidgets';
import { SESSION_STORAGE_KEY } from '@/lib/authConstants';
import { isSessionValid } from '@/lib/auth';

export interface AllowedNavItem {
  id: string;
  label: string;
}

export function hasExistingValidSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem('cms_authenticated') === 'true') {
      return true;
    }
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (isSessionValid(session).valid) {
        return true;
      }
    }
  } catch {}
  return false;
}

export function clearRememberedLastPage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = [
      'cms_last_page',
      'cms_last_tab',
      'cms_remembered_tab',
      'cms_remembered_page',
      'last_page',
      'lastPage',
      'last_tab',
      'lastTab',
    ];
    keys.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {}
}

export function hasDashboardAccess(
  role: UserRole,
  user: User | null | undefined,
  modules?: AccessModule[]
): boolean {
  if (role === 'patient') {
    return false;
  }
  if (isAdmin(user, modules)) {
    return true;
  }
  return getVisibleWidgets(user, modules).length > 0;
}

export function getAllowedNavItems(
  role: UserRole,
  user: User | null | undefined,
  modules: AccessModule[] = []
): AllowedNavItem[] {
  if (role === 'patient') {
    return [
      { id: 'overview', label: 'Appointments' },
      { id: 'records', label: 'Records' },
      { id: 'prescriptions', label: 'Prescriptions' },
      { id: 'billing', label: 'Invoices' },
    ];
  }

  const items: AllowedNavItem[] = [];

  if (hasDashboardAccess(role, user, modules)) {
    items.push({ id: 'dashboard', label: 'Dashboard' });
  }

  if (hasCapability(user, 'consultationWorkstation', modules)) {
    items.push({ id: 'doctor', label: 'Consultation Desk' });
  }

  if (
    hasCapability(user, 'patientRegistration', modules) ||
    hasCapability(user, 'patientCheckIn', modules) ||
    hasCapability(user, 'paymentRecording', modules)
  ) {
    items.push({ id: 'role_receptionist', label: 'Reception' });
    items.push({ id: 'patient', label: 'Patient Records' });
  }

  if (canViewBilling(user, modules)) {
    items.push({ id: 'billing', label: 'Billing' });
  }

  if (hasCapability(user, 'administrativeAccess', modules)) {
    items.push({ id: 'access_control', label: 'Administrative' });
  }

  items.push({ id: 'attendance', label: 'Attendance' });

  return items;
}

export function isTabAllowed(
  tab: string | null | undefined,
  role: UserRole,
  user: User | null | undefined,
  modules: AccessModule[] = []
): boolean {
  if (!tab) return false;
  const cleanTab = tab.toLowerCase();

  if (cleanTab === 'profile') return true;

  if (role === 'patient') {
    return [
      'dashboard',
      'overview',
      'appointments',
      'records',
      'prescriptions',
      'billing',
      'invoices',
    ].includes(cleanTab);
  }

  if (cleanTab === 'dashboard') {
    return hasDashboardAccess(role, user, modules);
  }

  if (cleanTab === 'doctor' || cleanTab === 'role_doctor') {
    return hasCapability(user, 'consultationWorkstation', modules);
  }

  if (cleanTab === 'consulting_calendar') {
    return hasCapability(user, 'consultingCalendar', modules);
  }

  if (
    cleanTab === 'role_receptionist' ||
    cleanTab === 'receptionist' ||
    cleanTab === 'calendar'
  ) {
    return (
      hasCapability(user, 'patientRegistration', modules) ||
      hasCapability(user, 'patientCheckIn', modules) ||
      hasCapability(user, 'booking', modules) ||
      hasCapability(user, 'paymentRecording', modules) ||
      isAdmin(user, modules)
    );
  }

  if (cleanTab === 'patient' || cleanTab === 'role_patient') {
    return (
      hasCapability(user, 'patientRegistration', modules) ||
      hasCapability(user, 'patientCheckIn', modules) ||
      hasCapability(user, 'paymentRecording', modules) ||
      isAdmin(user, modules)
    );
  }

  if (cleanTab === 'billing' || cleanTab === 'admin_billing') {
    return canViewBilling(user, modules);
  }

  if (cleanTab === 'access_control') {
    return isAdmin(user, modules);
  }

  if (cleanTab === 'attendance') {
    return true;
  }

  return false;
}

export function getPageTitle(tab: string, role: UserRole): string {
  if (role === 'patient') {
    if (tab === 'dashboard' || tab === 'overview') return 'My Health Portal';
    if (tab === 'records') return 'Records';
    if (tab === 'prescriptions') return 'Prescriptions';
    if (tab === 'billing' || tab === 'invoices') return 'Invoices';
    if (tab === 'profile') return 'My Profile';
    return 'My Health Portal';
  }

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    doctor: 'Consultation Desk',
    role_doctor: 'Consultation Desk',
    consulting_calendar: 'Consulting Calendar',
    receptionist: 'Reception',
    role_receptionist: 'Reception',
    calendar: 'Reception',
    patient: 'Patient Records',
    role_patient: 'Patient Records',
    billing: 'Billing',
    admin_billing: 'Billing',
    access_control: 'Administrative',
    attendance: 'Attendance',
    profile: 'My Profile',
  };

  return titles[tab] || 'Dashboard';
}

