import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { Table, ColumnDef } from '@/components/ui/Table';
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
import { formatLocalDate } from '@/lib/time';

interface ReceptionistViewProps {
  activeTab?: string;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({ activeTab = 'lounge' }) => {
  const { currentUser, currentRole } = useAuth();
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
    registerPatient,
    checkInAppointment,
    checkInWalkIn,
    bookAppointment,
    updateAppointmentStatus,
  } = useClinic();
  const { invoices: billingInvoices, payments: billingPayments } = useBilling();

  const patients = useMemo(() => {
    return getScopedPatients(currentUser, rawPatients, patientAssignments);
  }, [currentUser, rawPatients, patientAssignments]);

  const appointments = useMemo(() => {
    return getScopedAppointments(currentUser, rawAppointments, patientAssignments);
  }, [currentUser, rawAppointments, patientAssignments]);

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

  // Book Appointment Form State
  const [bookPatientId, setBookPatientId] = useState<string>('');
  const [bookDoctorId, setBookDoctorId] = useState<string>('');
  const [bookDate, setBookDate] = useState<string>(todayStr);
  const [bookTime, setBookTime] = useState<string>('09:30');
  const [bookReason, setBookReason] = useState<string>('');
  const [bookError, setBookError] = useState<string>('');

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
      const repo = getRepository<ClaimRequest>('claimRequests');
      repo.list().then((claims) => {
        setClaimRequests(claims);
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

  const handleOpenWalkInForPatient = (p: Patient) => {
    setWalkInMode('existing');
    setWalkInPatientId(p.id);
    setWalkInReason('');
    setWalkInError('');
    setIsWalkInOpen(true);
  };

  const handleOpenBookingForPatient = (p: Patient) => {
    setBookPatientId(p.id);
    const assignedDocId = getAssignedDoctorId(p.id, patientAssignments);
    setBookDoctorId(assignedDocId || doctors[0]?.id || '');
    setBookDate(todayStr);
    setBookTime('09:30');
    setBookReason('');
    setBookError('');
    setIsBookOpen(true);
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
      render: (apt) => <span className="font-semibold text-slate-900 dark:text-slate-100">{apt.tokenNumber > 0 ? `#${apt.tokenNumber}` : '-'}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      isPrimary: true,
      render: (apt) => <span className="font-medium text-slate-900 dark:text-slate-100">{apt.patientName}</span>,
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (apt) => <span>{apt.doctorName}</span>,
    },
    {
      key: 'arrivalTime',
      header: 'Arrival Time',
      render: (apt) => <span>{apt.checkedInAt ? apt.checkedInAt.slice(11, 16) : apt.dateTime.slice(11, 16)}</span>,
    },
    {
      key: 'waitTime',
      header: 'Wait Time',
      render: (apt) => <span>{calculateWaitTimeMinutes(apt.checkedInAt)} min</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (apt) => <span className="text-slate-700 dark:text-slate-300 font-medium">{apt.status}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      isActions: true,
      render: (apt) => {
        const isConcluded = apt.status === 'in_consultation' || apt.status === 'completed';
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isConcluded}
              onClick={() => handleCallNext(apt)}
            >
              Call Next
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isConcluded}
              onClick={() => handleMarkCompleted(apt)}
            >
              Mark Completed
            </Button>
          </div>
        );
      },
    },
  ];

  const appointmentsColumns: ColumnDef<Appointment>[] = [
    {
      key: 'time',
      header: 'Time',
      render: (apt) => <span>{apt.dateTime ? apt.dateTime.slice(11, 16) : '-'}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      isPrimary: true,
      render: (apt) => {
        const patInvoices = billingInvoices.filter((inv) => inv.patientId === apt.patientId);
        const due = patInvoices.reduce((acc, inv) => acc + balanceDue(inv, billingPayments), 0);
        return (
          <div>
            <span className="font-medium text-slate-900 dark:text-slate-100">{apt.patientName}</span>
            {due > 0 && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
      render: (apt) => <span>{apt.doctorName}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (apt) => <span>{apt.source || 'reception'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (apt) => <span className="text-slate-700 dark:text-slate-300 font-medium">{apt.status}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      isActions: true,
      render: (apt) => {
        const isToday = agendaDate === todayStr;
        const isScheduled = apt.status === 'scheduled';
        const isDocAvailable = isDoctorAvailable(apt.doctorId, todayStr);
        const canCheckInItem = isToday && isScheduled && isDocAvailable;

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={!canCheckInItem}
              onClick={() => handleCheckInBooked(apt)}
            >
              Check In
            </Button>
            {!isDocAvailable && isScheduled && isToday && (
              <span className="text-xs text-slate-500 dark:text-slate-400">Doctor unavailable today</span>
            )}
          </div>
        );
      },
    },
  ];

  const patientDirectoryColumns: ColumnDef<Patient>[] = [
    {
      key: 'name',
      header: 'Name',
      isPrimary: true,
      render: (p) => <span className="font-medium text-slate-900 dark:text-slate-100">{p.firstName} {p.lastName}</span>,
    },
    {
      key: 'mrn',
      header: 'MRN',
      render: (p) => <span>{p.mrn}</span>,
    },
    {
      key: 'dobAge',
      header: 'DOB / Age',
      render: (p) => <span>{p.dob} ({p.age})</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (p) => <span>{p.phone}</span>,
    },
    {
      key: 'assignedDoctor',
      header: 'Assigned Doctor',
      render: (p) => {
        const docId = getAssignedDoctorId(p.id, patientAssignments);
        const doc = doctors.find((d) => d.id === docId);
        return <span>{doc ? doc.name : 'Unassigned'}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      isActions: true,
      render: (p) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenWalkInForPatient(p)}>
            Check In
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleOpenBookingForPatient(p)}>
            Book
          </Button>
        </div>
      ),
    },
  ];

  const registryColumns: ColumnDef<IntakeLogEntry>[] = [
    {
      key: 'time',
      header: 'Time',
      render: (entry) => <span>{entry.time}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      isPrimary: true,
      render: (entry) => <span className="font-medium text-slate-900 dark:text-slate-100">{entry.type}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (entry) => <span>{entry.patientName}</span>,
    },
    {
      key: 'performedBy',
      header: 'Performed by',
      render: (entry) => <span>{entry.performedBy}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      render: (entry) => <span>{entry.details}</span>,
    },
  ];

  const claimColumns: ColumnDef<ClaimRequest>[] = [
    {
      key: 'name',
      header: 'Account Name',
      isPrimary: true,
      render: (claim) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{claim.accountName}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400">DOB: {claim.dob}</div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email / Phone',
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
      render: (claim) => (
        <span className="text-xs text-slate-800 dark:text-slate-200">{claim.existingMrn}</span>
      ),
    },
    {
      key: 'requestedAt',
      header: 'Requested At',
      hideBelow: 'md',
      render: (claim) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {claim.requestedAt ? claim.requestedAt.slice(0, 16).replace('T', ' ') : 'N/A'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (claim) => (
        <span className="text-xs capitalize text-slate-700 dark:text-slate-300 font-medium">
          {claim.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
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
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={!canManageRegistration}
              title={!canManageRegistration ? 'Requires patient registration access' : undefined}
              onClick={() => handleApproveClaim(claim)}
            >
              Approve
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={!canManageRegistration}
              title={!canManageRegistration ? 'Requires patient registration access' : undefined}
              onClick={() => {
                setRejectClaimTarget(claim);
                setRejectClaimReason('');
              }}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Front Desk and Patient Reception Workstation
          </h2>
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
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100">
          {notification}
        </div>
      )}

      {/* Workstation Navigation Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-slate-200 dark:border-slate-800 no-scrollbar scrollbar-none">
        {[
          { id: 'lounge', label: 'Waiting Lounge' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'patients', label: 'Patient Directory' },
          { id: 'registry', label: 'Intake Registry' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`py-2 text-xs transition-none cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
              selectedTab === tab.id
                ? 'border-teal-600 dark:border-teal-500 font-bold text-slate-900 dark:text-slate-100'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Checked In</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCheckedIn}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Currently Waiting</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{currentlyWaiting}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Consultation</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{inConsultation}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed Today</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{completedToday}</div>
              </CardContent>
            </Card>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Consultation Date:</span>
              <div className="w-48">
                <DatePicker value={agendaDate} onChange={(d) => setAgendaDate(d)} />
              </div>
            </div>
            {!isMD && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setBookPatientId(patients[0]?.id || '');
                  setBookDoctorId(doctors[0]?.id || '');
                  setBookDate(agendaDate);
                  setBookTime('09:30');
                  setBookReason('');
                  setBookError('');
                  setIsBookOpen(true);
                }}
              >
                Book Appointment
              </Button>
            )}
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

          <Card>
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
              value={bookReason}
              onChange={(e) => setBookReason(e.target.value)}
              placeholder="Consultation reason"
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsBookOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={availableDoctorsOnBookDate.length === 0}
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
    </div>
  );
};
