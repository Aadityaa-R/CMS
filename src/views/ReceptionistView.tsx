import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, KpiCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { Table, ColumnDef } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { DictationButton } from '@/components/ui/DictationButton';
import { RowActions, RowActionItem } from '@/components/ui/RowActions';
import { Activity, Pill, Calendar } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { Appointment, Patient, AccessAuditLogEntry } from '@/types';
import { getScopedPatients, getScopedAppointments } from '@/lib/selectors';
import { getAssignedDoctorId, hasCapability } from '@/lib/permissions';
import { isDoctorAvailable, getStoredAttendanceData } from '@/lib/availability';
import { getAvailableSlots, validateBooking } from '@/lib/scheduling';
import { getRepository } from '@/data/storage';
import { ClaimRequest, Account } from '@/types/storage';
import {
  calculateWaitTimeMinutes,
  getTodayIntakeLogs,
  IntakeLogEntry,
  validateWalkInNewArrival,
  validateWalkInExistingArrival,
  validateBookedArrival,
} from '@/lib/reception';
import { useBilling } from '@/context/BillingContext';
import { formatCurrency, balanceDue } from '@/lib/billing';
import { formatDoctorName } from '@/lib/doctorNames';
import { formatLocalDate, formatDate, formatTime } from '@/lib/time';

interface ReceptionistViewProps {
  activeTab?: string;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({ activeTab = 'lounge' }) => {
  const { currentUser, currentRole, addAuditLogEntry } = useAuth();
  const { addNotification } = useNotifications();
  const isMD = currentRole === 'md' || currentRole === 'admin' || currentUser?.role === 'md';

  // Map legacy and new tab ids
  const normalizeTab = (tabId: string): string => {
    if (tabId === 'overview' || tabId === 'lounge') return 'lounge';
    if (tabId === 'checkin' || tabId === 'appointments') return 'appointments';
    if (tabId === 'registration' || tabId === 'patients') return 'patients';
    if (tabId === 'intake' || tabId === 'registry') return 'registry';
    return tabId;
  };

  const [selectedTab, setSelectedTab] = useState<string>(normalizeTab(activeTab));

  useEffect(() => {
    if (activeTab) {
      setSelectedTab(normalizeTab(activeTab));
    }
  }, [activeTab]);

  const {
    appointments: rawAppointments,
    patients: rawPatients,
    doctors,
    patientAssignments = [],
    modules = [],
    vitals = [],
    prescriptions = [],
    registerPatient,
    updatePatient,
    transferPatient,
    checkInAppointment,
    checkInWalkIn,
    bookAppointment,
    updateAppointmentStatus,
  } = useClinic();
  const { invoices: billingInvoices, payments: billingPayments } = useBilling();

  const patients = useMemo(() => {
    return getScopedPatients(currentUser, rawPatients, patientAssignments, null, modules);
  }, [currentUser, rawPatients, patientAssignments, modules]);

  const appointments = useMemo(() => {
    return getScopedAppointments(currentUser, rawAppointments, patientAssignments, null, modules);
  }, [currentUser, rawAppointments, patientAssignments, modules]);

  const todayStr = useMemo(() => formatLocalDate(), []);

  // Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [registryFilter, setRegistryFilter] = useState<'all' | 'Registration' | 'Check-in'>('all');

  // Agenda Date for Appointments Tab (defaults to today)
  const [agendaDate, setAgendaDate] = useState<string>(todayStr);

  // Pagination States (10 records per page)
  const [loungePage, setLoungePage] = useState(1);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [patientsPage, setPatientsPage] = useState(1);
  const [registryPage, setRegistryPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setLoungePage(1);
    setAppointmentsPage(1);
    setPatientsPage(1);
    setRegistryPage(1);
  }, [searchTerm, registryFilter, agendaDate]);

  // Modals Visibility
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Walk-In Flow State (New vs Existing)
  const [walkInMode, setWalkInMode] = useState<'existing' | 'new'>('existing');
  const [walkInPatientId, setWalkInPatientId] = useState<string>('');
  const [walkInDoctorId, setWalkInDoctorId] = useState<string>('');
  const [walkInReason, setWalkInReason] = useState<string>('');
  const [walkInError, setWalkInError] = useState<string>('');

  // Walk-In New Patient Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDob, setNewDob] = useState('1990-01-01');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newEmergName, setNewEmergName] = useState('');
  const [newEmergPhone, setNewEmergPhone] = useState('');

  // Register Patient Form State (Standalone)
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDob, setRegDob] = useState('1990-01-01');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmergName, setRegEmergName] = useState('');
  const [regEmergPhone, setRegEmergPhone] = useState('');
  const [regError, setRegError] = useState('');

  // Edit Patient Form State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editDob, setEditDob] = useState('1990-01-01');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('other');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergName, setEditEmergName] = useState('');
  const [editEmergPhone, setEditEmergPhone] = useState('');
  const [editEmergRel, setEditEmergRel] = useState('');
  const [editError, setEditError] = useState('');

  // Book Appointment Form State
  const [bookPatientId, setBookPatientId] = useState<string>('');
  const [bookDoctorId, setBookDoctorId] = useState<string>('');
  const [bookDate, setBookDate] = useState<string>(todayStr);
  const [bookTime, setBookTime] = useState<string>('09:30');
  const [bookReason, setBookReason] = useState<string>('');
  const bookReasonInputRef = useRef<HTMLInputElement | null>(null);
  const [bookError, setBookError] = useState<string>('');

  // Patient Record Modal State
  const [recordPatient, setRecordPatient] = useState<Patient | null>(null);
  const handleOpenViewRecord = (pat: Patient) => {
    const fullPatient = rawPatients.find((p) => p.id === pat.id) || pat;
    setRecordPatient(fullPatient);
  };

  // Transfer Modal State
  const [transferTargetPatient, setTransferTargetPatient] = useState<Patient | null>(null);
  const [targetDoctorId, setTargetDoctorId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferError, setTransferError] = useState<string>('');

  const targetPatientInConsultation = useMemo(() => {
    if (!transferTargetPatient) return false;
    return rawAppointments.some(
      (a) => a.patientId === transferTargetPatient.id && a.status === 'in_consultation'
    );
  }, [transferTargetPatient, rawAppointments]);

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
        isDoctorAvailable(d.id, todayStr)
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
    if (!isDoctorAvailable(targetDoctorId, todayStr)) {
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
      currentUser?.id,
      currentUser?.name,
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

    if (addAuditLogEntry) {
      addAuditLogEntry({
        targetRole: 'patient',
        targetStaffName: `${transferTargetPatient.firstName} ${transferTargetPatient.lastName}`,
        targetUserId: transferTargetPatient.id,
        action: 'permission_updated',
        description: isTargetPatientUnassigned
          ? `Patient assigned to ${newDocName}.${movedText} Reason: ${transferReason.trim()}`
          : `Patient care transferred from ${oldDocName} to ${newDocName}.${movedText} Reason: ${transferReason.trim()}`,
        authorizedBy: currentUser?.name || 'Reception Staff',
      });
    }

    if (addNotification) {
      addNotification({
        recipientId: targetDoctorId,
        title: isTargetPatientUnassigned ? 'New Patient Assigned' : 'Patient Care Transferred',
        message: isTargetPatientUnassigned
          ? `Patient ${transferTargetPatient.firstName} ${transferTargetPatient.lastName} (${transferTargetPatient.mrn}) assigned to your care by ${currentUser?.name || 'Reception'}.`
          : `Patient ${transferTargetPatient.firstName} ${transferTargetPatient.lastName} (${transferTargetPatient.mrn}) transferred to your care by ${currentUser?.name || 'Reception'}.${movedText}`,
        type: 'general',
        linkTab: 'consultation',
      }).catch(() => {});
    }

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

  // Tab 1: Waiting Lounge Data
  const loungeAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const aptDate = a.dateTime ? a.dateTime.slice(0, 10) : '';
        const checkInDate = a.checkedInAt ? a.checkedInAt.slice(0, 10) : '';
        const isToday = checkInDate === todayStr || (aptDate === todayStr && a.status !== 'scheduled');
        return isToday && (a.status === 'checked_in' || a.status === 'in_consultation' || a.status === 'completed');
      })
      .filter((a) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          a.patientName.toLowerCase().includes(term) ||
          a.doctorName.toLowerCase().includes(term) ||
          String(a.tokenNumber).includes(term)
        );
      })
      .sort((a, b) => {
        const timeA = a.checkedInAt || a.dateTime;
        const timeB = b.checkedInAt || b.dateTime;
        return timeA.localeCompare(timeB);
      });
  }, [appointments, todayStr, searchTerm]);

  // Tab 1 KPI Stats
  const totalCheckedIn = loungeAppointments.length;
  const currentlyWaiting = loungeAppointments.filter((a) => a.status === 'checked_in').length;
  const inConsultation = loungeAppointments.filter((a) => a.status === 'in_consultation').length;
  const completedToday = loungeAppointments.filter((a) => a.status === 'completed').length;

  const paginatedLounge = useMemo(() => {
    return loungeAppointments.slice((loungePage - 1) * pageSize, loungePage * pageSize);
  }, [loungeAppointments, loungePage, pageSize]);

  // Tab 2: Appointments Data (Agenda)
  const agendaAppointments = useMemo(() => {
    return appointments
      .filter((apt) => {
        const d = apt.dateTime ? apt.dateTime.slice(0, 10) : '';
        return d === agendaDate;
      })
      .filter((apt) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          apt.patientName.toLowerCase().includes(term) ||
          apt.doctorName.toLowerCase().includes(term) ||
          apt.appointmentNumber.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [appointments, agendaDate, searchTerm]);

  const paginatedAppointments = useMemo(() => {
    return agendaAppointments.slice((appointmentsPage - 1) * pageSize, appointmentsPage * pageSize);
  }, [agendaAppointments, appointmentsPage, pageSize]);

  // Tab 3: Patient Directory Data
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      return fullName.includes(term) || p.mrn.toLowerCase().includes(term) || p.phone.includes(term);
    });
  }, [patients, searchTerm]);

  const paginatedPatients = useMemo(() => {
    return filteredPatients.slice((patientsPage - 1) * pageSize, patientsPage * pageSize);
  }, [filteredPatients, patientsPage, pageSize]);

  // Tab 4: Intake Registry Data
  const intakeLogs = useMemo(() => {
    const rawLogs = getTodayIntakeLogs(patients, appointments, todayStr);
    return rawLogs
      .filter((entry) => {
        if (registryFilter === 'all') return true;
        return entry.type === registryFilter;
      })
      .filter((entry) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          entry.patientName.toLowerCase().includes(term) ||
          entry.details.toLowerCase().includes(term) ||
          entry.performedBy.toLowerCase().includes(term)
        );
      });
  }, [patients, appointments, todayStr, registryFilter, searchTerm]);

  const paginatedRegistry = useMemo(() => {
    return intakeLogs.slice((registryPage - 1) * pageSize, registryPage * pageSize);
  }, [intakeLogs, registryPage, pageSize]);

  // Tab 4: Account Link Requests State
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [claimsPage, setClaimsPage] = useState(1);
  const [rejectClaimTarget, setRejectClaimTarget] = useState<ClaimRequest | null>(null);
  const [rejectClaimReason, setRejectClaimReason] = useState('');
  const [claimNotification, setClaimNotification] = useState<string | null>(null);

  const canManageRegistration = hasCapability(currentUser, 'patientRegistration');

  useEffect(() => {
    try {
      let isMounted = true;
      const repo = getRepository<ClaimRequest>('claimRequests');
      repo.list().then((claims) => {
        if (isMounted) setClaimRequests(claims);
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  const paginatedClaims = useMemo(() => {
    return claimRequests.slice((claimsPage - 1) * pageSize, claimsPage * pageSize);
  }, [claimRequests, claimsPage, pageSize]);

  const pendingClaimsCount = useMemo(() => {
    return claimRequests.filter((c) => c.status === 'pending').length;
  }, [claimRequests]);

  const handleApproveClaim = async (claim: ClaimRequest) => {
    if (!canManageRegistration) return;
    const now = new Date().toISOString();
    const updatedClaim: ClaimRequest = {
      ...claim,
      status: 'approved',
      decidedBy: currentUser?.name || 'Reception Desk',
      decidedAt: now,
    };

    const repoClaims = getRepository<ClaimRequest>('claimRequests');
    await repoClaims.update(claim.id, updatedClaim);

    const repoAccounts = getRepository<Account>('accounts');
    const acc = await repoAccounts.get(claim.accountId);
    if (acc) {
      await repoAccounts.update(acc.id, {
        claimPending: false,
        linkedPatientId: claim.existingPatientId,
        updatedAt: now,
      });
    }

    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
    await repoLedger.create({
      id: `audit-${Date.now()}`,
      timestamp: now,
      action: 'account_link_approved',
      subject: claim.accountName,
      role: 'patient',
      details: `Approved account link to MRN ${claim.existingMrn} for ${claim.accountName}`,
      authorizedBy: currentUser?.name || 'Receptionist',
    });

    setClaimRequests((prev) => prev.map((c) => (c.id === claim.id ? updatedClaim : c)));
    setClaimNotification(`Approved account link for ${claim.accountName} (MRN: ${claim.existingMrn}).`);
  };

  const handleRejectClaim = async () => {
    if (!rejectClaimTarget || !canManageRegistration) return;
    const now = new Date().toISOString();
    const reason = rejectClaimReason.trim() || 'Link request rejected by Front Desk';
    const updatedClaim: ClaimRequest = {
      ...rejectClaimTarget,
      status: 'rejected',
      decisionNote: reason,
      decidedBy: currentUser?.name || 'Reception Desk',
      decidedAt: now,
    };

    const repoClaims = getRepository<ClaimRequest>('claimRequests');
    await repoClaims.update(rejectClaimTarget.id, updatedClaim);

    const repoAccounts = getRepository<Account>('accounts');
    const acc = await repoAccounts.get(rejectClaimTarget.accountId);
    if (acc) {
      await repoAccounts.update(acc.id, {
        claimPending: false,
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: now,
      });
    }

    const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
    await repoLedger.create({
      id: `audit-${Date.now()}`,
      timestamp: now,
      action: 'account_link_rejected',
      subject: rejectClaimTarget.accountName,
      role: 'patient',
      details: `Rejected account link to MRN ${rejectClaimTarget.existingMrn}: ${reason}`,
      authorizedBy: currentUser?.name || 'Receptionist',
    });

    setClaimRequests((prev) => prev.map((c) => (c.id === rejectClaimTarget.id ? updatedClaim : c)));
    setClaimNotification(`Rejected account link for ${rejectClaimTarget.accountName}.`);
    setRejectClaimTarget(null);
    setRejectClaimReason('');
  };

  // Search Bar Suggestions
  const searchSuggestions: SearchSuggestion[] = useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    appointments.forEach((apt) => {
      if (apt.patientName && !seen.has(apt.patientName.toLowerCase())) {
        seen.add(apt.patientName.toLowerCase());
        list.push({
          label: apt.patientName,
          category: 'Appointment',
          sublabel: `Token #${apt.tokenNumber || '-'} - ${apt.reasonForVisit}`,
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
          sublabel: `${p.mrn} - ${p.phone}`,
        });
      }
    });
    return list;
  }, [appointments, patients]);

  // Action Handlers
  const handleCallNext = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'in_consultation', currentUser);
    showNotification(`Patient ${apt.patientName} called for Dr. ${apt.doctorName}.`);
  };

  const handleMarkCompleted = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'completed', currentUser);
    showNotification(`Consultation for ${apt.patientName} marked completed.`);
  };

  const handleCheckInBooked = (apt: Appointment) => {
    const validation = validateBookedArrival(currentUser, apt, todayStr);
    if (!validation.allowed) {
      showNotification(validation.reason || 'Check-in validation failed.');
      return;
    }
    const result = checkInAppointment(apt.id, currentUser, todayStr);
    if (result.success && result.appointment) {
      showNotification(
        `Patient ${result.appointment.patientName} checked in. Token #${result.appointment.tokenNumber} issued.`
      );
    } else {
      showNotification(result.error || 'Failed to check in appointment.');
    }
  };

  const handleOpenEditPatient = (p: Patient) => {
    setEditingPatient(p);
    setEditFirstName(p.firstName || '');
    setEditLastName(p.lastName || '');
    setEditDob(p.dob || '1990-01-01');
    setEditGender(p.gender || 'other');
    setEditPhone(p.phone || '');
    setEditEmail(p.email || '');
    setEditAddress(p.address || '');
    setEditEmergName(p.emergencyContact?.name || '');
    setEditEmergPhone(p.emergencyContact?.phone || '');
    setEditEmergRel(p.emergencyContact?.relationship || 'Emergency Contact');
    setEditError('');
    setIsEditOpen(true);
  };

  const handleSubmitEditPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingPatient) return;

    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError('Patient first and last name are required.');
      return;
    }
    if (!editPhone.trim()) {
      setEditError('Phone number is required.');
      return;
    }

    const birthYear = parseInt(editDob.split('-')[0], 10);
    const calcAge = isNaN(birthYear) ? editingPatient.age : Math.max(0, new Date().getFullYear() - birthYear);

    updatePatient(editingPatient.id, {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      dob: editDob,
      age: calcAge,
      gender: editGender,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      address: editAddress.trim(),
      emergencyContact: {
        name: editEmergName.trim() || editingPatient.emergencyContact?.name || 'Primary Contact',
        relationship: editEmergRel.trim() || editingPatient.emergencyContact?.relationship || 'Emergency Contact',
        phone: editEmergPhone.trim() || editPhone.trim(),
      },
    });

    setIsEditOpen(false);
    showNotification(`Patient information updated for ${editFirstName.trim()} ${editLastName.trim()} (${editingPatient.mrn}).`);
  };

  // Submit Standalone Patient Registration
  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('Patient first and last name are required.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Phone number is required.');
      return;
    }

    const birthYear = parseInt(regDob.split('-')[0], 10);
    const calcAge = isNaN(birthYear) ? 30 : Math.max(0, new Date().getFullYear() - birthYear);

    const regResult = registerPatient(
      {
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        dob: regDob,
        age: calcAge,
        gender: 'other',
        phone: regPhone.trim(),
        email: regEmail.trim(),
        address: regAddress.trim() || 'Outpatient Address',
        allergies: [],
        chronicConditions: [],
        emergencyContact: {
          name: regEmergName.trim() || 'Primary Contact',
          relationship: 'Emergency Contact',
          phone: regEmergPhone.trim() || regPhone.trim(),
        },
      },
      currentUser
    );

    if (!regResult.success || !regResult.patient) {
      setRegError(regResult.error || 'Could not register patient.');
      return;
    }

    const createdPat = regResult.patient;
    setIsRegisterOpen(false);
    showNotification(`Patient registered: ${createdPat.firstName} ${createdPat.lastName} (${createdPat.mrn}).`);

    // Reset form
    setRegFirstName('');
    setRegLastName('');
    setRegPhone('');
    setRegEmail('');
    setRegAddress('');
    setRegEmergName('');
    setRegEmergPhone('');
  };

  // Submit Walk-in Check-In (Flow A or Flow B)
  const handleSubmitWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError('');

    if (walkInMode === 'new') {
      // Flow A: New Walk-in Patient
      const validation = validateWalkInNewArrival(
        currentUser,
        {
          firstName: newFirstName,
          lastName: newLastName,
          dob: newDob,
          phone: newPhone,
          doctorId: walkInDoctorId,
          chiefComplaint: walkInReason,
        },
        todayStr
      );

      if (!validation.allowed) {
        setWalkInError(validation.reason || 'Validation failed.');
        return;
      }

      const birthYear = parseInt(newDob.split('-')[0], 10);
      const calcAge = isNaN(birthYear) ? 30 : Math.max(0, new Date().getFullYear() - birthYear);

      // 1. Register Demographics
      const regResult = registerPatient(
        {
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          dob: newDob,
          age: calcAge,
          gender: 'other',
          phone: newPhone.trim(),
          email: newEmail.trim(),
          address: newAddress.trim() || 'Outpatient Address',
          allergies: [],
          chronicConditions: [],
          emergencyContact: {
            name: newEmergName.trim() || 'Primary Contact',
            relationship: 'Emergency Contact',
            phone: newEmergPhone.trim() || newPhone.trim(),
          },
        },
        currentUser
      );

      if (!regResult.success || !regResult.patient) {
        setWalkInError(regResult.error || 'Registration failed.');
        return;
      }

      // 2. Check In with initial doctor assignment
      const checkInRes = checkInWalkIn(
        {
          patientId: regResult.patient.id,
          doctorId: walkInDoctorId,
          reasonForVisit: walkInReason.trim(),
          isNewPatient: true,
        },
        currentUser,
        todayStr
      );

      if (!checkInRes.success || !checkInRes.appointment) {
        setWalkInError(checkInRes.error || 'Check-in failed.');
        return;
      }

      setIsWalkInOpen(false);
      showNotification(
        `New walk-in registered and admitted. Token #${checkInRes.appointment.tokenNumber} issued for ${formatDoctorName(checkInRes.appointment.doctorName)}.`
      );

      // Reset
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setNewEmergName('');
      setNewEmergPhone('');
      setWalkInReason('');
    } else {
      // Flow B: Registered Walk-in Patient
      const validation = validateWalkInExistingArrival(
        currentUser,
        walkInPatientId,
        patientAssignments,
        todayStr
      );

      if (!validation.allowed) {
        setWalkInError(validation.reason || 'Check-in validation failed.');
        return;
      }

      if (!walkInReason.trim()) {
        setWalkInError('Reason for visit is required.');
        return;
      }

      const assignedDocId = getAssignedDoctorId(walkInPatientId, patientAssignments) || '';
      const checkInRes = checkInWalkIn(
        {
          patientId: walkInPatientId,
          doctorId: assignedDocId,
          reasonForVisit: walkInReason.trim(),
          isNewPatient: false,
        },
        currentUser,
        todayStr
      );

      if (!checkInRes.success || !checkInRes.appointment) {
        setWalkInError(checkInRes.error || 'Check-in failed.');
        return;
      }

      setIsWalkInOpen(false);
      showNotification(
        `Walk-in admitted. Token #${checkInRes.appointment.tokenNumber} issued for ${formatDoctorName(checkInRes.appointment.doctorName)}.`
      );
      setWalkInReason('');
    }
  };

  // Available booking slots for selected doctor and date
  const availableBookingSlots = useMemo(() => {
    if (!bookDoctorId || !bookDate) return [];
    const attendanceData = getStoredAttendanceData();
    return getAvailableSlots(
      bookDoctorId,
      bookDate,
      appointments,
      attendanceData.shifts,
      attendanceData.leaves,
      new Date()
    );
  }, [bookDoctorId, bookDate, appointments]);

  useEffect(() => {
    if (availableBookingSlots.length > 0 && !availableBookingSlots.includes(bookTime)) {
      setBookTime(availableBookingSlots[0]);
    }
  }, [availableBookingSlots, bookTime]);

  // Submit Consultation Booking
  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookError('');

    if (!bookPatientId) {
      setBookError('Patient selection is required.');
      return;
    }
    if (!bookDoctorId) {
      setBookError('Attending physician selection is required.');
      return;
    }
    if (!bookTime) {
      setBookError('Please select an available time slot.');
      return;
    }

    const attendanceData = getStoredAttendanceData();
    const validation = validateBooking(
      bookDoctorId,
      bookDate,
      bookTime,
      bookPatientId,
      appointments,
      attendanceData.shifts,
      attendanceData.leaves,
      new Date()
    );

    if (!validation.allowed) {
      setBookError(validation.reason || 'Booking validation failed.');
      return;
    }

    const dateTime = `${bookDate}T${bookTime}:00`;
    const res = bookAppointment(
      {
        patientId: bookPatientId,
        doctorId: bookDoctorId,
        dateTime,
        reasonForVisit: bookReason.trim(),
        source: 'reception',
      },
      currentUser
    );

    if (!res.success || !res.appointment) {
      setBookError(res.error || 'Failed to book appointment.');
      return;
    }

    setIsBookOpen(false);
    showNotification(`Appointment booked for ${res.appointment.patientName} on ${bookDate} at ${bookTime}.`);
    setBookReason('');
  };

  // Active doctor assignment helper for existing walk-in flow
  const currentAssignedDocId = walkInPatientId
    ? getAssignedDoctorId(walkInPatientId, patientAssignments)
    : null;
  const currentAssignedDoc = doctors.find((d) => d.id === currentAssignedDocId);
  const isAssignedDocAvailableToday = currentAssignedDocId
    ? isDoctorAvailable(currentAssignedDocId, todayStr)
    : false;

  // Available doctors today for new walk-ins
  const availableDoctorsToday = useMemo(() => {
    return doctors.filter((d) => isDoctorAvailable(d.id, todayStr));
  }, [doctors, todayStr]);

  // Available doctors on chosen booking date
  const availableDoctorsOnBookDate = useMemo(() => {
    return doctors.filter((d) => isDoctorAvailable(d.id, bookDate));
  }, [doctors, bookDate]);

  // Table Columns Definitions
  const loungeColumns: ColumnDef<Appointment>[] = [
    {
      key: 'token',
      header: 'Token',
      kind: 'short',
      priority: 2,
      render: (apt) => <span className="font-semibold text-slate-900 dark:text-slate-100">{apt.tokenNumber > 0 ? `#${apt.tokenNumber}` : '-'}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      isPrimary: true,
      kind: 'short',
      priority: 1,
      render: (apt) => <span className="font-medium text-slate-900 dark:text-slate-100">{apt.patientName}</span>,
    },
    {
      key: 'doctor',
      header: 'Doctor',
      kind: 'short',
      priority: 7,
      render: (apt) => <span>{apt.doctorName}</span>,
    },
    {
      key: 'arrivalTime',
      header: 'Arrival Time',
      kind: 'short',
      priority: 5,
      render: (apt) => <span>{formatTime(apt.checkedInAt || apt.dateTime)}</span>,
    },
    {
      key: 'waitTime',
      header: 'Wait Time',
      kind: 'short',
      priority: 6,
      render: (apt) => <span>{calculateWaitTimeMinutes(apt.checkedInAt)} min</span>,
    },
    {
      key: 'status',
      header: 'Status',
      kind: 'short',
      priority: 3,
      render: (apt) => <span className="text-slate-700 dark:text-slate-300 font-medium">{apt.status}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'short',
      priority: 4,
      isActions: true,
      render: (apt) => {
        const isConcluded = apt.status === 'in_consultation' || apt.status === 'completed';
        const pat = rawPatients.find((p) => p.id === apt.patientId);
        const actions: RowActionItem[] = [];
        if (!isConcluded) {
          actions.push({
            label: 'Call Next',
            onClick: () => handleCallNext(apt),
            ariaLabel: `Call next for ${apt.patientName}`,
          });
          actions.push({
            label: 'Mark Completed',
            onClick: () => handleMarkCompleted(apt),
            ariaLabel: `Mark ${apt.patientName} completed`,
          });
          if (pat) {
            actions.push({
              label: 'View Record',
              onClick: () => handleOpenViewRecord(pat),
              ariaLabel: `View record for ${apt.patientName}`,
            });
            actions.push({
              label: 'Transfer',
              onClick: () => handleOpenTransferModal(pat),
              ariaLabel: `Transfer ${apt.patientName} to another doctor`,
            });
          }
        }
        return (
          <RowActions
            actions={actions}
            subject={apt.patientName}
          />
        );
      },
    },
  ];

  const appointmentsColumns: ColumnDef<Appointment>[] = [
    {
      key: 'time',
      header: 'Time',
      kind: 'short',
      priority: 2,
      render: (apt) => <span>{apt.dateTime ? formatTime(apt.dateTime) : '-'}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      isPrimary: true,
      kind: 'short',
      priority: 1,
      render: (apt) => {
        const patInvoices = billingInvoices.filter((inv) => inv.patientId === apt.patientId);
        const due = patInvoices.reduce((acc, inv) => acc + balanceDue(inv, billingPayments), 0);
        return (
          <div>
            <span className="font-medium text-slate-900 dark:text-slate-100">{apt.patientName}</span>
            {due > 0 && (
              <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                Outstanding balance: {formatCurrency(due)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'doctor',
      header: 'Doctor',
      kind: 'short',
      priority: 5,
      render: (apt) => <span>{apt.doctorName}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      kind: 'short',
      priority: 6,
      render: (apt) => <span>{apt.source || 'reception'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      kind: 'short',
      priority: 3,
      render: (apt) => <span className="text-slate-700 dark:text-slate-300 font-medium">{apt.status}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'short',
      priority: 4,
      isActions: true,
      render: (apt) => {
        const isToday = agendaDate === todayStr;
        const isScheduled = apt.status === 'scheduled';
        const isDocAvailable = isDoctorAvailable(apt.doctorId, todayStr);
        const canCheckInItem = isToday && isScheduled && isDocAvailable;
        const pat = rawPatients.find((p) => p.id === apt.patientId);
        const actions: RowActionItem[] = [];

        if (canCheckInItem) {
          actions.push({
            label: 'Check In',
            variant: 'primary',
            onClick: () => handleCheckInBooked(apt),
            ariaLabel: `Check in ${apt.patientName}`,
          });
        }

        if (pat) {
          actions.push({
            label: 'View Record',
            onClick: () => handleOpenViewRecord(pat),
            ariaLabel: `View record for ${apt.patientName}`,
          });
        }

        if (apt.status !== 'completed' && apt.status !== 'in_consultation' && pat) {
          actions.push({
            label: 'Transfer',
            onClick: () => handleOpenTransferModal(pat),
            ariaLabel: `Transfer ${apt.patientName} to another doctor`,
          });
        }

        return (
          <RowActions
            actions={actions}
            subject={apt.patientName}
          />
        );
      },
    },
  ];

  const patientDirectoryColumns: ColumnDef<Patient>[] = [
    {
      key: 'name',
      header: 'Name',
      isPrimary: true,
      kind: 'short',
      priority: 1,
      render: (p) => <span className="font-medium text-slate-900 dark:text-slate-100">{p.firstName} {p.lastName}</span>,
    },
    {
      key: 'mrn',
      header: 'MRN',
      kind: 'short',
      priority: 2,
      render: (p) => <span>{p.mrn}</span>,
    },
    {
      key: 'dobAge',
      header: 'DOB / Age',
      kind: 'short',
      priority: 5,
      render: (p) => <span>{formatDate(p.dob)} ({p.age})</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      kind: 'short',
      priority: 4,
      render: (p) => <span>{p.phone}</span>,
    },
    {
      key: 'assignedDoctor',
      header: 'Assigned Doctor',
      kind: 'short',
      priority: 6,
      render: (p) => {
        const docId = getAssignedDoctorId(p.id, patientAssignments);
        const doc = doctors.find((d) => d.id === docId);
        return <span>{doc ? doc.name : 'Unassigned'}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'short',
      priority: 3,
      isActions: true,
      render: (p) => {
        const isUnassigned = !getAssignedDoctorId(p.id, patientAssignments);
        return (
          <RowActions
            actions={[
              {
                label: 'View Record',
                onClick: () => handleOpenViewRecord(p),
                ariaLabel: `View medical record for ${p.firstName} ${p.lastName}`,
              },
              {
                label: 'Edit',
                onClick: () => handleOpenEditPatient(p),
                ariaLabel: `Edit information for ${p.firstName} ${p.lastName}`,
              },
              {
                label: isUnassigned ? 'Assign' : 'Transfer',
                onClick: () => handleOpenTransferModal(p),
                ariaLabel: `${isUnassigned ? 'Assign' : 'Transfer'} care for ${p.firstName} ${p.lastName}`,
              },
            ]}
            subject={`${p.firstName} ${p.lastName}`}
          />
        );
      },
    },
  ];

  const registryColumns: ColumnDef<IntakeLogEntry>[] = [
    {
      key: 'time',
      header: 'Time',
      kind: 'short',
      priority: 3,
      render: (entry) => <span>{formatTime(entry.time)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      isPrimary: true,
      kind: 'short',
      priority: 1,
      render: (entry) => <span className="font-medium text-slate-900 dark:text-slate-100">{entry.type}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      kind: 'short',
      priority: 2,
      render: (entry) => <span>{entry.patientName}</span>,
    },
    {
      key: 'performedBy',
      header: 'Performed by',
      kind: 'short',
      priority: 4,
      render: (entry) => <span>{entry.performedBy}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      kind: 'text',
      priority: 5,
      render: (entry) => <span>{entry.details}</span>,
    },
  ];

  const claimColumns: ColumnDef<ClaimRequest>[] = [
    {
      key: 'name',
      header: 'Account Name',
      isPrimary: true,
      kind: 'short',
      priority: 1,
      render: (claim) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{claim.accountName}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400">DOB: {formatDate(claim.dob)}</div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email / Phone',
      kind: 'short',
      priority: 5,
      render: (claim) => (
        <div>
          <div className="text-xs text-slate-700 dark:text-slate-300">{claim.accountEmail}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{claim.accountPhone}</div>
        </div>
      ),
    },
    {
      key: 'mrn',
      header: 'Matched MRN',
      kind: 'short',
      priority: 2,
      render: (claim) => (
        <span className="text-xs text-slate-800 dark:text-slate-200">{claim.existingMrn}</span>
      ),
    },
    {
      key: 'requestedAt',
      header: 'Requested At',
      hideBelow: 'md',
      kind: 'short',
      priority: 6,
      render: (claim) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {claim.requestedAt ? `${formatDate(claim.requestedAt.slice(0, 10))} ${formatTime(claim.requestedAt.slice(11, 16))}` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      kind: 'short',
      priority: 3,
      render: (claim) => (
        <span className="text-xs capitalize text-slate-700 dark:text-slate-300 font-medium">
          {claim.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'short',
      priority: 4,
      isActions: true,
      render: (claim) => {
        if (claim.status !== 'pending') {
          return (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {claim.decisionNote ? claim.decisionNote : 'Decided'}
            </span>
          );
        }
        return (
          <RowActions
            actions={
              canManageRegistration
                ? [
                    {
                      label: 'Approve',
                      onClick: () => handleApproveClaim(claim),
                      ariaLabel: `Approve claim for ${claim.accountName}`,
                    },
                    {
                      label: 'Reject',
                      onClick: () => {
                        setRejectClaimTarget(claim);
                        setRejectClaimReason('');
                      },
                      ariaLabel: `Reject claim for ${claim.accountName}`,
                    },
                  ]
                : []
            }
            subject={claim.accountName}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Front Desk and Patient Reception Workstation
          </h1>
        </div>
        {!isMD && (
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRegError('');
                setIsRegisterOpen(true);
              }}
            >
              Register patient
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setWalkInMode('existing');
                setWalkInPatientId(patients[0]?.id || '');
                setWalkInReason('');
                setWalkInError('');
                setIsWalkInOpen(true);
              }}
            >
              Walk-in check-in
            </Button>
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <div role="status" aria-live="polite" className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100">
          {notification}
        </div>
      )}

      {/* Workstation Navigation Tabs */}
      <Tabs
        ariaLabel="Reception Tabs"
        tabs={[
          { id: 'lounge', label: 'Waiting Lounge' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'patients', label: 'Patient Directory' },
          { id: 'registry', label: 'Intake Registry' },
        ]}
        activeTab={selectedTab}
        onChange={(id) => {
          setSelectedTab(id);
          document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
        }}
      />

      {/* Interactive Search Bar across views */}
      <div className="max-w-md">
        <InteractiveSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by patient name, doctor, MRN, or token..."
          suggestions={searchSuggestions}
        />
      </div>

      {/* TAB 1: WAITING LOUNGE */}
      {selectedTab === 'lounge' && (
        <div className="space-y-6">
          {/* Top Summary Strip: 4 Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Checked In" value={totalCheckedIn} />
            <KpiCard label="Currently Waiting" value={currentlyWaiting} />
            <KpiCard label="In Consultation" value={inConsultation} />
            <KpiCard label="Completed Today" value={completedToday} />
          </div>

          {/* Waiting Queue Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Today's Arrival Queue ({loungeAppointments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                stackBelow="lg"
                columns={loungeColumns}
                data={paginatedLounge}
                keyExtractor={(item) => item.id}
              />
              <Pagination
                currentPage={loungePage}
                totalItems={loungeAppointments.length}
                pageSize={pageSize}
                onPageChange={setLoungePage}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: APPOINTMENTS */}
      {selectedTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Consultation Date:</span>
            <div className="w-48">
              <DatePicker value={agendaDate} onChange={(d) => setAgendaDate(d)} />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Appointments on {agendaDate} ({agendaAppointments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                stackBelow="lg"
                columns={appointmentsColumns}
                data={paginatedAppointments}
                keyExtractor={(item) => item.id}
              />
              <Pagination
                currentPage={appointmentsPage}
                totalItems={agendaAppointments.length}
                pageSize={pageSize}
                onPageChange={setAppointmentsPage}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: PATIENT DIRECTORY */}
      {selectedTab === 'patients' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Registered Patients ({filteredPatients.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                stackBelow="lg"
                columns={patientDirectoryColumns}
                data={paginatedPatients}
                keyExtractor={(item) => item.id}
              />
              <Pagination
                currentPage={patientsPage}
                totalItems={filteredPatients.length}
                pageSize={pageSize}
                onPageChange={setPatientsPage}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: INTAKE REGISTRY */}
      {selectedTab === 'registry' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Filter Event Type:</span>
            <div className="w-44">
              <Select
                value={registryFilter}
                onChange={(e) => setRegistryFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: 'All Events' },
                  { value: 'Registration', label: 'Registrations Only' },
                  { value: 'Check-in', label: 'Check-ins Only' },
                ]}
              />
            </div>
          </div>

          <Card className="w-fit max-w-full min-w-[40rem]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Today's Intake Log ({intakeLogs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                stackBelow="lg"
                columns={registryColumns}
                data={paginatedRegistry}
                keyExtractor={(item) => item.id}
              />
              <Pagination
                currentPage={registryPage}
                totalItems={intakeLogs.length}
                pageSize={pageSize}
                onPageChange={setRegistryPage}
              />
            </CardContent>
          </Card>

          {claimNotification && (
            <div className="text-xs p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{claimNotification}</span>
              <button
                type="button"
                onClick={() => setClaimNotification(null)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Account Link Requests Queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Account Link Requests ({pendingClaimsCount} pending)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                stackBelow="lg"
                columns={claimColumns}
                data={paginatedClaims}
                keyExtractor={(item) => item.id}
              />
              {claimRequests.length > pageSize && (
                <Pagination
                  currentPage={claimsPage}
                  totalItems={claimRequests.length}
                  pageSize={pageSize}
                  onPageChange={setClaimsPage}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: REGISTER PATIENT (Standalone Demographic Form) */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Patient"
      >
        <form onSubmit={handleSubmitRegistration} className="space-y-4">
          {regError && (
            <div className="p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-rose-700 dark:text-rose-300">
              {regError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
              <Input
                value={regFirstName}
                onChange={(e) => setRegFirstName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
              <Input
                value={regLastName}
                onChange={(e) => setRegLastName(e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
              <DatePicker value={regDob} onChange={setRegDob} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <Input
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <Input
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="patient@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
            <Input
              value={regAddress}
              onChange={(e) => setRegAddress(e.target.value)}
              placeholder="Address"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Name</label>
              <Input
                value={regEmergName}
                onChange={(e) => setRegEmergName(e.target.value)}
                placeholder="Contact person"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Phone</label>
              <Input
                value={regEmergPhone}
                onChange={(e) => setRegEmergPhone(e.target.value)}
                placeholder="Contact phone"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT PATIENT INFORMATION */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={
          editingPatient
            ? `Edit Patient Information — ${editingPatient.firstName} ${editingPatient.lastName} (${editingPatient.mrn})`
            : 'Edit Patient Information'
        }
      >
        <form onSubmit={handleSubmitEditPatient} className="space-y-4">
          {editError && (
            <div className="p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-rose-700 dark:text-rose-300">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                First Name
              </label>
              <Input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Last Name
              </label>
              <Input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <DatePicker value={editDob} onChange={setEditDob} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <Select
                value={editGender}
                onChange={(e) => setEditGender(e.target.value as any)}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="patient@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Residential Address
            </label>
            <Input
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="Address"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Emergency Contact Name
              </label>
              <Input
                value={editEmergName}
                onChange={(e) => setEditEmergName(e.target.value)}
                placeholder="Contact person"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Relationship
              </label>
              <Input
                value={editEmergRel}
                onChange={(e) => setEditEmergRel(e.target.value)}
                placeholder="Relationship"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Emergency Phone
              </label>
              <Input
                value={editEmergPhone}
                onChange={(e) => setEditEmergPhone(e.target.value)}
                placeholder="Contact phone"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: WALK-IN CHECK-IN (Flow A: New Patient & Flow B: Existing Patient) */}
      <Modal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        title="Walk-in Patient Check-In"
      >
        <form onSubmit={handleSubmitWalkIn} className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              size="sm"
              variant={walkInMode === 'existing' ? 'primary' : 'outline'}
              onClick={() => {
                setWalkInMode('existing');
                setWalkInError('');
              }}
            >
              Existing Patient
            </Button>
            <Button
              type="button"
              size="sm"
              variant={walkInMode === 'new' ? 'primary' : 'outline'}
              onClick={() => {
                setWalkInMode('new');
                setWalkInDoctorId(availableDoctorsToday[0]?.id || '');
                setWalkInError('');
              }}
            >
              New Patient
            </Button>
          </div>

          {walkInError && (
            <div className="p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-rose-700 dark:text-rose-300">
              {walkInError}
            </div>
          )}

          {walkInMode === 'existing' ? (
            /* Flow B: Existing Patient Walk-in */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Select Patient</label>
                <Select
                  value={walkInPatientId}
                  onChange={(e) => setWalkInPatientId(e.target.value)}
                  options={patients.map((p) => ({
                    value: p.id,
                    label: `${p.firstName} ${p.lastName} (${p.mrn})`,
                  }))}
                />
              </div>

              {walkInPatientId && (() => {
                const patInvoices = billingInvoices.filter((inv) => inv.patientId === walkInPatientId);
                const due = patInvoices.reduce((acc, inv) => acc + balanceDue(inv, billingPayments), 0);
                if (due <= 0) return null;
                return (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    Outstanding balance: {formatCurrency(due)}
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Physician</label>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100">
                  {currentAssignedDoc ? currentAssignedDoc.name : 'No physician assigned'}
                </div>
              </div>

              {!isAssignedDocAvailableToday && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-rose-700 dark:text-rose-300">
                  Assigned doctor is not available today. Reassignment requires an administrator.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Chief Complaint</label>
                <Textarea
                  value={walkInReason}
                  onChange={(e) => setWalkInReason(e.target.value)}
                  placeholder="Reason for today's walk-in visit"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsWalkInOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isAssignedDocAvailableToday || !walkInPatientId}
                >
                  Check In
                </Button>
              </div>
            </div>
          ) : (
            /* Flow A: New Patient Walk-in */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <Input
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <Input
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                  <DatePicker value={newDob} onChange={setNewDob} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <Input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="patient@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                  <Input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Residential address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Name</label>
                  <Input
                    value={newEmergName}
                    onChange={(e) => setNewEmergName(e.target.value)}
                    placeholder="Contact person"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Phone</label>
                  <Input
                    value={newEmergPhone}
                    onChange={(e) => setNewEmergPhone(e.target.value)}
                    placeholder="Contact phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign Attending Physician (Available Today)
                </label>
                <Select
                  value={walkInDoctorId}
                  onChange={(e) => setWalkInDoctorId(e.target.value)}
                  options={availableDoctorsToday.map((d) => ({
                    value: d.id,
                    label: `${d.name} (${d.department})`,
                  }))}
                />
                {availableDoctorsToday.length === 0 && (
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">No doctors are available today.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Chief Complaint</label>
                <Textarea
                  value={walkInReason}
                  onChange={(e) => setWalkInReason(e.target.value)}
                  placeholder="Reason for visit"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsWalkInOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={availableDoctorsToday.length === 0}
                >
                  Register and Check In
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* MODAL 3: BOOK APPOINTMENT */}
      <Modal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        title="Book Consultation Appointment"
      >
        <form onSubmit={handleSubmitBooking} className="space-y-4">
          {bookError && (
            <div className="p-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-rose-700 dark:text-rose-300">
              {bookError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Patient</label>
            <Select
              value={bookPatientId}
              onChange={(e) => {
                const patId = e.target.value;
                setBookPatientId(patId);
                const assignedDocId = getAssignedDoctorId(patId, patientAssignments);
                if (assignedDocId) setBookDoctorId(assignedDocId);
              }}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName} (${p.mrn})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Appointment Date</label>
              <DatePicker value={bookDate} onChange={setBookDate} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
              <Select
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
                options={
                  availableBookingSlots.length > 0
                    ? availableBookingSlots.map((slot) => {
                        const h = parseInt(slot.split(':')[0], 10);
                        const m = slot.split(':')[1];
                        const period = h >= 12 ? 'PM' : 'AM';
                        const displayH = h % 12 === 0 ? 12 : h % 12;
                        return {
                          value: slot,
                          label: `${String(displayH).padStart(2, '0')}:${m} ${period}`,
                        };
                      })
                    : [{ value: '', label: 'No available slots' }]
                }
              />
              {availableBookingSlots.length === 0 && (
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">No free slots on this date.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Physician (Available on {bookDate})
            </label>
            <Select
              value={bookDoctorId}
              onChange={(e) => setBookDoctorId(e.target.value)}
              options={availableDoctorsOnBookDate.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.department})`,
              }))}
            />
            {availableDoctorsOnBookDate.length === 0 && (
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                No physicians are available on this date.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reason for Visit</label>
            <Input
              ref={bookReasonInputRef}
              value={bookReason}
              onChange={(e) => setBookReason(e.target.value)}
              placeholder="Consultation reason"
              required
            />
            <DictationButton
              targetRef={bookReasonInputRef}
              value={bookReason}
              onChange={(val) => setBookReason(val)}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsBookOpen(false)} className="py-2 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={availableDoctorsOnBookDate.length === 0}
              className="py-2 px-4 min-h-[44px]"
            >
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Reject Account Link Request */}
      <Modal
        isOpen={rejectClaimTarget !== null}
        onClose={() => {
          setRejectClaimTarget(null);
          setRejectClaimReason('');
        }}
        title="Reject Account Link Request"
        description={`Specify a reason for rejecting the account link request for ${rejectClaimTarget?.accountName || ''} (MRN: ${rejectClaimTarget?.existingMrn || ''}).`}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectClaimTarget(null);
                setRejectClaimReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRejectClaim}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Rejection Reason
            </label>
            <Textarea
              value={rejectClaimReason}
              onChange={(e) => setRejectClaimReason(e.target.value)}
              placeholder="e.g. Identity verification failed, details did not match official clinic record."
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* Patient Record Inspection Modal */}
      {recordPatient && (
        <Modal
          isOpen={!!recordPatient}
          onClose={() => setRecordPatient(null)}
          title={`Patient Medical Record: ${recordPatient.firstName} ${recordPatient.lastName}`}
          maxWidth="2xl"
          bodyClassName="max-h-[80vh] overflow-y-auto"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordPatient(null)}
              >
                Close Record
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header Identity & Demographics */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {recordPatient.firstName} {recordPatient.lastName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 uppercase">
                      {recordPatient.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    MRN: <strong className="text-slate-700 dark:text-slate-200">{recordPatient.mrn}</strong> • Registered: {recordPatient.registeredDate || 'Enrolled'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="block font-medium">Attending Physician:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {doctors.find((d) => d.id === getAssignedDoctorId(recordPatient.id, patientAssignments))?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">DOB / Age</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(recordPatient.dob)} ({recordPatient.age} yrs)
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Gender</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {recordPatient.gender}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Blood Group</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {recordPatient.bloodGroup || 'Not Tested'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Primary Phone</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {recordPatient.phone}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Residential Address</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {recordPatient.address || 'Standard Outpatient Residence'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Emergency Contact</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {recordPatient.emergencyContact?.name || 'Emergency Contact'} ({recordPatient.emergencyContact?.relationship || 'Contact'}):{' '}
                    <span className="tabular-nums">{recordPatient.emergencyContact?.phone || recordPatient.phone}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Alerts: Allergies & Chronic Conditions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-800 dark:text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Allergy Profile & Warnings</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  {recordPatient.allergies && recordPatient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {recordPatient.allergies.map((allergy, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 font-semibold text-[11px]">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="italic text-slate-500 dark:text-slate-400">No known drug or environmental allergies recorded.</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Chronic Medical Conditions</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  {recordPatient.chronicConditions && recordPatient.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {recordPatient.chronicConditions.map((cond, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold text-[11px]">
                          {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="italic text-slate-500 dark:text-slate-400">No active chronic medical conditions documented.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Latest Recorded Vitals */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Latest Clinical Triage Vitals</span>
                </div>
                {(() => {
                  const patVitals = vitals.find((v) => v.patientId === recordPatient.id);
                  return patVitals ? (
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {patVitals.recordedAt.slice(0, 16).replace('T', ' ')} by {patVitals.recordedByName || 'Clinical Staff'}
                    </span>
                  ) : null;
                })()}
              </div>
              {(() => {
                const patVitals = vitals.find((v) => v.patientId === recordPatient.id);
                if (!patVitals) {
                  return (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                      No triage vital signs recorded yet for this patient.
                    </p>
                  );
                }
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 tabular-nums text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Blood Pressure</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {patVitals.systolicBp}/{patVitals.diastolicBp} mmHg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Heart Rate</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {patVitals.heartRateBpm} bpm
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">O2 Saturation</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {patVitals.oxygenSaturationPct}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Temperature</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {patVitals.temperatureCelsius}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">BMI</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {patVitals.bmi || '-'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Prescriptions & Medications */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Active Prescriptions & Medications (e-Rx)</span>
              </div>
              {(() => {
                const patientRxList = prescriptions.filter((rx) => rx.patientId === recordPatient.id);
                if (patientRxList.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                      No active prescriptions on file for this patient.
                    </p>
                  );
                }
                return (
                  <div className="space-y-2 max-h-36 overflow-y-auto pt-1">
                    {patientRxList.map((rx) => (
                      <div key={rx.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-0.5">
                        <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                          <span className="tabular-nums text-teal-700 dark:text-teal-400">{rx.prescriptionNumber}</span>
                          <span className="text-[10px] tabular-nums text-slate-500">{rx.date} • Dr. {rx.doctorName}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">
                          <strong>Diagnosis:</strong> {rx.diagnosis}
                        </div>
                        <div className="text-[11px] text-teal-800 dark:text-teal-300 font-medium">
                          <strong>Medicines:</strong> {rx.items.map((i) => `${i.medicineName} (${i.dosage}, ${i.frequency})`).join('; ')}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Visit & Consultation History */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Consultation & Appointment History</span>
              </div>
              {(() => {
                const patApts = rawAppointments.filter((a) => a.patientId === recordPatient.id);
                if (patApts.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                      No consultation visits recorded for this patient.
                    </p>
                  );
                }
                return (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {patApts.map((a) => (
                      <div key={a.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Dr. {a.doctorName} • <span className="tabular-nums text-teal-600 dark:text-teal-400">Token #{a.tokenNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {a.dateTime ? a.dateTime.replace('T', ' ') : 'Date pending'} • {a.reasonForVisit || 'General Consultation'}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          a.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : a.status === 'in_consultation'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : a.status === 'checked_in'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer Patient Care Modal */}
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
                  !isDoctorAvailable(targetDoctorId, todayStr) ||
                  doctors.filter(
                    (d) =>
                      d.status === 'active' &&
                      d.id !== getAssignedDoctorId(transferTargetPatient.id, patientAssignments) &&
                      isDoctorAvailable(d.id, todayStr)
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
              <span className="text-slate-500 dark:text-slate-400 block text-[0.6875rem] mb-1">Current Assigned Physician</span>
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
                    isDoctorAvailable(d.id, todayStr)
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
              {targetDoctorId && !isDoctorAvailable(targetDoctorId, todayStr) && (
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
