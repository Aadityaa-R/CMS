import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Patient,
  Doctor,
  Appointment,
  AppointmentStatus,
  VitalSigns,
  Prescription,
  LabTest,
  LabTestStatus,
  Invoice,
  PaymentMethod,
  PatientAssignment,
  User,
  AccessModule,
  StandardCapability,
  AppointmentSource,
} from '@/types';
import {
  isAdmin,
  canTransferPatient,
  canRegisterPatient,
  canCheckIn,
  canBookAppointment,
  getAssignedDoctorId,
  hasCapability,
  canDeleteModule,
  canIncludeAccess,
  canRemoveAccess,
  canAddMember,
  canRemoveMember,
  canPrescribe,
  canCancelPrescription,
} from '@/lib/permissions';
import { isDoctorAvailable, getStoredAttendanceData } from '@/lib/availability';
import {
  bookAppointment as bookAppointmentHelper,
  cancelAppointment as cancelAppointmentHelper,
  rescheduleAppointment as rescheduleAppointmentHelper,
  validateBooking,
} from '@/lib/scheduling';
import { getNextTokenNumberForDate } from '@/lib/reception';
import { buildInvoiceForVisit } from '@/lib/billing';
import { validatePrescription } from '@/lib/prescribing';
import { Medicine } from '@/types/prescribing';
import { formatDoctorName } from '@/lib/doctorNames';
import { formatLocalDate } from '@/lib/time';
import {
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_VITALS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_LAB_TESTS,
  INITIAL_INVOICES,
  INITIAL_PATIENT_ASSIGNMENTS,
  INITIAL_MODULES,
} from '@/data/mockData';
import { INITIAL_FORMULARY } from '@/data/formularySeed';
import { ACCESS_CATALOG, AccessItem, registerCustomAccess } from '@/data/accessCatalog';
import { getRepository } from '@/data/storage';
import { STORAGE_KEY_PREFIX } from '@/lib/authConstants';
import { useAuth } from '@/context/AuthContext';

export interface RegistrationResult {
  success: boolean;
  error?: string;
  patient?: Patient;
}

export interface CheckInResult {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

export interface BookingResult {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

export interface TransferResult {
  success: boolean;
  error?: string;
  movedAppointmentsCount: number;
  movedAppointmentIds: string[];
  isInitialAssignment: boolean;
}

export interface ModuleMutationResult {
  success: boolean;
  error?: string;
  module?: AccessModule;
}

interface ClinicContextType {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  vitals: VitalSigns[];
  prescriptions: Prescription[];
  labTests: LabTest[];
  invoices: Invoice[];
  patientAssignments: PatientAssignment[];
  modules: AccessModule[];
  medicines: Medicine[];

  // Patient Actions
  addPatient: (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ) => Patient;
  registerPatient: (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ) => RegistrationResult;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  transferPatient: (
    patientId: string,
    toDoctorId: string,
    reason: string,
    actingUserId?: string,
    actingUserName?: string,
    actingUser?: User | null
  ) => TransferResult;

  // Doctor Actions
  addDoctor: (data: Omit<Doctor, 'id'>) => Doctor;
  updateDoctorStatus: (id: string, status: 'active' | 'on_leave' | 'inactive') => void;

  // Appointment Actions
  addAppointment: (data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>) => Appointment;
  checkInAppointment: (
    appointmentId: string,
    actingUser?: User | null,
    dateOverride?: string
  ) => CheckInResult;
  checkInWalkIn: (
    params: {
      patientId: string;
      doctorId: string;
      reasonForVisit: string;
      isNewPatient?: boolean;
    },
    actingUser?: User | null,
    dateOverride?: string
  ) => CheckInResult;
  bookAppointment: (
    data: {
      patientId: string;
      doctorId: string;
      dateTime: string;
      reasonForVisit: string;
      durationMinutes?: number;
      source?: AppointmentSource;
    },
    actingUser?: User | null
  ) => BookingResult;
  cancelAppointmentAction: (
    appointmentId: string,
    actingUser?: User | null,
    reason?: string
  ) => { success: boolean; error?: string; appointment?: Appointment };
  rescheduleAppointmentAction: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    actingUser?: User | null
  ) => { success: boolean; error?: string; newAppointment?: Appointment };
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  updateAppointmentStatus: (
    id: string,
    status: AppointmentStatus,
    actingUser?: User | null
  ) => void;
  updateAppointmentNotes: (id: string, notes: string) => void;

  // Vitals Actions
  recordVitals: (data: Omit<VitalSigns, 'id' | 'recordedAt'>) => VitalSigns;
  saveVitals: (
    patientId: string,
    data: Partial<VitalSigns> & { recordedBy?: string; recordedByName?: string }
  ) => VitalSigns;

  // Prescription Actions
  createPrescription: (
    data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>,
    actingUser?: User | null
  ) => { success: boolean; prescription?: Prescription; error?: string };
  cancelPrescription: (
    prescriptionId: string,
    reason: string,
    actingUser?: User | null
  ) => Promise<{ success: boolean; error?: string }>;
  dispensePrescriptionItem: (prescriptionId: string, itemId: string, pharmacistName: string) => void;

  // Formulary Actions
  addMedicine: (
    medicine: Omit<Medicine, 'id'>,
    actingUser?: User | null
  ) => Promise<{ success: boolean; medicine?: Medicine; error?: string }>;
  updateMedicine: (
    id: string,
    updates: Partial<Medicine>,
    actingUser?: User | null
  ) => Promise<{ success: boolean; medicine?: Medicine; error?: string }>;
  toggleMedicineStatus: (
    id: string,
    actingUser?: User | null
  ) => Promise<{ success: boolean; active?: boolean; error?: string }>;

  // Lab Test Actions
  createLabTest: (data: Omit<LabTest, 'id' | 'testOrderNumber' | 'orderedAt' | 'status'>) => LabTest;
  updateLabTestStatus: (
    id: string,
    status: LabTestStatus,
    extra?: { result?: string; notes?: string; technicianName?: string }
  ) => void;

  // Billing Actions
  createInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'status'>) => Invoice;
  recordPayment: (id: string, amount: number, method: PaymentMethod) => void;

  // Module Actions
  createModule: (
    name: string,
    description?: string,
    initialAccessIds?: StandardCapability[],
    actingUser?: User | null
  ) => ModuleMutationResult;
  renameModule: (
    id: string,
    name: string,
    description?: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  deleteModule: (
    id: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  includeAccess: (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ) => ModuleMutationResult;
  removeAccess: (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ) => ModuleMutationResult;
  addMember: (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  removeMember: (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ) => ModuleMutationResult;
  accessCatalog: AccessItem[];
  createAccess: (
    label: string,
    description: string,
    actingUser?: User | null
  ) => { success: boolean; error?: string; accessItem?: AccessItem };
}

export const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser: authUser, staffAccessList, addAuditLogEntry } = useAuth();
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [vitals, setVitals] = useState<VitalSigns[]>(INITIAL_VITALS);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [labTests, setLabTests] = useState<LabTest[]>(INITIAL_LAB_TESTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [patientAssignments, setPatientAssignments] = useState<PatientAssignment[]>(INITIAL_PATIENT_ASSIGNMENTS);
  const [modules, setModules] = useState<AccessModule[]>(INITIAL_MODULES);
  const [medicines, setMedicines] = useState<Medicine[]>(INITIAL_FORMULARY);

  // Load from repository on startup
  useEffect(() => {
    const loadRepo = async () => {
      try {
        const repoPatients = getRepository<Patient>('patients');
        const repoAppointments = getRepository<Appointment>('appointments');
        const repoPrescriptions = getRepository<Prescription>('prescriptions');
        const repoInvoices = getRepository<Invoice>('invoices');
        const repoAssignments = getRepository<PatientAssignment>('assignments');
        const repoRoles = getRepository<AccessModule>('roles');
        const repoFormulary = getRepository<Medicine>('formulary');

        const [pats, apts, rxs, invs, asgns, rols, meds] = await Promise.all([
          repoPatients.list(),
          repoAppointments.list(),
          repoPrescriptions.list(),
          repoInvoices.list(),
          repoAssignments.list(),
          repoRoles.list(),
          repoFormulary.list(),
        ]);

        if (pats.length > 0) setPatients(pats);
        if (apts.length > 0) setAppointments(apts);
        if (rxs.length > 0) setPrescriptions(rxs);
        if (invs.length > 0) setInvoices(invs);
        if (asgns.length > 0) setPatientAssignments(asgns);
        if (rols.length > 0) setModules(rols);
        if (meds.length > 0) setMedicines(meds);
      } catch {
        // Fallback
      }
    };
    loadRepo();
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === `${STORAGE_KEY_PREFIX}patients`) {
        const repo = getRepository<Patient>('patients');
        setPatients(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}appointments`) {
        const repo = getRepository<Appointment>('appointments');
        setAppointments(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}prescriptions`) {
        const repo = getRepository<Prescription>('prescriptions');
        setPrescriptions(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}assignments`) {
        const repo = getRepository<PatientAssignment>('assignments');
        setPatientAssignments(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}roles`) {
        const repo = getRepository<AccessModule>('roles');
        setModules(await repo.list());
      }
      if (e.key === `${STORAGE_KEY_PREFIX}formulary`) {
        const repo = getRepository<Medicine>('formulary');
        setMedicines(await repo.list());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Write-through to repositories
  useEffect(() => {
    if (patients.length > 0) {
      getRepository<Patient>('patients').replaceAll(patients).catch(() => {});
    }
  }, [patients]);

  useEffect(() => {
    if (appointments.length > 0) {
      getRepository<Appointment>('appointments').replaceAll(appointments).catch(() => {});
    }
  }, [appointments]);

  useEffect(() => {
    if (prescriptions.length > 0) {
      getRepository<Prescription>('prescriptions').replaceAll(prescriptions).catch(() => {});
    }
  }, [prescriptions]);

  useEffect(() => {
    if (patientAssignments.length > 0) {
      getRepository<PatientAssignment>('assignments').replaceAll(patientAssignments).catch(() => {});
    }
  }, [patientAssignments]);

  useEffect(() => {
    if (medicines.length > 0) {
      getRepository<Medicine>('formulary').replaceAll(medicines).catch(() => {});
    }
  }, [medicines]);

  useEffect(() => {
    if (modules.length > 0) {
      getRepository<AccessModule>('roles').replaceAll(modules).catch(() => {});
      try {
        sessionStorage.setItem('cms_modules_v2', JSON.stringify(modules));
      } catch {
        // fallback
      }
    }
  }, [modules]);

  const [customAccesses, setCustomAccesses] = useState<AccessItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('cms_custom_accesses_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: AccessItem) => registerCustomAccess(item));
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const accessCatalog: AccessItem[] = React.useMemo(() => {
    return [...ACCESS_CATALOG];
  }, [customAccesses]);

  const transferPatient = (
    patientId: string,
    toDoctorId: string,
    reason: string,
    actingUserId?: string,
    actingUserName?: string,
    actingUser?: User | null
  ): TransferResult => {
    // 1. Block transfer if patient has an appointment in_consultation
    const inConsultationApt = appointments.find(
      (a) => a.patientId === patientId && a.status === 'in_consultation'
    );
    if (inConsultationApt) {
      return {
        success: false,
        error: 'Conclude the current consultation before transferring.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment: false,
      };
    }

    const currentDocId = getAssignedDoctorId(patientId, patientAssignments);
    const isInitialAssignment = !currentDocId;

    // 2. Receiving doctor must be different from current doctor
    if (currentDocId && toDoctorId === currentDocId) {
      return {
        success: false,
        error: 'Receiving doctor must be different from current doctor.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment,
      };
    }

    // 3. Receiving doctor must be an active doctor with consultationWorkstation capability
    const targetDoctor = doctors.find((d) => d.id === toDoctorId);
    if (!targetDoctor || targetDoctor.status !== 'active') {
      return {
        success: false,
        error: 'Receiving doctor must be an active doctor.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment,
      };
    }

    if (!hasCapability(targetDoctor, 'consultationWorkstation')) {
      return {
        success: false,
        error: 'Receiving doctor must have consultation workstation capability.',
        movedAppointmentsCount: 0,
        movedAppointmentIds: [],
        isInitialAssignment,
      };
    }

    // 4. Authorization check if actingUser passed
    if (actingUser) {
      if (isInitialAssignment) {
        if (!isAdmin(actingUser)) {
          return {
            success: false,
            error: 'Only clinic administrators can assign unassigned patients.',
            movedAppointmentsCount: 0,
            movedAppointmentIds: [],
            isInitialAssignment,
          };
        }
      } else {
        if (!canTransferPatient(actingUser, patientId, patientAssignments)) {
          return {
            success: false,
            error: 'Unauthorized to transfer patient care.',
            movedAppointmentsCount: 0,
            movedAppointmentIds: [],
            isInitialAssignment,
          };
        }
      }
    }

    // 5. Identify open appointments to move: ONLY scheduled and checked_in (NOT in_consultation, NOT completed)
    const movedApts = appointments.filter(
      (apt) =>
        apt.patientId === patientId &&
        (apt.status === 'scheduled' || apt.status === 'checked_in')
    );
    const movedAppointmentIds = movedApts.map((a) => a.id);
    const movedAppointmentsCount = movedAppointmentIds.length;

    const timestamp = new Date().toISOString();
    const doctorName = targetDoctor.name;
    const department = targetDoctor.department || 'General Medicine';

    // 6. Close current active assignment and create new one
    setPatientAssignments((prev) => {
      const closed = prev.map((a) =>
        a.patientId === patientId && a.to === null ? { ...a, to: timestamp } : a
      );
      const newAsgn: PatientAssignment = {
        id: `asgn-${Date.now()}`,
        patientId,
        doctorId: toDoctorId,
        doctorName,
        from: timestamp,
        to: null,
        transferredBy: actingUserName
          ? `${actingUserName}${actingUserId ? ` (${actingUserId})` : ''}`
          : actingUserId || 'System',
        reason: reason.trim(),
      };
      return [...closed, newAsgn];
    });

    // 7. Move scheduled and checked_in appointments to receiving doctor
    if (movedAppointmentIds.length > 0) {
      setAppointments((prev) =>
        prev.map((apt) => {
          if (movedAppointmentIds.includes(apt.id)) {
            return {
              ...apt,
              doctorId: toDoctorId,
              doctorName,
              department,
            };
          }
          return apt;
        })
      );
    }

    return {
      success: true,
      movedAppointmentsCount,
      movedAppointmentIds,
      isInitialAssignment,
    };
  };

  const registerPatient = (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ): RegistrationResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (actor && !canRegisterPatient(actor, modules) && !isAdmin(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Patient registration capability required.',
      };
    }

    const now = new Date();
    const dateStr = formatLocalDate(now);
    const nowIso = now.toISOString();
    const newId = `pat-${patients.length + 1}`;
    const newMrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPatient: Patient = {
      ...data,
      id: newId,
      mrn: newMrn,
      registeredDate: dateStr,
      registeredAt: nowIso,
      registeredBy: actor ? { id: actor.id, name: actor.name } : null,
      status: 'active',
    };

    setPatients((prev) => [newPatient, ...prev]);

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: `${newPatient.firstName} ${newPatient.lastName}`,
        targetUserId: newPatient.id,
        action: 'patient_registered',
        description: `Patient enrolled at reception with MRN ${newMrn} by ${actor?.name || 'Reception Staff'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Front Desk Coordination',
      });
    }

    return {
      success: true,
      patient: newPatient,
    };
  };

  const addPatient = (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ): Patient => {
    const result = registerPatient(data, actingUser);
    if (!result.success || !result.patient) {
      throw new Error(result.error || 'Failed to register patient.');
    }
    return result.patient;
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const addDoctor = (data: Omit<Doctor, 'id'>): Doctor => {
    const newId = `doc-${doctors.length + 1}`;
    const newDoc: Doctor = {
      ...data,
      id: newId,
    };
    setDoctors((prev) => [...prev, newDoc]);
    return newDoc;
  };

  const updateDoctorStatus = (id: string, status: 'active' | 'on_leave' | 'inactive') => {
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  };

  const checkInAppointment = (
    appointmentId: string,
    actingUser?: User | null,
    dateOverride?: string
  ): CheckInResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (actor && !canCheckIn(actor, modules) && !isAdmin(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Patient check-in capability required.',
      };
    }

    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (apt.status === 'in_consultation' || apt.status === 'completed') {
      return {
        success: false,
        error: `Appointment is already ${apt.status.replace('_', ' ')}.`,
      };
    }

    const todayStr = dateOverride || formatLocalDate();

    // Doctor availability check
    if (!isDoctorAvailable(apt.doctorId, todayStr)) {
      return {
        success: false,
        error: 'Assigned doctor is not available today. Reassignment requires an administrator.',
      };
    }

    const nextToken = getNextTokenNumberForDate(appointments, todayStr);
    const nowIso = new Date().toISOString();

    // Auto-assignment for unassigned patients upon booked arrival
    const existingAsgn = patientAssignments.find(
      (a) => a.patientId === apt.patientId && a.to === null
    );
    if (!existingAsgn) {
      const doc = doctors.find((d) => d.id === apt.doctorId) || {
        id: apt.doctorId,
        name: apt.doctorName,
        department: apt.department || 'General Medicine',
      };
      const newAsgn: PatientAssignment = {
        id: `asgn-${Date.now()}`,
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        doctorName: doc.name,
        from: nowIso,
        to: null,
        transferredBy: actor?.name || 'Reception Staff',
        reason: 'Initial assignment upon online booked check-in',
      };
      setPatientAssignments((prev) => [...prev, newAsgn]);
    }

    const updatedApt: Appointment = {
      ...apt,
      status: 'checked_in',
      tokenNumber: nextToken,
      checkedInAt: nowIso,
      checkedInBy: actor ? { id: actor.id, name: actor.name } : null,
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? updatedApt : a))
    );

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: apt.patientName,
        targetUserId: apt.patientId,
        action: 'patient_checked_in',
        description: `Patient checked in with Token #${nextToken} for ${formatDoctorName(apt.doctorName)} by ${actor?.name || 'Reception Staff'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Front Desk Coordination',
      });
    }

    return { success: true, appointment: updatedApt };
  };

  const checkInWalkIn = (
    params: {
      patientId: string;
      doctorId: string;
      reasonForVisit: string;
      isNewPatient?: boolean;
    },
    actingUser?: User | null,
    dateOverride?: string
  ): CheckInResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (actor && !canCheckIn(actor, modules) && !isAdmin(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Patient check-in capability required.',
      };
    }

    const pat = patients.find((p) => p.id === params.patientId);
    if (!pat) {
      return { success: false, error: 'Patient not found.' };
    }

    const todayStr = dateOverride || formatLocalDate();

    let targetDocId = params.doctorId;
    if (!params.isNewPatient) {
      const assignedDocId = getAssignedDoctorId(params.patientId, patientAssignments);
      if (!assignedDocId) {
        return {
          success: false,
          error: 'Patient has no assigned doctor. Assignment requires an administrator.',
        };
      }
      targetDocId = assignedDocId;
    }

    // Doctor availability check
    if (!isDoctorAvailable(targetDocId, todayStr)) {
      return {
        success: false,
        error: 'Assigned doctor is not available today. Reassignment requires an administrator.',
      };
    }

    const doc = doctors.find((d) => d.id === targetDocId) || {
      id: targetDocId,
      name: 'Consulting Physician',
      department: 'General Medicine',
    };

    // If new patient, create initial assignment if none exists
    if (params.isNewPatient) {
      const existingAsgn = patientAssignments.find(
        (a) => a.patientId === params.patientId && a.to === null
      );
      if (!existingAsgn) {
        const newAsgn: PatientAssignment = {
          id: `asgn-${Date.now()}`,
          patientId: params.patientId,
          doctorId: targetDocId,
          doctorName: doc.name,
          from: new Date().toISOString(),
          to: null,
          transferredBy: actor?.name || 'Reception Staff',
          reason: 'Initial assignment upon walk-in intake',
        };
        setPatientAssignments((prev) => [...prev, newAsgn]);
      }
    }

    const nextToken = getNextTokenNumberForDate(appointments, todayStr);
    const nowIso = new Date().toISOString();
    const appointmentNumber = `APT-2026-${String(nextToken).padStart(3, '0')}`;

    const newApt: Appointment = {
      id: `apt-walkin-${Date.now()}`,
      appointmentNumber,
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientPhone: pat.phone,
      doctorId: targetDocId,
      doctorName: doc.name,
      department: doc.department || 'General Medicine',
      dateTime: nowIso,
      durationMinutes: 30,
      status: 'checked_in',
      reasonForVisit: params.reasonForVisit.trim() || 'Walk-in consultation',
      tokenNumber: nextToken,
      source: 'walk_in',
      checkedInAt: nowIso,
      checkedInBy: actor ? { id: actor.id, name: actor.name } : null,
    };

    setAppointments((prev) => [newApt, ...prev]);

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: newApt.patientName,
        targetUserId: newApt.patientId,
        action: 'walkin_checked_in',
        description: `Walk-in patient admitted with Token #${nextToken} for ${formatDoctorName(newApt.doctorName)} by ${actor?.name || 'Reception Staff'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Front Desk Coordination',
      });
    }

    return { success: true, appointment: newApt };
  };

  const bookAppointment = (
    data: {
      patientId: string;
      doctorId: string;
      dateTime: string;
      reasonForVisit: string;
      durationMinutes?: number;
      source?: AppointmentSource;
    },
    actingUser?: User | null
  ): BookingResult => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    const isPatientSelf =
      actor?.role === 'patient' &&
      (actor.patientId === data.patientId || actor.id === data.patientId || data.patientId === 'pat-1');

    if (!isPatientSelf && actor && !canBookAppointment(actor, modules) && !isAdmin(actor, modules)) {
      return {
        success: false,
        error: 'Unauthorized: Booking capability required.',
      };
    }

    const pat = patients.find((p) => p.id === data.patientId);
    if (!pat) {
      return { success: false, error: 'Patient not found.' };
    }

    const doc = doctors.find((d) => d.id === data.doctorId) || {
      id: data.doctorId,
      name: 'Consulting Physician',
      department: 'General Medicine',
    };

    const date = data.dateTime.slice(0, 10);
    const time = data.dateTime.slice(11, 16) || '09:00';
    const now = new Date();

    const attendanceData = getStoredAttendanceData();
    const val = validateBooking(
      data.doctorId,
      date,
      time,
      data.patientId,
      appointments,
      attendanceData.shifts,
      attendanceData.leaves,
      now
    );

    if (!val.allowed) {
      return {
        success: false,
        error: val.reason || 'Booking validation failed.',
      };
    }

    const newApt = bookAppointmentHelper(
      {
        patientId: pat.id,
        patientName: `${pat.firstName} ${pat.lastName}`,
        patientPhone: pat.phone,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department || 'General Medicine',
        date,
        time,
        reasonForVisit: data.reasonForVisit,
        source: data.source || (actor?.role === 'patient' ? 'web' : 'reception'),
        bookedBy: actor ? { id: actor.id, name: actor.name } : null,
      },
      appointments,
      now
    );

    setAppointments((prev) => [newApt, ...prev]);

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: newApt.patientName,
        targetUserId: newApt.patientId,
        action: 'appointment_scheduled',
        description: `Consultation booked on ${data.dateTime.replace('T', ' ')} with Dr. ${newApt.doctorName} by ${actor?.name || 'Patient'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Online Portal Booking',
      });
    }

    return { success: true, appointment: newApt };
  };

  const cancelAppointmentAction = (
    appointmentId: string,
    actingUser?: User | null,
    reason?: string
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    const actor = actingUser !== undefined ? actingUser : authUser;
    const now = new Date();
    const res = cancelAppointmentHelper(apt, actor, now, reason);
    if (!res.success || !res.appointment) {
      return { success: false, error: res.error || 'Failed to cancel appointment.' };
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? res.appointment! : a))
    );

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: apt.patientName,
        targetUserId: apt.patientId,
        action: 'appointment_cancelled',
        description: `Appointment ${apt.appointmentNumber} cancelled: ${reason || 'Cancelled by user'}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Self-service cancellation',
      });
    }

    return { success: true, appointment: res.appointment };
  };

  const rescheduleAppointmentAction = (
    appointmentId: string,
    newDate: string,
    newTime: string,
    actingUser?: User | null
  ): { success: boolean; error?: string; newAppointment?: Appointment } => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    const actor = actingUser !== undefined ? actingUser : authUser;
    const now = new Date();
    const attendanceData = getStoredAttendanceData();

    const res = rescheduleAppointmentHelper(
      apt,
      newDate,
      newTime,
      actor,
      appointments,
      attendanceData.shifts,
      attendanceData.leaves,
      now
    );

    if (!res.success || !res.newAppointment || !res.cancelledAppointment) {
      return { success: false, error: res.error || 'Failed to reschedule appointment.' };
    }

    setAppointments((prev) => [
      res.newAppointment!,
      ...prev.map((a) => (a.id === appointmentId ? res.cancelledAppointment! : a)),
    ]);

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: apt.patientName,
        targetUserId: apt.patientId,
        action: 'appointment_rescheduled',
        description: `Appointment ${apt.appointmentNumber} rescheduled to ${newDate} at ${newTime}`,
        authorizedBy: actor ? `${actor.name} (${actor.title || actor.role})` : 'Self-service rescheduling',
      });
    }

    return { success: true, newAppointment: res.newAppointment };
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const addAppointment = (
    data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>
  ): Appointment => {
    const todayStr = data.dateTime ? data.dateTime.slice(0, 10) : formatLocalDate();
    const newId = `apt-${appointments.length + 1}`;
    const tokenNumber = data.status === 'checked_in' ? getNextTokenNumberForDate(appointments, todayStr) : 0;
    const appointmentNumber = `APT-2026-${String(appointments.length + 1).padStart(3, '0')}`;
    const newApt: Appointment = {
      ...data,
      id: newId,
      appointmentNumber,
      tokenNumber,
      source: data.source || 'reception',
    };
    setAppointments((prev) => [newApt, ...prev]);
    return newApt;
  };

  const updateAppointmentStatus = (
    id: string,
    status: AppointmentStatus,
    actingUser?: User | null
  ) => {
    const actor = actingUser !== undefined ? actingUser : authUser;
    if (status === 'checked_in') {
      if (actor && !canCheckIn(actor, modules) && !isAdmin(actor, modules)) {
        console.error('Unauthorized: only receptionists can check in patients.');
        return;
      }
    }

    if (status === 'completed') {
      const apt = appointments.find((a) => a.id === id);
      if (apt && apt.status !== 'completed') {
        const doc = doctors.find((d) => d.id === apt.doctorId);
        const repoInvoices = getRepository<any>('invoices');
        repoInvoices
          .list()
          .then((existingInvoices: any[]) => {
            const alreadyExists = existingInvoices.some(
              (inv) => inv.visitId === apt.id || inv.appointmentId === apt.id
            );
            if (!alreadyExists) {
              const newInvoice = buildInvoiceForVisit(apt, doc, existingInvoices, new Date());
              repoInvoices
                .create(newInvoice)
                .then(() => {
                  try {
                    window.dispatchEvent(
                      new StorageEvent('storage', {
                        key: `${STORAGE_KEY_PREFIX}invoices`,
                      })
                    );
                  } catch {
                    // ignore
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id !== id) return apt;
        if (status === 'checked_in') {
          const todayStr = formatLocalDate();
          const nextToken = apt.tokenNumber > 0 ? apt.tokenNumber : getNextTokenNumberForDate(prev, todayStr);
          return {
            ...apt,
            status,
            tokenNumber: nextToken,
            checkedInAt: apt.checkedInAt || new Date().toISOString(),
            checkedInBy: apt.checkedInBy || (actor ? { id: actor.id, name: actor.name } : null),
          };
        }
        return { ...apt, status };
      })
    );
  };

  const updateAppointmentNotes = (id: string, notes: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, notes } : apt))
    );
  };

  const recordVitals = (data: Omit<VitalSigns, 'id' | 'recordedAt'>): VitalSigns => {
    const newId = `vit-${vitals.length + 1}`;
    const newVital: VitalSigns = {
      ...data,
      id: newId,
      recordedAt: new Date().toISOString(),
    };
    setVitals((prev) => [newVital, ...prev]);
    return newVital;
  };

  const saveVitals = (
    patientId: string,
    data: Partial<VitalSigns> & { recordedBy?: string; recordedByName?: string }
  ): VitalSigns => {
    let savedVital: VitalSigns;
    setVitals((prev) => {
      const existingIndex = prev.findIndex((v) => v.patientId === patientId);
      if (existingIndex >= 0) {
        savedVital = {
          ...prev[existingIndex],
          ...data,
          recordedAt: new Date().toISOString(),
        };
        const updated = [...prev];
        updated[existingIndex] = savedVital;
        return updated;
      } else {
        savedVital = {
          id: `vit-${prev.length + 1}`,
          patientId,
          recordedBy: data.recordedBy || 'usr-1',
          recordedByName: data.recordedByName || 'Dr. Marcus Vance',
          recordedAt: new Date().toISOString(),
          systolicBp: data.systolicBp ?? 120,
          diastolicBp: data.diastolicBp ?? 80,
          heartRateBpm: data.heartRateBpm ?? 72,
          temperatureCelsius: data.temperatureCelsius ?? 37.0,
          respiratoryRate: data.respiratoryRate ?? 16,
          oxygenSaturationPct: data.oxygenSaturationPct ?? 98,
          weightKg: data.weightKg ?? 70,
          heightCm: data.heightCm ?? 170,
          bmi: data.bmi ?? 24.2,
          ...data,
        };
        return [savedVital, ...prev];
      }
    });
    return savedVital!;
  };

  const createPrescription = (
    data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>,
    actingUser?: User | null
  ): { success: boolean; prescription?: Prescription; error?: string } => {
    const actor = actingUser || authUser;
    if (!actor) {
      return { success: false, error: 'Authentication required to issue prescriptions.' };
    }

    if (!canPrescribe(actor, data.patientId, patientAssignments, modules)) {
      return {
        success: false,
        error: 'Only the assigned physician with Prescription Authoring and EMR Records Access can issue prescriptions.',
      };
    }

    const val = validatePrescription({
      diagnosis: data.diagnosis,
      items: data.items,
      patientId: data.patientId,
      doctorId: data.doctorId,
    });
    if (!val.valid) {
      return { success: false, error: val.errors.join(' ') };
    }

    const newId = `rx-${prescriptions.length + 1}`;
    const prescriptionNumber = `RX-2026-${String(prescriptions.length + 85).padStart(4, '0')}`;
    const newRx: Prescription = {
      ...data,
      id: newId,
      prescriptionNumber,
      date: formatLocalDate(),
      status: 'active',
    };

    setPrescriptions((prev) => [newRx, ...prev]);

    // Log to security audit ledger
    addAuditLogEntry({
      action: 'prescription_issued',
      targetRole: 'patient',
      targetUserId: data.patientId,
      targetStaffName: data.patientName,
      description: `e-Prescription #${prescriptionNumber} issued by Dr. ${data.doctorName} for ${data.patientName}. Diagnosis: ${data.diagnosis}.`,
      authorizedBy: actor.name,
    });

    if (data.allergyOverrides && data.allergyOverrides.length > 0) {
      data.allergyOverrides.forEach((override) => {
        addAuditLogEntry({
          action: 'allergy_override',
          targetRole: 'patient',
          targetUserId: data.patientId,
          targetStaffName: data.patientName,
          description: `Allergy warning overridden for ${override.allergen} when prescribing ${override.medicine}. Reason: ${override.reason}`,
          authorizedBy: actor.name,
        });
      });
    }

    return { success: true, prescription: newRx };
  };

  const cancelPrescription = async (
    prescriptionId: string,
    reason: string,
    actingUser?: User | null
  ): Promise<{ success: boolean; error?: string }> => {
    const actor = actingUser || authUser;
    if (!actor) {
      return { success: false, error: 'Authentication required.' };
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      return { success: false, error: 'A cancellation reason is required.' };
    }

    const targetRx = prescriptions.find((rx) => rx.id === prescriptionId);
    if (!targetRx) {
      return { success: false, error: 'Prescription not found.' };
    }

    if (targetRx.status === 'cancelled') {
      return { success: false, error: 'Prescription is already cancelled.' };
    }

    if (!canCancelPrescription(actor, targetRx, modules)) {
      return {
        success: false,
        error: 'Only the original issuing doctor or an administrator can cancel a prescription.',
      };
    }

    const nowIso = new Date().toISOString();
    const updatedRx: Prescription = {
      ...targetRx,
      status: 'cancelled',
      cancelledBy: {
        id: actor.id,
        name: actor.name,
        role: actor.role,
      },
      cancelledAt: nowIso,
      cancelReason: cleanReason,
    };

    setPrescriptions((prev) =>
      prev.map((r) => (r.id === prescriptionId ? updatedRx : r))
    );

    addAuditLogEntry({
      action: 'prescription_cancelled',
      targetRole: 'patient',
      targetUserId: targetRx.patientId,
      targetStaffName: targetRx.patientName,
      description: `Prescription #${targetRx.prescriptionNumber} cancelled by ${actor.name}. Reason: ${cleanReason}`,
      authorizedBy: actor.name,
    });

    return { success: true };
  };

  const addMedicine = async (
    medicineData: Omit<Medicine, 'id'>,
    actingUser?: User | null
  ): Promise<{ success: boolean; medicine?: Medicine; error?: string }> => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules) && !hasCapability(actor, 'administrativeAccess', modules)) {
      return { success: false, error: 'Administrative access required to manage formulary.' };
    }

    const cleanName = medicineData.genericName.trim();
    if (!cleanName) {
      return { success: false, error: 'Generic name is required.' };
    }

    const nameExists = medicines.some(
      (m) => m.genericName.toLowerCase() === cleanName.toLowerCase()
    );
    if (nameExists) {
      return { success: false, error: `A medicine named "${cleanName}" already exists in the formulary.` };
    }

    const newMed: Medicine = {
      ...medicineData,
      id: `med-${Date.now()}`,
      genericName: cleanName,
    };

    setMedicines((prev) => [newMed, ...prev]);

    addAuditLogEntry({
      action: 'formulary_medicine_created',
      targetRole: 'admin',
      description: `Formulary medicine added: ${cleanName} (${medicineData.drugClass}, ${medicineData.form}).`,
      authorizedBy: actor?.name,
    });

    return { success: true, medicine: newMed };
  };

  const updateMedicine = async (
    id: string,
    updates: Partial<Medicine>,
    actingUser?: User | null
  ): Promise<{ success: boolean; medicine?: Medicine; error?: string }> => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules) && !hasCapability(actor, 'administrativeAccess', modules)) {
      return { success: false, error: 'Administrative access required to manage formulary.' };
    }

    const target = medicines.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Medicine not found.' };
    }

    if (updates.genericName) {
      const cleanName = updates.genericName.trim();
      const duplicate = medicines.some(
        (m) => m.id !== id && m.genericName.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `A medicine named "${cleanName}" already exists in the formulary.` };
      }
    }

    const updatedMed: Medicine = {
      ...target,
      ...updates,
      genericName: updates.genericName ? updates.genericName.trim() : target.genericName,
    };

    setMedicines((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));

    addAuditLogEntry({
      action: 'formulary_medicine_updated',
      targetRole: 'admin',
      description: `Formulary medicine updated: ${updatedMed.genericName}.`,
      authorizedBy: actor?.name,
    });

    return { success: true, medicine: updatedMed };
  };

  const toggleMedicineStatus = async (
    id: string,
    actingUser?: User | null
  ): Promise<{ success: boolean; active?: boolean; error?: string }> => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules) && !hasCapability(actor, 'administrativeAccess', modules)) {
      return { success: false, error: 'Administrative access required to manage formulary.' };
    }

    const target = medicines.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Medicine not found.' };
    }

    const nextActive = !target.active;
    const updatedMed = { ...target, active: nextActive };

    setMedicines((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));

    addAuditLogEntry({
      action: 'formulary_medicine_status_changed',
      targetRole: 'admin',
      description: `Formulary medicine ${target.genericName} marked ${nextActive ? 'Active' : 'Inactive'}.`,
      authorizedBy: actor?.name,
    });

    return { success: true, active: nextActive };
  };

  const dispensePrescriptionItem = (
    prescriptionId: string,
    itemId: string,
    pharmacistName: string
  ) => {
    setPrescriptions((prev) =>
      prev.map((rx) => {
        if (rx.id !== prescriptionId) return rx;
        const updatedItems = rx.items.map((it) =>
          it.id === itemId ? { ...it, dispensed: true } : it
        );
        const allDispensed = updatedItems.every((it) => it.dispensed);
        return {
          ...rx,
          items: updatedItems,
          status: allDispensed ? 'dispensed' : 'partially_dispensed',
          dispensedBy: pharmacistName,
          dispensedAt: new Date().toISOString(),
        };
      })
    );
  };

  const createLabTest = (
    data: Omit<LabTest, 'id' | 'testOrderNumber' | 'orderedAt' | 'status'>
  ): LabTest => {
    const newId = `lab-${labTests.length + 1}`;
    const testOrderNumber = `LAB-2026-${String(labTests.length + 125).padStart(4, '0')}`;
    const newTest: LabTest = {
      ...data,
      id: newId,
      testOrderNumber,
      orderedAt: new Date().toISOString(),
      status: 'ordered',
    };
    setLabTests((prev) => [newTest, ...prev]);
    return newTest;
  };

  const updateLabTestStatus = (
    id: string,
    status: LabTestStatus,
    extra?: { result?: string; notes?: string; technicianName?: string }
  ) => {
    setLabTests((prev) =>
      prev.map((test) => {
        if (test.id !== id) return test;
        return {
          ...test,
          status,
          ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
          ...(status === 'sample_collected'
            ? { sampleCollectedAt: new Date().toISOString() }
            : {}),
          ...(extra?.result ? { result: extra.result } : {}),
          ...(extra?.notes ? { clinicalNotes: extra.notes } : {}),
          ...(extra?.technicianName ? { technicianName: extra.technicianName } : {}),
        };
      })
    );
  };

  const createInvoice = (
    data: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'status'>
  ): Invoice => {
    const newId = `inv-${invoices.length + 1}`;
    const invoiceNumber = `INV-2026-${String(invoices.length + 500).padStart(4, '0')}`;
    const newInv: Invoice = {
      ...data,
      id: newId,
      invoiceNumber,
      date: formatLocalDate(),
      status: data.paidAmount >= data.totalAmount ? 'paid' : data.paidAmount > 0 ? 'partially_paid' : 'unpaid',
    };
    setInvoices((prev) => [newInv, ...prev]);
    return newInv;
  };

  const recordPayment = (id: string, amount: number, method: PaymentMethod) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const newPaid = inv.paidAmount + amount;
        const newStatus =
          newPaid >= inv.totalAmount
            ? 'paid'
            : newPaid > 0
            ? 'partially_paid'
            : 'unpaid';
        return {
          ...inv,
          paidAmount: newPaid,
          status: newStatus,
          paymentMethod: method,
        };
      })
    );
  };

  const createModule = (
    name: string,
    description?: string,
    initialAccessIds?: StandardCapability[],
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules)) {
      return { success: false, error: 'Only clinic administrators can create modules.' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Role name is required.' };
    }
    if (modules.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: 'A role with this name already exists.' };
    }

    const accessIds = initialAccessIds ? Array.from(new Set(initialAccessIds)) : [];
    if (accessIds.includes('prescriptionAuthoring') && !accessIds.includes('emrRecordsAccess')) {
      return {
        success: false,
        error: 'Prescription Authoring requires EMR Records Access to be included as well.',
      };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newModule: AccessModule = {
      id: `mod-${Date.now()}`,
      name: trimmedName,
      description: description?.trim() || '',
      accessIds,
      memberIds: [],
      isSystem: false,
      createdBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
      createdAt: timestamp,
    };

    setModules((prev) => [...prev, newModule]);

    addAuditLogEntry({
      targetRole: 'md',
      targetStaffName: trimmedName,
      action: 'module_created',
      description: `Role '${trimmedName}' created with ${accessIds.length} access(es) by ${actor?.name || 'Managing Director'}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true, module: newModule };
  };

  const renameModule = (
    id: string,
    name: string,
    description?: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules)) {
      return { success: false, error: 'Only clinic administrators can modify modules.' };
    }
    const target = modules.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Module name is required.' };
    }
    if (
      modules.some(
        (m) => m.id !== id && m.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      return { success: false, error: 'A module with this name already exists.' };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name: trimmedName,
              description: description !== undefined ? description.trim() : m.description,
            }
          : m
      )
    );

    addAuditLogEntry({
      targetRole: 'md',
      targetStaffName: trimmedName,
      action: 'module_renamed',
      description: `Module '${target.name}' renamed to '${trimmedName}' by ${actor?.name || 'Managing Director'}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true };
  };

  const deleteModule = (
    id: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === id);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const check = canDeleteModule(actor, target, modules);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) => prev.filter((m) => m.id !== id));

    addAuditLogEntry({
      targetRole: 'md',
      targetStaffName: target.name,
      action: 'module_deleted',
      description: `Module '${target.name}' deleted by ${actor?.name || 'Managing Director'}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true };
  };

  const includeAccess = (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const check = canIncludeAccess(actor, target, accessId, modules);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, accessIds: Array.from(new Set([...m.accessIds, accessId])) }
          : m
      )
    );

    addAuditLogEntry({
      targetRole: 'md',
      targetStaffName: target.name,
      capability: accessId,
      action: 'module_access_included',
      description: `Access '${accessId}' included in module '${target.name}' by ${actor?.name || 'Managing Director'}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true };
  };

  const removeAccess = (
    moduleId: string,
    accessId: StandardCapability,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const check = canRemoveAccess(actor, target, accessId, modules);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, accessIds: m.accessIds.filter((a) => a !== accessId) }
          : m
      )
    );

    addAuditLogEntry({
      targetRole: 'md',
      targetStaffName: target.name,
      capability: accessId,
      action: 'module_access_removed',
      description: `Access '${accessId}' removed from module '${target.name}' by ${actor?.name || 'Managing Director'}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true };
  };

  const addMember = (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const staffMember = staffAccessList.find(
      (s) => s.id === staffId || s.badgeNumber === staffId || s.staffName === staffId
    );
    const check = canAddMember(
      actor,
      target,
      staffMember || ({ id: staffId } as any),
      reason,
      modules
    );
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, memberIds: Array.from(new Set([...m.memberIds, staffId])) }
          : m
      )
    );

    const staffDisplayName = staffMember?.staffName || staffId;
    const isAdministration =
      target.id === 'mod-admin' || target.accessIds.includes('administrativeAccess');
    const reasonText =
      isAdministration && reason
        ? ` (Reason: ${reason})`
        : reason
        ? ` (${reason})`
        : '';

    addAuditLogEntry({
      targetRole: staffMember?.role || 'doctor',
      targetStaffName: staffDisplayName,
      targetUserId: staffId,
      action: 'module_member_added',
      description: `Staff member '${staffDisplayName}' added to module '${target.name}' by ${actor?.name || 'Managing Director'}${reasonText}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true };
  };

  const removeMember = (
    moduleId: string,
    staffId: string,
    reason?: string,
    actingUser?: User | null
  ): ModuleMutationResult => {
    const actor = actingUser || authUser;
    const target = modules.find((m) => m.id === moduleId);
    if (!target) {
      return { success: false, error: 'Module not found.' };
    }
    const staffMember = staffAccessList.find(
      (s) => s.id === staffId || s.badgeNumber === staffId || s.staffName === staffId
    );
    const check = canRemoveMember(
      actor,
      target,
      staffMember || ({ id: staffId } as any),
      modules,
      staffAccessList
    );
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              memberIds: m.memberIds.filter(
                (mid) => mid !== staffId && mid !== staffMember?.id
              ),
            }
          : m
      )
    );

    const staffDisplayName = staffMember?.staffName || staffId;
    const isAdministration =
      target.id === 'mod-admin' || target.accessIds.includes('administrativeAccess');
    const reasonText =
      isAdministration && reason
        ? ` (Reason: ${reason})`
        : reason
        ? ` (${reason})`
        : '';

    addAuditLogEntry({
      targetRole: staffMember?.role || 'doctor',
      targetStaffName: staffDisplayName,
      targetUserId: staffId,
      action: 'module_member_removed',
      description: `Staff member '${staffDisplayName}' removed from module '${target.name}' by ${actor?.name || 'Managing Director'}${reasonText}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true };
  };

  const createAccess = (
    label: string,
    description: string,
    actingUser?: User | null
  ): { success: boolean; error?: string; accessItem?: AccessItem } => {
    const actor = actingUser || authUser;
    if (!isAdmin(actor, modules)) {
      return { success: false, error: 'Only clinic administrators can create new access privileges.' };
    }
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return { success: false, error: 'Access privilege name is required.' };
    }
    if (accessCatalog.some((a) => a.label.toLowerCase() === trimmedLabel.toLowerCase())) {
      return { success: false, error: 'An access privilege with this name already exists.' };
    }

    const slug = trimmedLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
    const id = `acc_${slug || Date.now()}`;

    const newAccess: AccessItem = {
      id: id as StandardCapability,
      label: trimmedLabel,
      description: description.trim() || 'Custom operational access privilege.',
    };

    registerCustomAccess(newAccess);

    setCustomAccesses((prev) => {
      const next = [...prev, newAccess];
      try {
        sessionStorage.setItem('cms_custom_accesses_v1', JSON.stringify(next));
      } catch {
        // fallback
      }
      return next;
    });

    addAuditLogEntry({
      targetRole: 'md',
      targetStaffName: trimmedLabel,
      action: 'module_created',
      description: `Access privilege '${trimmedLabel}' created by ${actor?.name || 'Managing Director'}`,
      authorizedBy: actor?.name || 'Dr. Marcus Vance (Managing Director)',
    });

    return { success: true, accessItem: newAccess };
  };

  return (
    <ClinicContext.Provider
      value={{
        patients,
        doctors,
        appointments,
        vitals,
        prescriptions,
        labTests,
        invoices,
        patientAssignments,
        modules,
        accessCatalog,
        createAccess,
        transferPatient,
        addPatient,
        registerPatient,
        checkInAppointment,
        checkInWalkIn,
        bookAppointment,
        cancelAppointmentAction,
        rescheduleAppointmentAction,
        updateAppointment,
        updatePatient,
        addDoctor,
        updateDoctorStatus,
        addAppointment,
        updateAppointmentStatus,
        updateAppointmentNotes,
        recordVitals,
        saveVitals,
        medicines,
        createPrescription,
        cancelPrescription,
        dispensePrescriptionItem,
        addMedicine,
        updateMedicine,
        toggleMedicineStatus,
        createLabTest,
        updateLabTestStatus,
        createInvoice,
        recordPayment,
        createModule,
        renameModule,
        deleteModule,
        includeAccess,
        removeAccess,
        addMember,
        removeMember,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

