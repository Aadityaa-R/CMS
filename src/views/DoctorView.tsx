import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableTruncate } from '@/components/ui/Table';
import {
  CheckCircle2,
  Filter,
  FilePlus,
  Plus,
} from 'lucide-react';
import { Appointment, Prescription, PrescriptionItem, Patient } from '@/types';
import {
  canTransferPatient,
  getAssignedDoctorId,
  hasCapability,
  isAdmin,
} from '@/lib/permissions';
import {
  getScopedPatients,
  getScopedAppointments,
  getScopedPrescriptions,
} from '@/lib/selectors';
import { isDoctorAvailable } from '@/lib/availability';

interface DoctorViewProps {
  activeTab?: string;
}

const formatAppointmentStatus = (status: string) => {
  switch (status) {
    case 'in_consultation':
      return 'In Consultation';
    case 'checked_in':
      return 'Checked In';
    case 'scheduled':
      return 'Scheduled';
    case 'completed':
      return 'Completed';
    default:
      return status.replace(/_/g, ' ');
  }
};

export const NORMAL_VITAL_RANGES = {
  systolicBp: { min: 90, max: 139 },
  diastolicBp: { min: 60, max: 89 },
  heartRateBpm: { min: 60, max: 100 },
  oxygenSaturationPct: { min: 95, max: 100 },
  temperatureCelsius: { min: 36.0, max: 37.9 },
};

export const getVitalLabel = (
  baseLabel: string,
  value: string,
  range: { min: number; max: number }
): string => {
  if (!value.trim()) return baseLabel;
  const num = Number(value);
  if (isNaN(num)) return baseLabel;
  if (num < range.min) return `${baseLabel} Low`;
  if (num > range.max) return `${baseLabel} High`;
  return baseLabel;
};

export const deduplicateList = (items?: (string | null | undefined)[]): string[] => {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
};

export const DoctorView: React.FC<DoctorViewProps> = ({ activeTab = 'overview' }) => {
  const { currentUser, currentRole, addAuditLogEntry } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>(activeTab || 'overview');

  useEffect(() => {
    if (activeTab && activeTab !== 'overview') {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);

  const {
    doctors,
    appointments,
    patients,
    vitals,
    prescriptions,
    patientAssignments = [],
    createPrescription,
    updateAppointmentStatus,
    updateAppointmentNotes,
    transferPatient,
    saveVitals,
    updatePatient,
  } = useClinic();

  const isMD = isAdmin(currentUser) || currentRole === 'md' || currentRole === 'admin';

  // Active doctor queue selection (defaults to doc-1 Marcus Vance for MD, doc-2 Nathan Hayes for staff doctor)
  const [activeDoctorId, setActiveDoctorId] = useState<string>(() => {
    if (currentRole === 'doctor') return 'doc-2';
    return 'doc-1';
  });

  const isReadOnlyView = isMD && activeDoctorId !== 'doc-1';

  useEffect(() => {
    if (currentRole === 'doctor') {
      setActiveDoctorId('doc-2');
    } else if (currentRole === 'md' || currentRole === 'admin') {
      setActiveDoctorId('doc-1');
    }
  }, [currentRole]);

  const activeDoctor = doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  const doctorAppointments = useMemo(() => {
    return getScopedAppointments(currentUser, appointments, patientAssignments, activeDoctorId);
  }, [currentUser, appointments, patientAssignments, activeDoctorId]);

  // Search & Filter State (Equal Authority Governance pattern)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'urgent'>('all');

  // Real-time Feedback Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Active consultation patient
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');

  useEffect(() => {
    const inConsult = doctorAppointments.find((a) => a.status === 'in_consultation');
    if (inConsult) {
      setSelectedAppointmentId(inConsult.id);
    } else if (doctorAppointments.length > 0) {
      setSelectedAppointmentId(doctorAppointments[0].id);
    } else {
      setSelectedAppointmentId('');
    }
  }, [activeDoctorId]);

  const activeAppointment =
    doctorAppointments.find((a) => a.id === selectedAppointmentId) ||
    doctorAppointments.find((a) => a.status === 'in_consultation') ||
    doctorAppointments[0] ||
    null;
  const activePatient = activeAppointment ? patients.find((p) => p.id === activeAppointment.patientId) : null;
  const activeVitals = activePatient ? vitals.find((v) => v.patientId === activePatient.id) : null;

  const consultationApt =
    (activeAppointment && activeAppointment.status === 'in_consultation' ? activeAppointment : null) ||
    doctorAppointments.find((a) => a.status === 'in_consultation') ||
    null;
  const summaryPatient =
    activePatient ||
    (consultationApt ? patients.find((p) => p.id === consultationApt.patientId) || null : null);

  const lastCompletedApt = useMemo(() => {
    if (!summaryPatient) return null;
    return (
      appointments
        .filter((a) => a.patientId === summaryPatient.id && a.status === 'completed')
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0] || null
    );
  }, [summaryPatient, appointments]);

  // Clinical Triage Vitals Input State
  const [vitalsForm, setVitalsForm] = useState({
    systolicBp: '',
    diastolicBp: '',
    heartRateBpm: '',
    oxygenSaturationPct: '',
    temperatureCelsius: '',
  });

  const [savedVitalsSnapshot, setSavedVitalsSnapshot] = useState({
    systolicBp: '',
    diastolicBp: '',
    heartRateBpm: '',
    oxygenSaturationPct: '',
    temperatureCelsius: '',
  });
  const [vitalsSavedMessage, setVitalsSavedMessage] = useState(false);

  // Conclude Visit Modal State
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);

  useEffect(() => {
    const initial = activeVitals
      ? {
          systolicBp: activeVitals.systolicBp ? String(activeVitals.systolicBp) : '',
          diastolicBp: activeVitals.diastolicBp ? String(activeVitals.diastolicBp) : '',
          heartRateBpm: activeVitals.heartRateBpm ? String(activeVitals.heartRateBpm) : '',
          oxygenSaturationPct: activeVitals.oxygenSaturationPct ? String(activeVitals.oxygenSaturationPct) : '',
          temperatureCelsius: activeVitals.temperatureCelsius ? String(activeVitals.temperatureCelsius) : '',
        }
      : {
          systolicBp: '',
          diastolicBp: '',
          heartRateBpm: '',
          oxygenSaturationPct: '',
          temperatureCelsius: '',
        };
    setVitalsForm(initial);
    setSavedVitalsSnapshot(initial);
    setVitalsSavedMessage(false);
  }, [activePatient?.id, activeVitals?.id, activeVitals?.recordedAt]);

  const handleVitalChange = (field: keyof typeof vitalsForm, value: string) => {
    // Numbers only: digits, and for temperature allow at most one dot
    if (field === 'temperatureCelsius') {
      if (!/^\d*\.?\d*$/.test(value)) return;
    } else {
      if (!/^\d*$/.test(value)) return;
    }
    setVitalsForm((prev) => ({ ...prev, [field]: value }));
    setVitalsSavedMessage(false);
  };

  const vitalErrors: { [key in keyof typeof vitalsForm]?: string } = {};

  if (vitalsForm.systolicBp.trim() !== '') {
    const val = Number(vitalsForm.systolicBp);
    if (isNaN(val) || val < 50 || val > 250) {
      vitalErrors.systolicBp = 'Range: 50–250';
    }
  }
  if (vitalsForm.diastolicBp.trim() !== '') {
    const val = Number(vitalsForm.diastolicBp);
    if (isNaN(val) || val < 30 || val > 150) {
      vitalErrors.diastolicBp = 'Range: 30–150';
    }
  }
  if (vitalsForm.heartRateBpm.trim() !== '') {
    const val = Number(vitalsForm.heartRateBpm);
    if (isNaN(val) || val < 20 || val > 250) {
      vitalErrors.heartRateBpm = 'Range: 20–250';
    }
  }
  if (vitalsForm.oxygenSaturationPct.trim() !== '') {
    const val = Number(vitalsForm.oxygenSaturationPct);
    if (isNaN(val) || val < 50 || val > 100) {
      vitalErrors.oxygenSaturationPct = 'Range: 50–100';
    }
  }
  if (vitalsForm.temperatureCelsius.trim() !== '') {
    const val = Number(vitalsForm.temperatureCelsius);
    if (isNaN(val) || val < 30 || val > 45) {
      vitalErrors.temperatureCelsius = 'Range: 30–45';
    }
  }

  const hasVitalErrors = Object.keys(vitalErrors).length > 0;

  const hasVitalsChanged =
    vitalsForm.systolicBp !== savedVitalsSnapshot.systolicBp ||
    vitalsForm.diastolicBp !== savedVitalsSnapshot.diastolicBp ||
    vitalsForm.heartRateBpm !== savedVitalsSnapshot.heartRateBpm ||
    vitalsForm.oxygenSaturationPct !== savedVitalsSnapshot.oxygenSaturationPct ||
    vitalsForm.temperatureCelsius !== savedVitalsSnapshot.temperatureCelsius;

  const handleSaveVitals = () => {
    if (!activePatient || !hasVitalsChanged || hasVitalErrors || isReadOnlyView) return;
    saveVitals(activePatient.id, {
      systolicBp: vitalsForm.systolicBp ? Number(vitalsForm.systolicBp) : 120,
      diastolicBp: vitalsForm.diastolicBp ? Number(vitalsForm.diastolicBp) : 80,
      heartRateBpm: vitalsForm.heartRateBpm ? Number(vitalsForm.heartRateBpm) : 72,
      oxygenSaturationPct: vitalsForm.oxygenSaturationPct ? Number(vitalsForm.oxygenSaturationPct) : 98,
      temperatureCelsius: vitalsForm.temperatureCelsius ? Number(vitalsForm.temperatureCelsius) : 37.0,
      recordedBy: currentUser?.id || 'usr-1',
      recordedByName: currentUser?.name || 'Dr. Marcus Vance',
    });
    setSavedVitalsSnapshot({ ...vitalsForm });
    setVitalsSavedMessage(true);
    showNotification(`Triage vitals updated for ${activePatient.firstName} ${activePatient.lastName}.`);
  };

  // Allergy State & Handlers
  const [allergyInput, setAllergyInput] = useState('');
  const [allergyDraft, setAllergyDraft] = useState('');
  const [isEditingAllergies, setIsEditingAllergies] = useState(false);

  useEffect(() => {
    if (activePatient) {
      const formatted = deduplicateList(activePatient.allergies).join(', ');
      setAllergyInput(formatted);
      setAllergyDraft(formatted);
      setIsEditingAllergies(false);
    } else {
      setAllergyInput('');
      setAllergyDraft('');
      setIsEditingAllergies(false);
    }
  }, [activePatient?.id, activePatient?.allergies]);

  const hasAllergyChanged = allergyDraft.trim() !== allergyInput.trim();

  const handleStartEditAllergies = () => {
    setAllergyDraft(allergyInput);
    setIsEditingAllergies(true);
  };

  const handleCancelEditAllergies = () => {
    setAllergyDraft(allergyInput);
    setIsEditingAllergies(false);
  };

  const handleSaveAllergies = () => {
    if (!activePatient || !hasAllergyChanged) return;
    const allergies = deduplicateList(
      allergyDraft
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0 && a.toLowerCase() !== 'none')
    );
    updatePatient(activePatient.id, { allergies });
    setAllergyInput(allergies.join(', '));
    setIsEditingAllergies(false);
    showNotification(`Allergy record updated for ${activePatient.firstName} ${activePatient.lastName}.`);
  };

  // Prescription Modal State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescPatientId, setPrescPatientId] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      id: 'item-1',
      medicineName: '',
      dosage: '',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'Take after meals with water',
      dispensed: false,
    },
  ]);
  const [prescriptionError, setPrescriptionError] = useState('');

  // Consultation Notes Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [clinicalNotesText, setClinicalNotesText] = useState('');
  const [notesError, setNotesError] = useState('');

  // Handlers
  const handleStartConsultation = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'in_consultation');
    setSelectedAppointmentId(apt.id);
    showNotification(`Consultation started for ${apt.patientName}. Patient now at desk.`);
  };

  const handleConcludeConsultation = (aptId: string, patientName: string) => {
    if (activePatient && (vitalsForm.systolicBp || vitalsForm.heartRateBpm)) {
      saveVitals(activePatient.id, {
        systolicBp: vitalsForm.systolicBp ? Number(vitalsForm.systolicBp) : 120,
        diastolicBp: vitalsForm.diastolicBp ? Number(vitalsForm.diastolicBp) : 80,
        heartRateBpm: vitalsForm.heartRateBpm ? Number(vitalsForm.heartRateBpm) : 72,
        oxygenSaturationPct: vitalsForm.oxygenSaturationPct ? Number(vitalsForm.oxygenSaturationPct) : 98,
        temperatureCelsius: vitalsForm.temperatureCelsius ? Number(vitalsForm.temperatureCelsius) : 37.0,
        recordedBy: currentUser?.id || 'usr-1',
        recordedByName: currentUser?.name || 'Dr. Marcus Vance',
      });
    }
    if (activePatient) {
      const allergies = allergyInput
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0 && a.toLowerCase() !== 'none');
      updatePatient(activePatient.id, { allergies });
    }
    updateAppointmentStatus(aptId, 'completed');
    showNotification(`Consultation concluded for ${patientName}. Visit marked completed.`);
  };

  const handleAddMedicationRow = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      {
        id: `item-${prev.length + 1}`,
        medicineName: '',
        dosage: '',
        frequency: 'Once daily',
        duration: '14 days',
        instructions: 'Take after meals',
        dispensed: false,
      },
    ]);
  };

  const handleUpdateMedication = (
    index: number,
    field: keyof PrescriptionItem,
    value: string
  ) => {
    setPrescriptionItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleOpenPrescriptionModal = (targetPatientId?: string) => {
    const pId = targetPatientId || activePatient?.id || patients[0]?.id || '';
    setPrescPatientId(pId);
    setDiagnosis('');
    setPrescriptionError('');
    setPrescriptionItems([
      {
        id: 'item-1',
        medicineName: '',
        dosage: '',
        frequency: 'Once daily in morning',
        duration: '30 days',
        instructions: 'Take after breakfast',
        dispensed: false,
      },
    ]);
    setIsPrescriptionModalOpen(true);
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setPrescriptionError('Clinical diagnosis is required.');
      return;
    }

    const patientObj = patients.find((p) => p.id === prescPatientId);
    if (!patientObj) {
      setPrescriptionError('Please select a valid patient.');
      return;
    }

    const validItems = prescriptionItems.filter((i) => i.medicineName.trim().length > 0);
    if (validItems.length === 0) {
      setPrescriptionError('At least one medicine name is required.');
      return;
    }

    const newRx = createPrescription({
      patientId: patientObj.id,
      patientName: `${patientObj.firstName} ${patientObj.lastName}`,
      doctorId: activeDoctor.id,
      doctorName: activeDoctor.name,
      appointmentId: activeAppointment?.id,
      diagnosis,
      items: validItems,
    });

    showNotification(
      `e-Prescription #${newRx.prescriptionNumber} written for ${newRx.patientName}. Transmitted to pharmacy repository.`
    );

    setIsPrescriptionModalOpen(false);
    setPrescriptionError('');
  };

  const handleSaveConsultationNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;

    if (!clinicalNotesText.trim()) {
      setNotesError('Consultation assessment and clinical plan notes are required.');
      return;
    }

    updateAppointmentNotes(activeAppointment.id, clinicalNotesText.trim());
    showNotification(
      `Consultation notes recorded for ${activeAppointment.patientName}. Appended to permanent EMR.`
    );
    setIsNotesModalOpen(false);
    setClinicalNotesText('');
    setNotesError('');
  };

  // Transfer Modal State
  const [transferTargetPatient, setTransferTargetPatient] = useState<Patient | null>(null);
  const [targetDoctorId, setTargetDoctorId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferError, setTransferError] = useState<string>('');

  const targetPatientInConsultation = useMemo(() => {
    if (!transferTargetPatient) return false;
    return appointments.some(
      (a) => a.patientId === transferTargetPatient.id && a.status === 'in_consultation'
    );
  }, [transferTargetPatient, appointments]);

  const isTargetPatientUnassigned = useMemo(() => {
    if (!transferTargetPatient) return false;
    return !getAssignedDoctorId(transferTargetPatient.id, patientAssignments);
  }, [transferTargetPatient, patientAssignments]);

  const handleOpenTransferModal = (pat: Patient) => {
    setTransferTargetPatient(pat);
    const currentDocId = getAssignedDoctorId(pat.id, patientAssignments);
    const availableDocs = doctors.filter(
      (d) =>
        d.id !== currentDocId &&
        d.status === 'active' &&
        hasCapability(d, 'consultationWorkstation') &&
        isDoctorAvailable(d.id)
    );
    setTargetDoctorId(availableDocs[0]?.id || '');
    setTransferReason('');
    setTransferError('');
  };

  const handleConfirmTransfer = () => {
    if (!transferTargetPatient) return;
    if (targetPatientInConsultation) {
      setTransferError('Conclude the current consultation before transferring.');
      return;
    }
    if (!targetDoctorId) {
      setTransferError('Please select a receiving physician.');
      return;
    }
    if (!isDoctorAvailable(targetDoctorId)) {
      setTransferError('Doctor is not available today.');
      return;
    }
    if (!transferReason.trim()) {
      setTransferError(
        isTargetPatientUnassigned
          ? 'Assignment reason is required for clinical records.'
          : 'Transfer reason is required for clinical continuity.'
      );
      return;
    }

    const currentDocId = getAssignedDoctorId(transferTargetPatient.id, patientAssignments);
    const oldDoc = doctors.find((d) => d.id === currentDocId);
    const newDoc = doctors.find((d) => d.id === targetDoctorId);
    const oldDocName = oldDoc ? oldDoc.name : 'Unassigned';
    const newDocName = newDoc ? newDoc.name : 'Receiving Physician';

    const result = transferPatient(
      transferTargetPatient.id,
      targetDoctorId,
      transferReason.trim(),
      currentUser.id,
      currentUser.name,
      currentUser
    );

    if (!result.success) {
      setTransferError(result.error || 'Transfer failed.');
      return;
    }

    const movedText =
      result.movedAppointmentsCount > 0
        ? ` Moved ${result.movedAppointmentsCount} appointment(s) (${result.movedAppointmentIds.join(', ')}).`
        : ' No open appointments moved.';

    addAuditLogEntry({
      targetRole: 'patient',
      targetStaffName: `${transferTargetPatient.firstName} ${transferTargetPatient.lastName}`,
      targetUserId: transferTargetPatient.id,
      action: 'permission_updated',
      description: isTargetPatientUnassigned
        ? `Patient assigned to ${newDocName}.${movedText} Reason: ${transferReason.trim()}`
        : `Patient care transferred from ${oldDocName} to ${newDocName}.${movedText} Reason: ${transferReason.trim()}`,
      authorizedBy: currentUser.name,
    });

    showNotification(
      isTargetPatientUnassigned
        ? `Patient ${transferTargetPatient.firstName} ${transferTargetPatient.lastName} assigned to ${newDocName}.`
        : `Patient ${transferTargetPatient.firstName} ${transferTargetPatient.lastName} transferred to ${newDocName}.`
    );

    setTransferTargetPatient(null);
    setTargetDoctorId('');
    setTransferReason('');
    setTransferError('');
  };

  const doctorPrescriptions = useMemo(() => {
    return getScopedPrescriptions(currentUser, prescriptions, patientAssignments, activeDoctorId);
  }, [prescriptions, currentUser, patientAssignments, activeDoctorId]);

  // Filter Helper with Equal Authority
  const query = searchTerm.toLowerCase().trim();

  const filteredAppointments = doctorAppointments.filter((a) => {
    const matchesSearch =
      query === '' ||
      a.patientName.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query) ||
      a.reasonForVisit.toLowerCase().includes(query) ||
      a.tokenNumber.toString().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return a.status === 'in_consultation' || a.status === 'checked_in';
    if (filterMode === 'urgent') return a.status === 'in_consultation';
    return true;
  });

  const doctorPatients = useMemo(() => {
    return getScopedPatients(currentUser, patients, patientAssignments, activeDoctorId);
  }, [patients, currentUser, patientAssignments, activeDoctorId]);

  // Dedicated Patients Medical Directory Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const patientQuery = patientSearchTerm.toLowerCase().trim();

  const filteredPatients = doctorPatients.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const matchesSearch =
      patientQuery === '' ||
      p.firstName.toLowerCase().includes(patientQuery) ||
      p.lastName.toLowerCase().includes(patientQuery) ||
      fullName.includes(patientQuery) ||
      p.mrn.toLowerCase().includes(patientQuery) ||
      p.phone.toLowerCase().includes(patientQuery);

    if (!matchesSearch) return false;
    return true;
  });

  const handlePatientSearchChange = (term: string) => {
    setPatientSearchTerm(term);
    setPatientsPage(1);
  };

  const patientSearchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const list: SearchSuggestion[] = [];
    doctorPatients.forEach((p) => {
      list.push({
        label: `${p.firstName} ${p.lastName}`,
        category: 'Patient',
        sublabel: `${p.mrn} • ${p.phone}`,
      });
    });
    return list;
  }, [doctorPatients]);

  // Dedicated e-Prescriptions Master Ledger Search State
  const [prescriptionSearchTerm, setPrescriptionSearchTerm] = useState('');
  const rxQuery = prescriptionSearchTerm.toLowerCase().trim();

  const filteredPrescriptions = doctorPrescriptions.filter((r) => {
    const matchesSearch =
      rxQuery === '' ||
      r.patientName.toLowerCase().includes(rxQuery) ||
      r.prescriptionNumber.toLowerCase().includes(rxQuery) ||
      r.diagnosis.toLowerCase().includes(rxQuery) ||
      r.items.some((item) => {
        const drug = typeof (item as unknown) === 'string' ? (item as unknown as string) : item.medicineName;
        return drug ? drug.toLowerCase().includes(rxQuery) : false;
      });

    if (!matchesSearch) return false;
    return true;
  });

  const handlePrescriptionSearchChange = (term: string) => {
    setPrescriptionSearchTerm(term);
    setPrescriptionsPage(1);
  };

  const prescriptionSearchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    doctorPrescriptions.forEach((r) => {
      if (!seen.has(r.patientName.toLowerCase())) {
        seen.add(r.patientName.toLowerCase());
        list.push({
          label: r.patientName,
          category: 'Patient',
          sublabel: `${r.prescriptionNumber} • ${r.diagnosis}`,
        });
      }
      r.items.forEach((item) => {
        const drug = typeof (item as unknown) === 'string' ? (item as unknown as string) : item.medicineName;
        if (drug && !seen.has(drug.toLowerCase())) {
          seen.add(drug.toLowerCase());
          list.push({
            label: drug,
            category: 'Medication',
            sublabel: `Rx #${r.prescriptionNumber}`,
          });
        }
      });
    });
    return list;
  }, [doctorPrescriptions]);

  // View Prescription Modal State
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const viewingPatient = viewingPrescription
    ? patients.find((p) => p.id === viewingPrescription.patientId) || null
    : null;

  // Pagination State (10 records per page)
  const [worklistPage, setWorklistPage] = useState(1);
  const [patientsPage, setPatientsPage] = useState(1);
  const [prescriptionsPage, setPrescriptionsPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setWorklistPage(1);
  }, [searchTerm, filterMode, activeDoctorId]);

  useEffect(() => {
    setPatientsPage(1);
  }, [patientSearchTerm, activeDoctorId]);

  useEffect(() => {
    setPrescriptionsPage(1);
  }, [prescriptionSearchTerm, activeDoctorId]);

  const paginatedAppointments = filteredAppointments.slice(
    (worklistPage - 1) * pageSize,
    worklistPage * pageSize
  );
  const paginatedPatients = filteredPatients.slice(
    (patientsPage - 1) * pageSize,
    patientsPage * pageSize
  );
  const paginatedPrescriptions = filteredPrescriptions.slice(
    (prescriptionsPage - 1) * pageSize,
    prescriptionsPage * pageSize
  );

  const doctorSearchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    doctorAppointments.forEach((apt) => {
      if (apt.patientName && !seen.has(apt.patientName.toLowerCase())) {
        seen.add(apt.patientName.toLowerCase());
        list.push({
          label: apt.patientName,
          category: 'Patient',
          sublabel: `Token #${apt.tokenNumber} • ${apt.reasonForVisit}`,
        });
      }
    });
    patients.forEach((p) => {
      const fullName = `${p.firstName} ${p.lastName}`;
      if (!seen.has(fullName.toLowerCase())) {
        seen.add(fullName.toLowerCase());
        list.push({
          label: fullName,
          category: 'Patient',
          sublabel: `${p.mrn} • ${p.phone}`,
        });
      }
    });
    return list;
  }, [doctorAppointments, patients]);

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Physician Consultation Desk & Clinical Care
          </h2>
        </div>
      </div>

      {/* Sub-Workstation Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Consultation Desk' },
          { id: 'patients', label: 'Patients' },
          { id: 'prescriptions', label: 'e-Prescriptions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`pb-2.5 pt-1 text-xs cursor-pointer whitespace-nowrap ${
              selectedTab === tab.id
                ? 'font-bold text-slate-900 dark:text-slate-100 border-b-2 border-teal-600 -mb-px'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Real-time Feedback Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-semibold text-teal-950 dark:text-teal-100">Consultation Desk:</span>
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}


      {/* ========================================================================= */}
      {/* SUB-MODULE 1: CONSULTATION DESK (`overview`)                              */}
      {/* ========================================================================= */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
            {/* Active Patient Desk (Order 1 on mobile, 2 cols on desktop) */}
            <div className="order-1 lg:col-span-2 space-y-4">
              {activePatient && activeAppointment ? (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Active Consultation Desk: {activePatient.firstName} {activePatient.lastName}
                    </CardTitle>
                    <CardDescription>
                      {activePatient.mrn} • {activePatient.age} yrs • {activePatient.gender} • Blood Group: {activePatient.bloodGroup}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Allergies */}
                    <div>
                      {!isEditingAllergies ? (
                        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <span>
                            Allergies:{' '}
                            {allergyInput.trim() && allergyInput.toLowerCase().trim() !== 'none' ? (
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {allergyInput}
                              </span>
                            ) : (
                              <span>None recorded</span>
                            )}
                          </span>
                          {!isReadOnlyView && (
                            <button
                              type="button"
                              onClick={handleStartEditAllergies}
                              className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                            >
                              {allergyInput.trim() && allergyInput.toLowerCase().trim() !== 'none' ? 'Edit' : 'Add'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1 sm:max-w-md">
                            <Input
                              value={allergyDraft}
                              onChange={(e) => setAllergyDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (hasAllergyChanged) handleSaveAllergies();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEditAllergies();
                                }
                              }}
                              placeholder="e.g. Penicillin, Peanuts"
                              className="text-xs py-1"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={handleSaveAllergies}
                              disabled={!hasAllergyChanged}
                            >
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={handleCancelEditAllergies}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Consultation Chief Complaint */}
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                        Chief Complaint & Reason for Visit
                      </span>
                      <p className="text-slate-900 dark:text-slate-100 font-medium">
                        {activeAppointment.reasonForVisit}
                      </p>
                      {activeAppointment.notes && (
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Intake Note: {activeAppointment.notes}
                        </p>
                      )}
                    </div>

                    {/* Clinical Triage Vitals: 5 cols on desktop, 3 on tablet, 2 on phones */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                        Clinical Triage Vitals
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        <Input
                          label={getVitalLabel('BP Systolic (mmHg)', vitalsForm.systolicBp, NORMAL_VITAL_RANGES.systolicBp)}
                          inputMode="numeric"
                          placeholder="120"
                          value={vitalsForm.systolicBp}
                          onChange={(e) => handleVitalChange('systolicBp', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !hasVitalErrors && hasVitalsChanged && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          error={vitalErrors.systolicBp}
                          helperText={activePatient?.previousVitals?.systolicBp !== undefined ? `Last visit: ${activePatient.previousVitals.systolicBp}` : undefined}
                          className="text-xs py-1.5"
                        />
                        <Input
                          label={getVitalLabel('BP Diastolic (mmHg)', vitalsForm.diastolicBp, NORMAL_VITAL_RANGES.diastolicBp)}
                          inputMode="numeric"
                          placeholder="80"
                          value={vitalsForm.diastolicBp}
                          onChange={(e) => handleVitalChange('diastolicBp', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !hasVitalErrors && hasVitalsChanged && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          error={vitalErrors.diastolicBp}
                          helperText={activePatient?.previousVitals?.diastolicBp !== undefined ? `Last visit: ${activePatient.previousVitals.diastolicBp}` : undefined}
                          className="text-xs py-1.5"
                        />
                        <Input
                          label={getVitalLabel('Heart Rate (bpm)', vitalsForm.heartRateBpm, NORMAL_VITAL_RANGES.heartRateBpm)}
                          inputMode="numeric"
                          placeholder="72"
                          value={vitalsForm.heartRateBpm}
                          onChange={(e) => handleVitalChange('heartRateBpm', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !hasVitalErrors && hasVitalsChanged && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          error={vitalErrors.heartRateBpm}
                          helperText={activePatient?.previousVitals?.heartRateBpm !== undefined ? `Last visit: ${activePatient.previousVitals.heartRateBpm}` : undefined}
                          className="text-xs py-1.5"
                        />
                        <Input
                          label={getVitalLabel('O2 Saturation (%)', vitalsForm.oxygenSaturationPct, NORMAL_VITAL_RANGES.oxygenSaturationPct)}
                          inputMode="numeric"
                          placeholder="98"
                          value={vitalsForm.oxygenSaturationPct}
                          onChange={(e) => handleVitalChange('oxygenSaturationPct', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !hasVitalErrors && hasVitalsChanged && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          error={vitalErrors.oxygenSaturationPct}
                          helperText={activePatient?.previousVitals?.oxygenSaturationPct !== undefined ? `Last visit: ${activePatient.previousVitals.oxygenSaturationPct}` : undefined}
                          className="text-xs py-1.5"
                        />
                        <Input
                          label={getVitalLabel('Temperature (°C)', vitalsForm.temperatureCelsius, NORMAL_VITAL_RANGES.temperatureCelsius)}
                          inputMode="decimal"
                          placeholder="36.8"
                          value={vitalsForm.temperatureCelsius}
                          onChange={(e) => handleVitalChange('temperatureCelsius', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !hasVitalErrors && hasVitalsChanged && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          error={vitalErrors.temperatureCelsius}
                          helperText={activePatient?.previousVitals?.temperatureCelsius !== undefined ? `Last visit: ${activePatient.previousVitals.temperatureCelsius}` : undefined}
                          className="text-xs py-1.5"
                        />
                      </div>

                      {!isReadOnlyView && (
                        <div className="flex items-center gap-3">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={handleSaveVitals}
                            disabled={!hasVitalsChanged || hasVitalErrors || !vitalsForm.systolicBp.trim() || !vitalsForm.diastolicBp.trim() || !vitalsForm.heartRateBpm.trim() || !vitalsForm.oxygenSaturationPct.trim() || !vitalsForm.temperatureCelsius.trim()}
                          >
                            Save Vitals
                          </Button>
                          {vitalsSavedMessage && (
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                              Vitals saved
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Row: wraps on mobile with full width buttons and Conclude Visit last */}
                    {!isReadOnlyView && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setClinicalNotesText(activeAppointment.notes || '');
                            setIsNotesModalOpen(true);
                          }}
                        >
                          Record Consultation Notes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => handleOpenPrescriptionModal(activePatient.id)}
                        >
                          Prescribe
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full sm:w-auto order-last sm:order-none"
                          onClick={() => setIsConcludeModalOpen(true)}
                        >
                          Conclude Visit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No active consultation selected. Choose a patient from the queue below.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column / Order 2 on Mobile: Patient Summary Card */}
            <div className="order-2 lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {summaryPatient ? (
                    <>
                      {/* Last Visit Details */}
                      <div className="space-y-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Last Visit:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                            {lastCompletedApt?.dateTime
                              ? new Date(lastCompletedApt.dateTime).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : summaryPatient.lastVisitDate || 'None recorded'}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Last Visit Vitals:</span>
                          <div className="text-right">
                            {summaryPatient.previousVitals ? (
                              <>
                                <span className="font-medium text-slate-900 dark:text-slate-100 block">
                                  BP {summaryPatient.previousVitals.systolicBp}/{summaryPatient.previousVitals.diastolicBp} mmHg • HR {summaryPatient.previousVitals.heartRateBpm} bpm
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  SpO2 {summaryPatient.previousVitals.oxygenSaturationPct}% • Temp {summaryPatient.previousVitals.temperatureCelsius} °C
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-slate-900 dark:text-slate-100">None recorded</span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Last Reason:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-right line-clamp-2" title={lastCompletedApt?.reasonForVisit || undefined}>
                            {lastCompletedApt?.reasonForVisit || 'None recorded'}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Consulting Doctor:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                            {lastCompletedApt?.doctorName || 'None recorded'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Chronic Conditions:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                          {summaryPatient.chronicConditions && summaryPatient.chronicConditions.length > 0
                            ? deduplicateList(summaryPatient.chronicConditions).join(', ')
                            : 'None recorded'}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-slate-500 dark:text-slate-400 shrink-0">Current Medications:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                          {(() => {
                            const patientRx = prescriptions.filter(
                              (rx) => rx.patientId === summaryPatient.id
                            );
                            const activeRxMeds = deduplicateList(
                              patientRx.flatMap((rx) => rx.items.map((i) => i.medicineName))
                            );
                            if (activeRxMeds.length > 0) return activeRxMeds.join(', ');
                            if (summaryPatient.currentMedications && summaryPatient.currentMedications.length > 0) {
                              return deduplicateList(summaryPatient.currentMedications).join(', ');
                            }
                            return 'None recorded';
                          })()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                      No active consultation
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order 3 / Below Consultation and Summary: Queue Inspector & Worklist */}
            <div className="order-3 lg:col-span-3 space-y-4">
              {/* MD Clinical Queue Inspector / Staff Doctor Station Governance Bar */}
              {isMD ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        MD Clinical Queue Inspector
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
                      {/* Search Input with Interactive Dropdown and Autofill */}
                      <div className="relative w-full sm:w-80">
                        <InteractiveSearchBar
                          value={searchTerm}
                          onChange={setSearchTerm}
                          suggestions={doctorSearchSuggestions}
                          placeholder="Search patients"
                        />
                      </div>

                      {/* Attending Physician Worklist Selector */}
                      <div className="w-full sm:w-68">
                        <Select
                          icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                          searchable={true}
                          searchPlaceholder="Search physician..."
                          value={activeDoctorId}
                          placeholder="Select Attending Physician"
                          onChange={(e) => setActiveDoctorId(e.target.value)}
                          options={[
                            ...(isMD
                              ? [
                                  {
                                    value: 'all',
                                    label: `All Doctors (${appointments.length} visits)`,
                                  },
                                ]
                              : []),
                            ...doctors.map((doc) => {
                              const count = appointments.filter((a) => a.doctorId === doc.id).length;
                              return {
                                value: doc.id,
                                label: `${doc.name} (${count} visits)`,
                              };
                            }),
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Doctor Clinical Queue Inspector */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Doctor Clinical Queue Inspector
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
                      <div className="relative w-full sm:w-80">
                        <InteractiveSearchBar
                          value={searchTerm}
                          onChange={setSearchTerm}
                          suggestions={doctorSearchSuggestions}
                          placeholder="Search patients"
                        />
                      </div>

                      <div className="w-full sm:w-64">
                        <Select
                          icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                          value={filterMode}
                          placeholder="Filter Scope"
                          onChange={(e) => setFilterMode(e.target.value as 'all' | 'active' | 'urgent')}
                          options={[
                            { value: 'all', label: 'All Items' },
                            { value: 'active', label: 'Active / In Progress' },
                            { value: 'urgent', label: 'STAT / Urgent' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Waiting Consultations Worklist (Table View with stackBelow="md") */}
              <Card>
                <CardHeader
                  action={
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {filteredAppointments.length} on {activeDoctor.name}&apos;s Worklist
                    </span>
                  }
                >
                  <CardTitle>
                    {activeDoctor.name}&apos;s Consultation Worklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-0">
                  <div className="overflow-x-auto overflow-y-hidden max-w-full">
                    <Table stackBelow="lg">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-44 whitespace-nowrap">Patient</TableHead>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead className="w-24 whitespace-nowrap">Time</TableHead>
                          <TableHead hideBelow="md" className="w-32 whitespace-nowrap">Appt ID</TableHead>
                          <TableHead className="w-auto min-w-[200px]">Complaint</TableHead>
                          <TableHead className="w-36 whitespace-nowrap">Status</TableHead>
                          <TableHead isActions className="w-48 text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.length > 0 ? (
                          paginatedAppointments.map((apt) => {
                            const isCurrent = apt.id === selectedAppointmentId;
                            const isInConsultation = apt.status === 'in_consultation';

                            return (
                              <TableRow
                                key={apt.id}
                                className={isCurrent ? 'bg-teal-50/50 dark:bg-teal-950/30' : ''}
                              >
                                <TableCell isPrimary label="Patient" className="w-44 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                                  {apt.patientName}
                                </TableCell>
                                <TableCell label="Token #" className="w-12 text-center text-slate-700 dark:text-slate-300">
                                  {apt.tokenNumber}
                                </TableCell>
                                <TableCell label="Time" className="w-24 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                  {new Date(apt.dateTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </TableCell>
                                <TableCell label="Appt ID" hideBelow="md" className="w-32 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                  <TableTruncate>{apt.appointmentNumber}</TableTruncate>
                                </TableCell>
                                <TableCell
                                  label="Complaint"
                                  className="w-auto min-w-[200px] text-slate-600 dark:text-slate-300"
                                  title={apt.reasonForVisit}
                                >
                                  <span className="line-clamp-2">{apt.reasonForVisit}</span>
                                </TableCell>
                                <TableCell label="Status" className="w-36 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                  {formatAppointmentStatus(apt.status)}
                                </TableCell>
                                <TableCell isActions label="Actions" fullWidthOnStack className="w-48 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    {isInConsultation && isCurrent ? (
                                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Current patient
                                      </span>
                                    ) : (
                                      <>
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          className="whitespace-nowrap"
                                          onClick={() => setSelectedAppointmentId(apt.id)}
                                          aria-label={`View file for ${apt.patientName}`}
                                        >
                                          View File
                                        </Button>
                                        {isInConsultation ? (
                                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                            Current patient
                                          </span>
                                        ) : (
                                          !isReadOnlyView &&
                                          apt.status !== 'completed' && (
                                            <Button
                                              size="xs"
                                              variant="outline"
                                              className="whitespace-nowrap"
                                              disabled={apt.status === 'scheduled'}
                                              title={apt.status === 'scheduled' ? 'Patient has not been checked in' : undefined}
                                              onClick={() => {
                                                if (apt.status !== 'scheduled') {
                                                  handleStartConsultation(apt);
                                                }
                                              }}
                                              aria-label={`Start consultation for ${apt.patientName}`}
                                            >
                                              Start Consultation
                                            </Button>
                                          )
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="p-8 text-center text-xs text-slate-500 dark:text-slate-400"
                            >
                              No consultations found matching active search criteria on this worklist.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    currentPage={worklistPage}
                    totalItems={filteredAppointments.length}
                    pageSize={pageSize}
                    onPageChange={setWorklistPage}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 2: PATIENTS (`patients`)                                       */}
      {/* ========================================================================= */}
      {selectedTab === 'patients' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredPatients.length} Patients in Care
              </span>
            }
          >
            <CardTitle>Patients Medical Directory</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3.5">
            <div className="mb-3.5">
              <div className="w-full sm:w-80">
                <InteractiveSearchBar
                  value={patientSearchTerm}
                  onChange={handlePatientSearchChange}
                  suggestions={patientSearchSuggestions}
                  placeholder="Search patients"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-hidden max-w-full">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Patient Name</TableHead>
                    <TableHead className="w-28 whitespace-nowrap">MRN</TableHead>
                    <TableHead hideBelow="md" className="w-32 whitespace-nowrap">Demographics</TableHead>
                    <TableHead hideBelow="sm" className="w-36 whitespace-nowrap">Phone</TableHead>
                    <TableHead hideBelow="md" className="w-24 whitespace-nowrap">Blood Group</TableHead>
                    <TableHead hideBelow="sm" className="w-1/6 min-w-[140px]">Allergies</TableHead>
                    <TableHead hideBelow="lg" className="w-1/6 min-w-[140px]">Chronic Conditions</TableHead>
                    {isAdmin(currentUser) && <TableHead hideBelow="md" className="w-36 whitespace-nowrap">Assigned Doctor</TableHead>}
                    <TableHead isActions className="w-44 text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length > 0 ? (
                    paginatedPatients.map((pat) => {
                      const assignedDocId = getAssignedDoctorId(pat.id, patientAssignments);
                      const assignedDoc = doctors.find((d) => d.id === assignedDocId);
                      const activeApt = appointments.find(
                        (a) => a.patientId === pat.id && (a.status === 'in_consultation' || a.status === 'checked_in' || a.status === 'scheduled')
                      );
                      const isScheduled = activeApt?.status === 'scheduled';
                      const canAdmit = Boolean(activeApt && !isScheduled);
                      const admitTitle = !activeApt
                        ? 'No active appointment'
                        : isScheduled
                        ? 'Patient has not been checked in'
                        : undefined;
                      const isUnassigned = !assignedDocId;
                      const canTransfer = isUnassigned
                        ? isAdmin(currentUser)
                        : canTransferPatient(currentUser, pat.id, patientAssignments);

                      return (
                        <TableRow key={pat.id}>
                          <TableCell isPrimary label="Patient Name" className="w-48">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {pat.firstName} {pat.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              <TableTruncate>{pat.email}</TableTruncate>
                            </div>
                          </TableCell>
                          <TableCell label="MRN" className="w-28 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            <TableTruncate>{pat.mrn}</TableTruncate>
                          </TableCell>
                          <TableCell label="Demographics" hideBelow="md" className="w-32 whitespace-nowrap text-slate-700 dark:text-slate-300 capitalize">
                            {pat.age} yrs • {pat.gender}
                          </TableCell>
                          <TableCell label="Phone" hideBelow="sm" className="w-36 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {pat.phone}
                          </TableCell>
                          <TableCell label="Blood Group" hideBelow="md" className="w-24 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {pat.bloodGroup}
                          </TableCell>
                          <TableCell label="Allergies" hideBelow="sm" className="w-1/6 min-w-[140px] text-slate-600 dark:text-slate-400 break-words">
                            {pat.allergies && pat.allergies.length > 0 ? deduplicateList(pat.allergies).join(', ') : 'None recorded'}
                          </TableCell>
                          <TableCell label="Chronic Conditions" hideBelow="lg" className="w-1/6 min-w-[140px] text-slate-600 dark:text-slate-400 break-words">
                            {pat.chronicConditions && pat.chronicConditions.length > 0 ? deduplicateList(pat.chronicConditions).join(', ') : 'None recorded'}
                          </TableCell>
                          {isAdmin(currentUser) && (
                            <TableCell label="Assigned Doctor" hideBelow="md" className="w-36 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {assignedDoc ? assignedDoc.name : <span className="italic text-slate-400">Unassigned</span>}
                            </TableCell>
                          )}
                          <TableCell isActions label="Actions" fullWidthOnStack className="w-44 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                              {canTransfer && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="whitespace-nowrap"
                                  onClick={() => handleOpenTransferModal(pat)}
                                  aria-label={`${isUnassigned ? 'Assign' : 'Transfer'} ${pat.firstName} ${pat.lastName}`}
                                >
                                  {isUnassigned ? 'Assign' : 'Transfer'}
                                </Button>
                              )}
                              {!isReadOnlyView ? (
                                <>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="whitespace-nowrap"
                                    disabled={!canAdmit}
                                    title={admitTitle}
                                    onClick={() => {
                                      if (activeApt && canAdmit) {
                                        setSelectedAppointmentId(activeApt.id);
                                        setSelectedTab('overview');
                                      }
                                    }}
                                    aria-label={`Admit ${pat.firstName} ${pat.lastName} to desk`}
                                  >
                                    Admit to Desk
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="whitespace-nowrap"
                                    onClick={() => handleOpenPrescriptionModal(pat.id)}
                                    aria-label={`Prescribe for ${pat.firstName} ${pat.lastName}`}
                                  >
                                    Prescribe
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin(currentUser) ? 9 : 8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No patients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={patientsPage}
              totalItems={filteredPatients.length}
              pageSize={pageSize}
              onPageChange={setPatientsPage}
            />
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 3: WRITE PRESCRIPTIONS (`prescriptions`)                       */}
      {/* ========================================================================= */}
      {selectedTab === 'prescriptions' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredPrescriptions.length} Prescriptions
              </span>
            }
          >
            <CardTitle>e-Prescription Master Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3.5">
            <div className="mb-3.5">
              <div className="w-full sm:w-80">
                <InteractiveSearchBar
                  value={prescriptionSearchTerm}
                  onChange={handlePrescriptionSearchChange}
                  suggestions={prescriptionSearchSuggestions}
                  placeholder="Search prescriptions"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-hidden max-w-full">
              <Table stackBelow="lg">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-2/12 min-w-[150px]">Patient Name</TableHead>
                    <TableHead className="w-1/12 min-w-[90px]">Rx #</TableHead>
                    <TableHead hideBelow="sm" className="w-1/12 min-w-[100px]">Issue Date</TableHead>
                    <TableHead className="w-3/12 min-w-[180px]">Diagnosis</TableHead>
                    <TableHead className="w-4/12 min-w-[240px]">Prescribed Regimen</TableHead>
                    <TableHead isActions className="w-1/12 min-w-[90px] text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.length > 0 ? (
                    paginatedPrescriptions.map((rx) => (
                      <TableRow key={rx.id}>
                        <TableCell isPrimary label="Patient Name" className="w-2/12 min-w-[150px] font-semibold text-slate-900 dark:text-slate-100">
                          {rx.patientName}
                        </TableCell>
                        <TableCell label="Rx #" className="w-1/12 min-w-[90px] text-slate-700 dark:text-slate-300">
                          <TableTruncate>{rx.prescriptionNumber}</TableTruncate>
                        </TableCell>
                        <TableCell label="Issue Date" hideBelow="sm" className="w-1/12 min-w-[100px] text-slate-600 dark:text-slate-400">
                          {rx.date}
                        </TableCell>
                        <TableCell label="Diagnosis" className="w-3/12 min-w-[180px] text-slate-800 dark:text-slate-200 font-medium break-words">
                          {rx.diagnosis}
                        </TableCell>
                        <TableCell label="Prescribed Regimen" className="w-4/12 min-w-[240px]">
                          <div className="space-y-1 whitespace-normal break-words">
                            {rx.items && rx.items.length > 0 ? (
                              rx.items.map((item, idx) => {
                                if (typeof (item as unknown) === 'string') {
                                  return (
                                    <div key={idx} className="text-slate-700 dark:text-slate-300 whitespace-normal break-words">
                                      <span className="font-bold text-slate-900 dark:text-slate-100">{item as unknown as string}</span>
                                    </div>
                                  );
                                }
                                const details = [item.dosage, item.frequency].filter(Boolean).join(', ');
                                return (
                                  <div key={item.id || idx} className="text-slate-700 dark:text-slate-300 whitespace-normal break-words">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {item.medicineName}
                                    </span>
                                    {details && (
                                      <span className="text-slate-500 dark:text-slate-400"> • {details}</span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell isActions label="Actions" fullWidthOnStack className="w-1/12 min-w-[90px] text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            <Button
                              size="xs"
                              variant="outline"
                              className="whitespace-nowrap"
                              onClick={() => setViewingPrescription(rx)}
                              aria-label={`View prescription ${rx.prescriptionNumber}`}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No prescriptions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={prescriptionsPage}
              totalItems={filteredPrescriptions.length}
              pageSize={pageSize}
              onPageChange={setPrescriptionsPage}
            />
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: WRITE PRESCRIPTION                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        title="Issue Medical Prescription (e-Rx)"
        description="Prescribed medications are immediately logged into the central dispensary."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrescriptionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<FilePlus className="w-4 h-4" />}
              onClick={handleSavePrescription}
            >
              Sign & Issue Prescription
            </Button>
          </>
        }
      >
        <form onSubmit={handleSavePrescription} className="space-y-4" noValidate>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Allergies:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {(() => {
                const prescPatient = patients.find((p) => p.id === prescPatientId) || activePatient;
                return prescPatient?.allergies && prescPatient.allergies.length > 0
                  ? prescPatient.allergies.join(', ')
                  : 'None recorded';
              })()}
            </span>
          </div>

          {prescriptionError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
              {prescriptionError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Select Patient"
              searchable={true}
              searchPlaceholder="Search patient by name or MRN..."
              value={prescPatientId}
              onChange={(e) => {
                setPrescPatientId(e.target.value);
                if (prescriptionError) setPrescriptionError('');
              }}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName} (${p.mrn})`,
              }))}
            />
            <Input
              label="Primary Clinical Diagnosis"
              value={diagnosis}
              onChange={(e) => {
                setDiagnosis(e.target.value);
                if (prescriptionError) setPrescriptionError('');
              }}
              placeholder="e.g. Essential Hypertension, Bronchitis"
              error={!diagnosis.trim() && prescriptionError ? 'Clinical diagnosis is required' : undefined}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Prescribed Medications
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddMedicationRow}
              >
                Add Medication
              </Button>
            </div>

            {prescriptionItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="grid grid-cols-3 gap-2.5">
                  <Input
                    label="Medicine Name"
                    value={item.medicineName}
                    onChange={(e) => handleUpdateMedication(idx, 'medicineName', e.target.value)}
                    placeholder="e.g. Amlodipine Besylate"
                  />
                  <Input
                    label="Dosage"
                    value={item.dosage}
                    onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                    placeholder="e.g. 5 mg"
                  />
                  <Input
                    label="Frequency"
                    value={item.frequency}
                    onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                    placeholder="e.g. Once daily"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    label="Duration"
                    value={item.duration}
                    onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                    placeholder="e.g. 30 days"
                  />
                  <Input
                    label="Instructions"
                    value={item.instructions}
                    onChange={(e) => handleUpdateMedication(idx, 'instructions', e.target.value)}
                    placeholder="e.g. Take after breakfast"
                  />
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD CONSULTATION NOTES                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title={`Clinical Consultation Notes: ${activePatient?.firstName} ${activePatient?.lastName}`}
        description="Records are permanently appended to the electronic medical record."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotesModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveConsultationNotes}
            >
              Save Notes to EMR
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveConsultationNotes} className="space-y-4" noValidate>
          {notesError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
              {notesError}
            </div>
          )}
          <Textarea
            label="Physician Assessment & Clinical Plan"
            value={clinicalNotesText}
            onChange={(e) => {
              setClinicalNotesText(e.target.value);
              if (notesError) setNotesError('');
            }}
            placeholder="Document physical examination findings, treatment response, and follow-up plan..."
            rows={4}
            error={!clinicalNotesText.trim() && notesError ? 'Notes are required' : undefined}
          />
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CONCLUDE VISIT CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {activePatient && activeAppointment && (
        <Modal
          isOpen={isConcludeModalOpen}
          onClose={() => setIsConcludeModalOpen(false)}
          title={`Conclude visit for ${activePatient.firstName} ${activePatient.lastName}?`}
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConcludeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleConcludeConsultation(activeAppointment.id, activePatient.firstName);
                  setIsConcludeModalOpen(false);
                }}
              >
                Conclude
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p>
              Are you sure you want to conclude the consultation for {activePatient.firstName} {activePatient.lastName}?
            </p>
            {hasVitalsChanged && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Vitals have unsaved changes.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIEW PRESCRIPTION DETAILS                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!viewingPrescription}
        onClose={() => setViewingPrescription(null)}
        title="Electronic Prescription Record"
        maxWidth="lg"
        fullScreenOnMobile={true}
        footer={
          <div className="flex justify-end w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingPrescription(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {viewingPrescription && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Prescription Number</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{viewingPrescription.prescriptionNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Issue Date</span>
                <span className="text-slate-900 dark:text-slate-100">{viewingPrescription.date}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Patient Name & MRN</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {viewingPrescription.patientName} {viewingPatient?.mrn ? `(${viewingPatient.mrn})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Issuing Physician</span>
                <span className="text-slate-900 dark:text-slate-100">{viewingPrescription.doctorName}</span>
              </div>
            </div>

            <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Diagnosis:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">{viewingPrescription.diagnosis}</span>
              </div>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Allergies:</span>
                <span className="text-slate-700 dark:text-slate-300 text-right">
                  {viewingPatient?.allergies && viewingPatient.allergies.length > 0
                    ? deduplicateList(viewingPatient.allergies).join(', ')
                    : 'None recorded'}
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-2 text-xs">
                Prescribed Regimen
              </span>
              <div className="space-y-2.5">
                {viewingPrescription.items.map((item, idx) => {
                  if (typeof (item as unknown) === 'string') {
                    return (
                      <div key={idx} className="text-slate-700 dark:text-slate-300 font-bold text-slate-900 dark:text-slate-100">
                        {item as unknown as string}
                      </div>
                    );
                  }
                  const details = [item.dosage, item.frequency, item.duration].filter(Boolean).join(', ');
                  return (
                    <div key={item.id || idx} className="text-slate-700 dark:text-slate-300">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {item.medicineName}
                      </div>
                      {details && (
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          {details}
                        </div>
                      )}
                      {item.instructions && (
                        <div className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                          {item.instructions}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: TRANSFER / ASSIGN PATIENT CARE                                    */}
      {/* ========================================================================= */}
      {transferTargetPatient && (
        <Modal
          isOpen={!!transferTargetPatient}
          onClose={() => setTransferTargetPatient(null)}
          title={
            isTargetPatientUnassigned
              ? `Assign Care: ${transferTargetPatient.firstName} ${transferTargetPatient.lastName}`
              : `Transfer Care: ${transferTargetPatient.firstName} ${transferTargetPatient.lastName}`
          }
          maxWidth="lg"
          overflowVisible={true}
          bodyClassName="min-h-[280px]"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferTargetPatient(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={
                  targetPatientInConsultation ||
                  !targetDoctorId ||
                  !isDoctorAvailable(targetDoctorId) ||
                  doctors.filter(
                    (d) =>
                      d.status === 'active' &&
                      d.id !== getAssignedDoctorId(transferTargetPatient.id, patientAssignments) &&
                      isDoctorAvailable(d.id)
                  ).length === 0
                }
                onClick={handleConfirmTransfer}
              >
                {isTargetPatientUnassigned ? 'Confirm Assignment' : 'Confirm Transfer'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {targetPatientInConsultation && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200">
                Conclude the current consultation before transferring.
              </div>
            )}
            {transferError && !targetPatientInConsultation && (
              <div className="p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded text-xs">
                {transferError}
              </div>
            )}
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Current Assigned Physician</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {doctors.find((d) => d.id === getAssignedDoctorId(transferTargetPatient.id, patientAssignments))?.name || 'Unassigned'}
              </span>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                {isTargetPatientUnassigned ? 'Assigned Physician' : 'Receiving Physician'}
              </label>
              {(() => {
                const availableCandidateDocs = doctors.filter(
                  (d) =>
                    d.status === 'active' &&
                    d.id !== getAssignedDoctorId(transferTargetPatient.id, patientAssignments) &&
                    isDoctorAvailable(d.id)
                );
                if (availableCandidateDocs.length === 0) {
                  return (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200">
                      No doctors available
                    </div>
                  );
                }
                return (
                  <Select
                    size="lg"
                    searchable={true}
                    searchPlaceholder="Search physician by name or specialization..."
                    value={targetDoctorId}
                    onChange={(e) => setTargetDoctorId(e.target.value)}
                    options={availableCandidateDocs.map((d) => ({
                      value: d.id,
                      label: `${d.name} (${d.specialization})`,
                    }))}
                  />
                );
              })()}
              {targetDoctorId && !isDoctorAvailable(targetDoctorId) && (
                <div className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                  Doctor is not available today
                </div>
              )}
            </div>
            <div>
              <label className="text-slate-700 dark:text-slate-300 block font-medium mb-1.5">
                {isTargetPatientUnassigned ? 'Clinical Assignment Reason' : 'Clinical Transfer Reason'}
              </label>
              <Textarea
                rows={3}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder={
                  isTargetPatientUnassigned
                    ? 'Document clinical indication for this initial physician assignment...'
                    : 'Document clinical indication or continuity rationale for this transfer...'
                }
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
