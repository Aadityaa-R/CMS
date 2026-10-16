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
} from '@/types';
import {
  isAdmin,
  canTransferPatient,
  canRegisterPatient,
  canCheckIn,
  getAssignedDoctorId,
  hasCapability,
  canDeleteModule,
  canIncludeAccess,
  canRemoveAccess,
  canAddMember,
  canRemoveMember,
} from '@/lib/permissions';
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
import { ACCESS_CATALOG, AccessItem, registerCustomAccess } from '@/data/accessCatalog';
import { useAuth } from '@/context/AuthContext';

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

  // Patient Actions
  addPatient: (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ) => Patient;
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
  createPrescription: (data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>) => Prescription;
  dispensePrescriptionItem: (prescriptionId: string, itemId: string, pharmacistName: string) => void;

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

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

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

  const [modules, setModules] = useState<AccessModule[]>(() => {
    try {
      const saved = sessionStorage.getItem('cms_modules_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length >= 3 &&
          parsed.some((m: AccessModule) => m.id === 'mod-admin')
        ) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_MODULES;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_modules_v2', JSON.stringify(modules));
    } catch {
      // fallback
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

  const addPatient = (
    data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>,
    actingUser?: User | null
  ): Patient => {
    if (actingUser && !canRegisterPatient(actingUser)) {
      console.error('Unauthorized: only receptionists can register patients.');
    }
    const newId = `pat-${patients.length + 1}`;
    const newMrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}`;
    const newPatient: Patient = {
      ...data,
      id: newId,
      mrn: newMrn,
      registeredDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };
    setPatients((prev) => [newPatient, ...prev]);
    return newPatient;
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

  const addAppointment = (
    data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>
  ): Appointment => {
    const newId = `apt-${appointments.length + 1}`;
    const tokenNumber = appointments.length + 1;
    const appointmentNumber = `APT-2026-${String(tokenNumber).padStart(3, '0')}`;
    const newApt: Appointment = {
      ...data,
      id: newId,
      appointmentNumber,
      tokenNumber,
    };
    setAppointments((prev) => [newApt, ...prev]);
    return newApt;
  };

  const updateAppointmentStatus = (
    id: string,
    status: AppointmentStatus,
    actingUser?: User | null
  ) => {
    if (status === 'checked_in' && actingUser && !canCheckIn(actingUser)) {
      console.error('Unauthorized: only receptionists can check in patients.');
      return;
    }
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
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
    data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>
  ): Prescription => {
    const newId = `rx-${prescriptions.length + 1}`;
    const prescriptionNumber = `RX-2026-${String(prescriptions.length + 85).padStart(4, '0')}`;
    const newRx: Prescription = {
      ...data,
      id: newId,
      prescriptionNumber,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
    setPrescriptions((prev) => [newRx, ...prev]);
    return newRx;
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
      date: new Date().toISOString().split('T')[0],
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
        updatePatient,
        addDoctor,
        updateDoctorStatus,
        addAppointment,
        updateAppointmentStatus,
        updateAppointmentNotes,
        recordVitals,
        saveVitals,
        createPrescription,
        dispensePrescriptionItem,
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

