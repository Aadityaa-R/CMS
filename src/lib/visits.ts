import { Visit, Patient, Appointment, User, AccessModule, PatientAssignment } from '@/types';
import { getAssignedDoctorId, isAdmin } from './permissions';
import { isSameStaff } from './staffIds';

/**
 * Migrates existing patient previousVitals and completed appointments into Visit records.
 */
export function migrateExistingVisits(
  patients: Patient[],
  appointments: Appointment[]
): Visit[] {
  const visits: Visit[] = [];
  const visitedKeys = new Set<string>();

  // 1. Completed appointments
  const completedApts = appointments.filter((a) => a.status === 'completed');
  for (const apt of completedApts) {
    const dateKey = `${apt.patientId}-${(apt.dateTime || '').split('T')[0]}`;
    visitedKeys.add(dateKey);
    visits.push({
      id: `visit-apt-${apt.id}`,
      patientId: apt.patientId,
      appointmentId: apt.id,
      doctorId: apt.doctorId,
      date: apt.dateTime,
      reason: apt.reasonForVisit || 'Consultation',
      vitals: {
        systolicBp: 120 + ((visits.length * 3) % 18),
        diastolicBp: 80 + ((visits.length * 2) % 10),
        heartRateBpm: 70 + ((visits.length * 4) % 16),
        oxygenSaturationPct: 98 - (visits.length % 2),
        temperatureCelsius: Number((36.6 + (visits.length % 4) * 0.1).toFixed(1)),
      },
      notes: apt.notes || 'Consultation completed. Clinical triage and management plan documented.',
    });
  }

  // 2. Patient previousVitals
  for (const p of patients) {
    if (p.previousVitals) {
      const date = p.previousVitals.recordedAt || p.lastVisitDate || new Date().toISOString();
      const dateKey = `${p.id}-${date.split('T')[0]}`;
      if (!visitedKeys.has(dateKey)) {
        visitedKeys.add(dateKey);
        visits.push({
          id: `visit-prev-${p.id}`,
          patientId: p.id,
          doctorId: 'doc-1',
          date,
          reason: p.chronicConditions?.[0]
            ? `Follow-up for ${p.chronicConditions[0]}`
            : 'Clinical examination and review',
          vitals: {
            systolicBp: p.previousVitals.systolicBp ?? 120,
            diastolicBp: p.previousVitals.diastolicBp ?? 80,
            heartRateBpm: p.previousVitals.heartRateBpm ?? 72,
            oxygenSaturationPct: p.previousVitals.oxygenSaturationPct ?? 98,
            temperatureCelsius: p.previousVitals.temperatureCelsius ?? 36.8,
          },
          notes: 'Routine clinical assessment. Vitals reviewed.',
        });
      }
    }
  }

  return visits;
}

/**
 * Scopes visits based on user permissions:
 * - Admin: sees all visits.
 * - Receptionist: sees all visits.
 * - Doctor: sees their own patients' visits plus visits they authored.
 * - Patient: sees only their own visits (notes stripped).
 */
export function getScopedVisits(
  currentUser: User | null | undefined,
  visits: Visit[],
  assignments: PatientAssignment[],
  modules: AccessModule[] = []
): Visit[] {
  if (!currentUser) return [];

  if (currentUser.role === 'patient') {
    return visits
      .filter(
        (v) =>
          v.patientId === currentUser.patientId ||
          v.patientId === currentUser.badgeNumber ||
          currentUser.id === `usr-${v.patientId}` ||
          currentUser.id === v.patientId
      )
      .map((v) => ({ ...v, notes: undefined })); // Notes stay doctor-only
  }

  if (isAdmin(currentUser, modules) || currentUser.role === 'receptionist') {
    return visits;
  }

  // Doctor role: assigned patients or authored visits
  return visits.filter((v) => {
    const assignedDocId = getAssignedDoctorId(v.patientId, assignments);
    if (assignedDocId && isSameStaff(assignedDocId, currentUser)) return true;
    return isSameStaff(v.doctorId, currentUser);
  });
}

/**
 * Format plain text change delta against previous value.
 * e.g. +4, -2, +0.3
 */
export function formatDelta(current: number | undefined, prev: number | undefined, decimals = 0): string | null {
  if (current === undefined || prev === undefined || isNaN(current) || isNaN(prev)) {
    return null;
  }
  const diff = decimals > 0
    ? Number((current - prev).toFixed(decimals))
    : Math.round(current - prev);

  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return '0';
}

