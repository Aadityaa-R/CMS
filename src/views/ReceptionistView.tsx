import React, { useState, useEffect } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { StatCard } from '@/components/ui/StatCard';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  Plus,
  Ticket,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { BloodGroup, Appointment } from '@/types';
import { getScopedPatients, getScopedAppointments } from '@/lib/selectors';

interface ReceptionistViewProps {
  activeTab?: string;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({ activeTab = 'overview' }) => {
  const { currentUser, currentRole, staffAccessList } = useAuth();
  const isMD = currentRole === 'md' || currentRole === 'admin' || currentUser.role === 'md';
  const [selectedTab, setSelectedTab] = useState<string>(activeTab || 'overview');

  const receptionistStaff = React.useMemo(() => {
    return staffAccessList.filter((s) => s.role === 'receptionist');
  }, [staffAccessList]);

  useEffect(() => {
    if (activeTab && activeTab !== 'overview') {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);
  const {
    appointments: rawAppointments,
    patients: rawPatients,
    doctors,
    patientAssignments = [],
    updateAppointmentStatus,
    addPatient,
    addAppointment,
  } = useClinic();

  const patients = React.useMemo(() => {
    return getScopedPatients(currentUser, rawPatients, patientAssignments);
  }, [currentUser, rawPatients, patientAssignments]);

  const appointments = React.useMemo(() => {
    return getScopedAppointments(currentUser, rawAppointments, patientAssignments);
  }, [currentUser, rawAppointments, patientAssignments]);

  // Primary sole doctor
  const primaryDoctor = doctors[0] || {
    id: 'doc-1',
    name: 'Dr. Marcus Vance',
    department: 'Internal Medicine',
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'waiting' | 'urgent'>('all');

  // Real-time Feedback Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Modals State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Registration Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('1992-06-15');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('female');
  const [regBlood, setRegBlood] = useState<BloodGroup>('O+');
  const [regAllergies, setRegAllergies] = useState('');
  const [regError, setRegError] = useState('');

  // Booking Form State
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || 'doc-1');
  const [bookingReason, setBookingReason] = useState('General consultation');
  const [bookingError, setBookingError] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(true);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || primaryDoctor;

  // KPI Calculations
  const waitingCount = appointments.filter((a) => a.status === 'checked_in').length;
  const urgentCount = appointments.filter((a) => a.status === 'checked_in' && a.tokenNumber <= 2).length;
  const inConsultCount = appointments.filter((a) => a.status === 'in_consultation').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const upcomingCount = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length;

  // Handlers
  const handleCheckIn = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'checked_in');
    showNotification(
      `Patient ${apt.patientName} checked in. Token #${apt.tokenNumber} issued for ${apt.doctorName} (${apt.department}).`
    );
  };

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('First name and last name are required.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Contact phone number is required.');
      return;
    }

    const birthYear = new Date(regDob).getFullYear();
    const calculatedAge = Math.max(1, new Date().getFullYear() - birthYear);

    const newPat = addPatient({
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      gender: regGender,
      dob: regDob,
      age: calculatedAge,
      phone: regPhone.trim(),
      email: `${regFirstName.toLowerCase().trim()}.${regLastName.toLowerCase().trim()}@patient.com`,
      address: 'Beacon City Center',
      bloodGroup: regBlood,
      allergies: regAllergies ? regAllergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      chronicConditions: [],
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Family',
        phone: regPhone.trim(),
      },
    });

    showNotification(
      `New patient ${newPat.firstName} ${newPat.lastName} registered (${newPat.mrn}). Profile active.`
    );

    setSelectedPatientId(newPat.id);
    setIsRegisterOpen(false);
    setRegError('');
    setRegFirstName('');
    setRegLastName('');
    setRegPhone('');
    setRegAllergies('');
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingReason.trim()) {
      setBookingError('Please enter a reason for the consultation.');
      return;
    }
    const pat = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (!pat) return;

    const doc = doctors.find((d) => d.id === selectedDoctorId) || primaryDoctor;

    const newApt = addAppointment({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientPhone: pat.phone,
      doctorId: doc.id,
      doctorName: doc.name,
      department: doc.department,
      dateTime: new Date().toISOString(),
      durationMinutes: 30,
      status: isWalkIn ? 'checked_in' : 'scheduled',
      reasonForVisit: bookingReason,
    });

    showNotification(
      `Appointment ${newApt.appointmentNumber} created for ${newApt.patientName}. Assigned to ${doc.name} (Token #${newApt.tokenNumber}).`
    );

    setIsBookOpen(false);
    setBookingReason('General consultation');
  };

  // Filter Helper
  const query = searchTerm.toLowerCase().trim();

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      query === '' ||
      a.patientName.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query) ||
      a.reasonForVisit.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'waiting') return a.status === 'checked_in';
    if (filterMode === 'urgent') return a.status === 'checked_in' && a.tokenNumber <= 2;
    return true;
  });

  const awaitingCheckIn = appointments.filter(
    (a) =>
      (a.status === 'scheduled' || a.status === 'confirmed') &&
      (query === '' ||
        a.patientName.toLowerCase().includes(query) ||
        a.appointmentNumber.toLowerCase().includes(query) ||
        a.patientPhone.includes(query))
  );

  const filteredIntakePatients = patients.filter(
    (p) =>
      query === '' ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.phone.includes(query)
  );

  const filteredBookings = appointments.filter(
    (a) =>
      query === '' ||
      a.patientName.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query) ||
      a.reasonForVisit.toLowerCase().includes(query)
  );

  // Pagination State (10 records per page)
  const [loungePage, setLoungePage] = useState(1);
  const [checkinPage, setCheckinPage] = useState(1);
  const [intakePage, setIntakePage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setLoungePage(1);
    setCheckinPage(1);
    setIntakePage(1);
    setBookingPage(1);
  }, [searchTerm, filterMode]);

  const paginatedLounge = filteredAppointments.slice((loungePage - 1) * pageSize, loungePage * pageSize);
  const paginatedCheckIn = awaitingCheckIn.slice((checkinPage - 1) * pageSize, checkinPage * pageSize);
  const paginatedIntake = filteredIntakePatients.slice((intakePage - 1) * pageSize, intakePage * pageSize);
  const paginatedBookings = filteredBookings.slice((bookingPage - 1) * pageSize, bookingPage * pageSize);

  const initialAgendaDate = filteredBookings[0]?.dateTime?.split('T')[0] || new Date().toISOString().split('T')[0];
  const [agendaDate, setAgendaDate] = useState(initialAgendaDate);

  const agendaAppointments = React.useMemo(() => {
    return filteredBookings.filter((apt) => apt.dateTime.startsWith(agendaDate));
  }, [filteredBookings, agendaDate]);

  const receptionistSearchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    appointments.forEach((apt) => {
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
  }, [appointments, patients]);

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Front Desk & Patient Reception Workstation
          </h2>
        </div>
        {!isMD && (
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsRegisterOpen(true)}
            >
              Register Patient
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Ticket className="w-4 h-4" />}
              onClick={() => setIsBookOpen(true)}
            >
              Walk-in Check-In
            </Button>
          </div>
        )}
      </div>

      {/* Sub-Workstation Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Waiting Lounge & Tokens' },
          { id: 'checkin', label: 'Patient Check-In' },
          { id: 'registration', label: 'Patient Intake Registry' },
          { id: 'booking', label: 'Book Consultation' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              selectedTab === tab.id
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
            <span className="font-medium">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="In Waiting Lounge"
          value={waitingCount}
          unit={waitingCount === 1 ? 'Patient' : 'Patients'}
          subtitle="Checked in with tokens"
          colorScheme="teal"
        />
        <StatCard
          title="In Consultation"
          value={inConsultCount}
          unit={inConsultCount === 1 ? 'Patient' : 'Patients'}
          subtitle="Currently with clinic doctors"
          colorScheme="slate"
        />
        <StatCard
          title="Upcoming Today"
          value={upcomingCount}
          unit="Visits"
          subtitle="Pending front desk arrival"
          colorScheme="slate"
        />
        <StatCard
          title="Concluded Visits"
          value={completedCount}
          unit="Completed"
          subtitle="Discharged consultations"
          colorScheme="slate"
        />
      </div>

      {/* Universal Search & Scope Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="relative flex-1 max-w-md">
          <InteractiveSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            suggestions={receptionistSearchSuggestions}
            placeholder="Search by patient name..."
          />
        </div>

        {/* Priority Filter as Searchable Dropdown Selector */}
        <div className="w-full sm:w-60 shrink-0">
          <Select
            icon={<Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as 'all' | 'waiting' | 'urgent')}
            placeholder="Filter queue"
            options={[
              { value: 'all', label: `All Today (${appointments.length})` },
              { value: 'waiting', label: `Waiting Lounge (${waitingCount})` },
              { value: 'urgent', label: `Priority Next (${urgentCount})` },
            ]}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: FRONT DESK OVERVIEW (`overview`)                            */}
      {/* ========================================================================= */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiting Lounge & Token Dispatch Table */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader
                action={
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {filteredAppointments.length} Active Records
                  </span>
                }
              >
                <CardTitle>Waiting Lounge & Token Dispatch Desk</CardTitle>
                <CardDescription>
                  Arriving patients, queue tokens, and handoff to active clinic physicians
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table stackBelow="md">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/12 min-w-[70px]">Token</TableHead>
                        <TableHead className="w-2/12 min-w-[150px]">Patient Details</TableHead>
                        <TableHead hideBelow="md" className="w-2/12 min-w-[140px]">Physician</TableHead>
                        <TableHead hideBelow="sm" className="w-1/12 min-w-[90px]">Scheduled Time</TableHead>
                        <TableHead hideBelow="lg" className="w-3/12 min-w-[160px]">Reason for Visit</TableHead>
                        <TableHead className="w-1/12 min-w-[90px]">Status</TableHead>
                        {!isMD && <TableHead className="w-2/12 min-w-[130px] text-right align-middle whitespace-nowrap">Front Desk Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLounge.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell label="Token" className="w-1/12 min-w-[70px] font-mono font-bold text-teal-600 dark:text-teal-400">
                            #{apt.tokenNumber}
                          </TableCell>
                          <TableCell label="Patient Details" className="w-2/12 min-w-[150px]">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {apt.patientName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {apt.patientPhone}
                            </div>
                          </TableCell>
                          <TableCell label="Physician" hideBelow="md" className="w-2/12 min-w-[140px]">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {apt.doctorName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {apt.department}
                            </div>
                          </TableCell>
                          <TableCell label="Scheduled Time" hideBelow="sm" className="w-1/12 min-w-[90px] text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {new Date(apt.dateTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell label="Reason for Visit" hideBelow="lg" className="w-3/12 min-w-[160px] text-slate-600 dark:text-slate-400">
                            {apt.reasonForVisit}
                          </TableCell>
                          <TableCell label="Status" className="w-1/12 min-w-[90px]">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  apt.status === 'checked_in'
                                    ? 'bg-teal-500'
                                    : apt.status === 'in_consultation'
                                    ? 'bg-teal-500'
                                    : 'bg-slate-400'
                                }`}
                              />
                              <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                                {apt.status.replace('_', ' ')}
                              </span>
                            </div>
                          </TableCell>
                          {!isMD && (
                            <TableCell label="Action" fullWidthOnStack className="w-2/12 min-w-[130px] text-right align-middle whitespace-nowrap">
                              {apt.status === 'scheduled' || apt.status === 'confirmed' ? (
                                <Button
                                  size="xs"
                                  variant="primary"
                                  onClick={() => handleCheckIn(apt)}
                                >
                                  Check In
                                </Button>
                              ) : apt.status === 'checked_in' ? (
                                <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                                  In Lounge
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                                  {apt.status.replace('_', ' ')}
                                </span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  currentPage={loungePage}
                  totalItems={filteredAppointments.length}
                  pageSize={pageSize}
                  onPageChange={setLoungePage}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Front Desk Staffing & Clinic Roster */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reception Desk Status</CardTitle>
                <CardDescription>Front desk operations & duty log</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">
                    Terminal Operator on Duty
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {currentUser.name}
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 block text-[11px] mt-0.5">
                    {currentUser.title || 'Front Desk Coordinator'} • Badge: {currentUser.badgeNumber || 'REC-301'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">
                    Front Desk Roster ({receptionistStaff.length} Receptionists)
                  </span>
                  <div className="space-y-1.5">
                    {receptionistStaff.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700/60 last:border-0"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                rec.status === 'granted' ? 'bg-teal-500' : 'bg-rose-500'
                              }`}
                            />
                            <span>{rec.staffName}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {rec.staffTitle}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          ({rec.badgeNumber})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Managing Director:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Dr. Marcus Vance (MD)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Active Physicians:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{doctors.length} Doctors on Duty</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Consultation Desks:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">Desks 1, 2, and 3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Today's Total Tokens:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {appointments.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 2: PATIENT CHECK-IN WORKSTATION (`checkin`)                    */}
      {/* ========================================================================= */}
      {selectedTab === 'checkin' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {awaitingCheckIn.length} Awaiting Check-In
              </span>
            }
          >
            <CardTitle>Patient Check-In & Token Issuance Station</CardTitle>
            <CardDescription>
              Verify identity of arriving patients, issue consultation tokens, and direct to waiting lounge
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table stackBelow="md">
                <TableHeader>
                  <TableRow>
                    <TableHead hideBelow="sm" className="w-2/12 min-w-[130px]">Appointment #</TableHead>
                    <TableHead className="w-2/12 min-w-[150px]">Patient Name</TableHead>
                    <TableHead hideBelow="md" className="w-2/12 min-w-[120px]">Contact Phone</TableHead>
                    <TableHead className="w-1/12 min-w-[90px]">Scheduled Slot</TableHead>
                    <TableHead hideBelow="sm" className="w-2/12 min-w-[140px]">Consulting Doctor</TableHead>
                    <TableHead className="w-1/12 min-w-[90px]">Status</TableHead>
                    {!isMD && <TableHead className="w-2/12 min-w-[120px] text-right align-middle whitespace-nowrap">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingCheckIn.length > 0 ? (
                    paginatedCheckIn.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell label="Appointment #" hideBelow="sm" className="w-2/12 min-w-[130px] font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {apt.appointmentNumber}
                        </TableCell>
                        <TableCell label="Patient Name" className="w-2/12 min-w-[150px] font-semibold text-slate-900 dark:text-slate-100">
                          {apt.patientName}
                        </TableCell>
                        <TableCell label="Contact Phone" hideBelow="md" className="w-2/12 min-w-[120px] text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {apt.patientPhone}
                        </TableCell>
                        <TableCell label="Scheduled Slot" className="w-1/12 min-w-[90px] text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell label="Consulting Doctor" hideBelow="sm" className="w-2/12 min-w-[140px] text-slate-800 dark:text-slate-200">
                          {apt.doctorName}
                        </TableCell>
                        <TableCell label="Status" className="w-1/12 min-w-[90px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                              {apt.status}
                            </span>
                          </div>
                        </TableCell>
                        {!isMD && (
                          <TableCell label="Action" fullWidthOnStack className="w-2/12 min-w-[120px] text-right align-middle whitespace-nowrap">
                            <Button
                              size="xs"
                              variant="primary"
                              icon={<Ticket className="w-3.5 h-3.5" />}
                              onClick={() => handleCheckIn(apt)}
                            >
                              Issue Token & Check In
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isMD ? 6 : 7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                        All scheduled patients have been checked in or no further bookings pending.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={checkinPage}
              totalItems={awaitingCheckIn.length}
              pageSize={pageSize}
              onPageChange={setCheckinPage}
            />
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 3: REGISTER NEW PATIENT (`registration`)                       */}
      {/* ========================================================================= */}
      {selectedTab === 'registration' && (
        <Card>
          <CardHeader
            action={
              !isMD && (
                <Button
                  size="xs"
                  variant="primary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsRegisterOpen(true)}
                >
                  Register New Patient
                </Button>
              )
            }
          >
            <CardTitle>Patient Intake & Registration Registry</CardTitle>
            <CardDescription>
              Registered outpatient files and demographic directory under front desk administration
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table stackBelow="md">
                <TableHeader>
                  <TableRow>
                    <TableHead hideBelow="sm" className="w-2/12 min-w-[120px]">MRN</TableHead>
                    <TableHead className="w-3/12 min-w-[180px]">Patient Name</TableHead>
                    <TableHead hideBelow="md" className="w-2/12 min-w-[120px]">Age & Gender</TableHead>
                    <TableHead className="w-2/12 min-w-[120px]">Contact Phone</TableHead>
                    <TableHead hideBelow="lg" className="w-1/12 min-w-[90px]">Blood Group</TableHead>
                    <TableHead hideBelow="xl" className="w-1/12 min-w-[120px]">Emergency Contact</TableHead>
                    <TableHead className="w-1/12 min-w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIntake.map((pat) => (
                    <TableRow key={pat.id}>
                      <TableCell label="MRN" hideBelow="sm" className="w-2/12 min-w-[120px] font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {pat.mrn}
                      </TableCell>
                      <TableCell label="Patient Name" className="w-3/12 min-w-[180px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {pat.firstName} {pat.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {pat.email}
                        </div>
                      </TableCell>
                      <TableCell label="Age & Gender" hideBelow="md" className="w-2/12 min-w-[120px] text-slate-700 dark:text-slate-300 capitalize">
                        {pat.age} yrs • {pat.gender}
                      </TableCell>
                      <TableCell label="Contact Phone" className="w-2/12 min-w-[120px] text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {pat.phone}
                      </TableCell>
                      <TableCell label="Blood Group" hideBelow="lg" className="w-1/12 min-w-[90px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{pat.bloodGroup}</span>
                      </TableCell>
                      <TableCell label="Emergency Contact" hideBelow="xl" className="w-1/12 min-w-[120px] text-slate-700 dark:text-slate-300">
                        {pat.emergencyContact?.name} ({pat.emergencyContact?.relationship})
                      </TableCell>
                      <TableCell label="Status" className="w-1/12 min-w-[80px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                            {pat.status}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={intakePage}
              totalItems={filteredIntakePatients.length}
              pageSize={pageSize}
              onPageChange={setIntakePage}
            />
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 4: BOOK APPOINTMENT (`booking`)                                 */}
      {/* ========================================================================= */}
      {selectedTab === 'booking' && (
        <Card>
          <CardHeader
            action={
              !isMD && (
                <Button
                  size="xs"
                  variant="primary"
                  icon={<Ticket className="w-3.5 h-3.5" />}
                  onClick={() => setIsBookOpen(true)}
                >
                  Book Consultation
                </Button>
              )
            }
          >
            <CardTitle>Appointment Booking & Scheduling Terminal</CardTitle>
            <CardDescription>
              Assign consultations directly to clinic physicians across Consultation Desks 1, 2, and 3
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Day-by-Day Agenda View */}
            <div className="md:hidden p-4 space-y-4">
              <div className="w-full">
                <DatePicker
                  label="Select Agenda Date"
                  value={agendaDate}
                  onChange={setAgendaDate}
                />
              </div>

              {agendaAppointments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No appointments scheduled for this date.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Agenda for {agendaDate} ({agendaAppointments.length} {agendaAppointments.length === 1 ? 'consultation' : 'consultations'})
                  </div>
                  {agendaAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                          Token #{apt.tokenNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              apt.status === 'checked_in' || apt.status === 'in_consultation'
                                ? 'bg-teal-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                            {apt.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {apt.patientName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {apt.appointmentNumber} • {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{apt.doctorName}</span>
                        <span className="text-slate-500 dark:text-slate-400"> ({apt.department})</span>
                      </div>

                      {apt.reasonForVisit && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                          {apt.reasonForVisit}
                        </div>
                      )}

                      {!isMD && (apt.status === 'scheduled' || apt.status === 'confirmed') && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Button
                            size="xs"
                            variant="primary"
                            className="w-full"
                            icon={<Ticket className="w-3.5 h-3.5" />}
                            onClick={() => handleCheckIn(apt)}
                          >
                            Issue Token & Check In
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table stackBelow="md">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/12 min-w-[70px]">Token #</TableHead>
                    <TableHead hideBelow="sm" className="w-2/12 min-w-[130px]">Appointment ID</TableHead>
                    <TableHead className="w-2/12 min-w-[150px]">Patient Name</TableHead>
                    <TableHead hideBelow="md" className="w-2/12 min-w-[140px]">Physician</TableHead>
                    <TableHead className="w-1/12 min-w-[100px]">Scheduled Time</TableHead>
                    <TableHead hideBelow="lg" className="w-3/12 min-w-[160px]">Reason for Visit</TableHead>
                    <TableHead className="w-1/12 min-w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell label="Token #" className="w-1/12 min-w-[70px] font-mono font-bold text-teal-600 dark:text-teal-400">
                        #{apt.tokenNumber}
                      </TableCell>
                      <TableCell label="Appointment ID" hideBelow="sm" className="w-2/12 min-w-[130px] font-mono text-slate-800 dark:text-slate-200">
                        {apt.appointmentNumber}
                      </TableCell>
                      <TableCell label="Patient Name" className="w-2/12 min-w-[150px] font-semibold text-slate-900 dark:text-slate-100">
                        {apt.patientName}
                      </TableCell>
                      <TableCell label="Physician" hideBelow="md" className="w-2/12 min-w-[140px] text-slate-700 dark:text-slate-300">
                        {apt.doctorName}
                      </TableCell>
                      <TableCell label="Scheduled Time" className="w-1/12 min-w-[100px] text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell label="Reason for Visit" hideBelow="lg" className="w-3/12 min-w-[160px] text-slate-600 dark:text-slate-400">
                        {apt.reasonForVisit}
                      </TableCell>
                      <TableCell label="Status" className="w-1/12 min-w-[90px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              apt.status === 'checked_in'
                                ? 'bg-teal-500'
                                : apt.status === 'in_consultation'
                                ? 'bg-teal-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                            {apt.status.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={bookingPage}
                totalItems={filteredBookings.length}
                pageSize={pageSize}
                onPageChange={setBookingPage}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER NEW PATIENT                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Outpatient"
        description="Creates a new patient demographic file and medical record profile."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRegisterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRegisterPatient}
            >
              Confirm Registration
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterPatient} className="space-y-4" noValidate>
          {regError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
              {regError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={regFirstName}
              onChange={(e) => {
                setRegFirstName(e.target.value);
                if (regError) setRegError('');
              }}
              placeholder="e.g. John"
              error={!regFirstName.trim() && regError ? 'First name is required' : undefined}
            />
            <Input
              label="Last Name"
              value={regLastName}
              onChange={(e) => {
                setRegLastName(e.target.value);
                if (regError) setRegError('');
              }}
              placeholder="e.g. Doe"
              error={!regLastName.trim() && regError ? 'Last name is required' : undefined}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Gender"
              value={regGender}
              onChange={(e) => setRegGender(e.target.value as any)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <DatePicker
              label="Date of Birth"
              value={regDob}
              onChange={setRegDob}
            />
            <Select
              label="Blood Group"
              value={regBlood}
              onChange={(e) => setRegBlood(e.target.value as BloodGroup)}
              options={[
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              value={regPhone}
              onChange={(e) => {
                setRegPhone(e.target.value);
                if (regError) setRegError('');
              }}
              placeholder="+1 (555) 000-0000"
              error={!regPhone.trim() && regError ? 'Contact phone is required' : undefined}
            />
            <Input
              label="Known Allergies"
              value={regAllergies}
              onChange={(e) => setRegAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts"
              helperText="Safety alert for doctor consultation"
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: BOOK CONSULTATION / WALK-IN CHECK-IN                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        title="Book Outpatient Consultation"
        description={`Schedule or check in with any clinic physician (${selectedDoctor.name} • ${selectedDoctor.roomNumber}).`}
        maxWidth="lg"
        overflowVisible={true}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBookOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Ticket className="w-4 h-4" />}
              onClick={handleBookAppointment}
            >
              Issue Token & Queue
            </Button>
          </>
        }
      >
        <form onSubmit={handleBookAppointment} className="space-y-4" noValidate>
          {bookingError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
              {bookingError}
            </div>
          )}

          <Select
            label="Select Registered Patient"
            size="lg"
            searchable={true}
            searchPlaceholder="Search patient by name or MRN..."
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName} (${p.mrn})`,
            }))}
          />

          <Select
            label="Attending Physician"
            size="lg"
            searchable={true}
            searchPlaceholder="Search physician by name or room..."
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.specialization}) - ${d.roomNumber}`,
            }))}
          />

          <Input
            label="Reason for Visit / Complaint"
            value={bookingReason}
            onChange={(e) => {
              setBookingReason(e.target.value);
              if (bookingError) setBookingError('');
            }}
            placeholder="e.g. Follow-up consultation, fever check"
            error={!bookingReason.trim() && bookingError ? 'Reason for visit is required' : undefined}
          />

          <div className="flex items-center gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              id="walkinCheck"
              checked={isWalkIn}
              onChange={(e) => setIsWalkIn(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            />
            <label htmlFor="walkinCheck" className="cursor-pointer font-medium">
              Immediate Check-In (Patient is physically present in lounge)
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
