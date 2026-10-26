import { StandardCapability, AccessModule, User } from '@/types';
import { hasCapability, isAdmin } from '@/lib/permissions';

export type DashboardWidgetId =
  | 'summary_figures'
  | 'patients_and_visits_chart'
  | 'fees_and_payments_chart'
  | 'today_appointments'
  | 'needs_attention'
  | 'staff_presence'
  | 'my_attendance'
  | 'front_desk_today'
  | 'front_desk';

export interface DashboardWidgetDef {
  id: DashboardWidgetId;
  title: string;
  requiredAccesses: StandardCapability[];
  description: string;
}

/**
 * Dashboard Widget Registry.
 *
 * Each widget declares the capability accesses it requires (any one match is sufficient).
 * Widgets are gated strictly by capability accesses, never by job title or role strings.
 *
 * Note: "Follow-ups Due" is omitted because no structured target follow-up date data
 * source exists on completed clinical visits or appointments in the clinical schema.
 */
export const DASHBOARD_WIDGET_REGISTRY: DashboardWidgetDef[] = [
  {
    id: 'summary_figures',
    title: 'Clinic Summary',
    requiredAccesses: [
      'administrativeAccess',
      'consultationWorkstation',
      'patientRegistration',
      'patientCheckIn',
      'paymentRecording',
    ],
    description: 'Summary figures for patients, clinical visits, appointments, and billing totals.',
  },
  {
    id: 'front_desk_today',
    title: 'Front Desk Today',
    requiredAccesses: ['patientCheckIn', 'patientRegistration'],
    description: 'Operational figures for waiting patients, in-consultation, and arrivals today.',
  },
  {
    id: 'patients_and_visits_chart',
    title: 'Patients and Visits',
    requiredAccesses: ['administrativeAccess', 'consultationWorkstation'],
    description: 'Grouped bar chart showing new patient registrations and completed clinical visits.',
  },
  {
    id: 'fees_and_payments_chart',
    title: 'Fees and Payments',
    requiredAccesses: ['administrativeAccess', 'paymentRecording'],
    description: 'Line chart comparing fees billed against settled payment collections.',
  },
  {
    id: 'today_appointments',
    title: "Today's Appointments",
    requiredAccesses: [
      'administrativeAccess',
      'consultationWorkstation',
      'patientCheckIn',
      'patientRegistration',
    ],
    description: "Scheduled and checked-in patient appointments for today's clinic session.",
  },
  {
    id: 'needs_attention',
    title: 'Needs Attention',
    requiredAccesses: [
      'administrativeAccess',
      'attendanceManagement',
      'patientRegistration',
      'patientCheckIn',
      'paymentRecording',
    ],
    description: 'Actionable items requiring review across clearances, leave, links, rescheduling, and billing.',
  },
  {
    id: 'staff_presence',
    title: 'Staff Presence',
    requiredAccesses: ['administrativeAccess', 'attendanceManagement'],
    description: 'Real-time staff attendance counts and roster status for scheduled duty shifts.',
  },
  {
    id: 'my_attendance',
    title: 'My Attendance',
    requiredAccesses: [], // Available to all staff accounts
    description: "Personal daily clock-in/out status, duty hours worked, and shift time tracker.",
  },
  {
    id: 'front_desk',
    title: 'Front Desk',
    requiredAccesses: ['patientCheckIn', 'patientRegistration'],
    description: 'Front desk calendar dashboard with appointment calendar, walk-in sheet, and queue summaries.',
  },
];

/**
 * Returns true if the user qualifies for the specified widget based on their accesses.
 * If requiredAccesses is empty, any non-patient staff account qualifies.
 */
export function canViewWidget(
  widgetId: DashboardWidgetId,
  user: User | null | undefined,
  modules?: AccessModule[]
): boolean {
  if (!user) return false;
  if (user.role === 'patient') return false;

  const widget = DASHBOARD_WIDGET_REGISTRY.find((w) => w.id === widgetId);
  if (!widget) return false;

  if (widget.requiredAccesses.length === 0) {
    // Available to all staff accounts
    return true;
  }

  // Administrator qualifies for all widgets
  if (isAdmin(user, modules)) {
    return true;
  }

  // Any matching required capability qualifies
  return widget.requiredAccesses.some((cap) => hasCapability(user, cap, modules));
}

/**
 * Returns the list of all widget definitions that the user qualifies to see.
 */
export function getVisibleWidgets(
  user: User | null | undefined,
  modules?: AccessModule[]
): DashboardWidgetDef[] {
  if (!user || user.role === 'patient') return [];
  return DASHBOARD_WIDGET_REGISTRY.filter((w) => canViewWidget(w.id, user, modules));
}

export type DashboardLayoutMode = 'front_desk_only' | 'standard_with_front_desk' | 'standard';

export function getDashboardLayout(
  user: User | null | undefined,
  modules?: AccessModule[]
): DashboardLayoutMode {
  if (!user || user.role === 'patient') return 'standard';

  const hasFrontDeskAccess =
    hasCapability(user, 'patientCheckIn', modules) ||
    hasCapability(user, 'patientRegistration', modules);

  const hasAdminOrClinical =
    isAdmin(user, modules) ||
    hasCapability(user, 'administrativeAccess', modules) ||
    hasCapability(user, 'consultationWorkstation', modules);

  if (hasFrontDeskAccess && !hasAdminOrClinical) {
    return 'front_desk_only';
  }

  if (hasFrontDeskAccess) {
    return 'standard_with_front_desk';
  }

  return 'standard';
}
