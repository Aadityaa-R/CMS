import React, { useState, useRef, useEffect } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  Ticket,
  Search,
  CheckCircle2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { BloodGroup, Appointment } from '@/types';

interface ReceptionistViewProps {
  activeTab?: string;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({ activeTab = 'overview' }) => {
  const { currentUser } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>(activeTab || 'overview');

  useEffect(() => {
    if (activeTab && activeTab !== 'overview') {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);
  const {
    appointments,
    patients,
    doctors,
    updateAppointmentStatus,
    addPatient,
    addAppointment,
  } = useClinic();

  // Primary sole doctor
  const primaryDoctor = doctors[0] || {
    id: 'doc-1',
    name: 'Dr. Marcus Vance',
    department: 'Internal Medicine',
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'waiting' | 'urgent'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

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

  // Booking Form State
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || 'doc-1');
  const [bookingReason, setBookingReason] = useState('General consultation');
  const [isWalkIn, setIsWalkIn] = useState(true);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || primaryDoctor;

  // KPI Calculations
  const waitingCount = appointments.filter((a) => a.status === 'checked_in').length;
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
    if (!regFirstName || !regLastName || !regPhone) return;

    const birthYear = new Date(regDob).getFullYear();
    const calculatedAge = Math.max(1, new Date().getFullYear() - birthYear);

    const newPat = addPatient({
      firstName: regFirstName,
      lastName: regLastName,
      gender: regGender,
      dob: regDob,
      age: calculatedAge,
      phone: regPhone,
      email: `${regFirstName.toLowerCase()}.${regLastName.toLowerCase()}@patient.com`,
      address: 'Beacon City Center',
      bloodGroup: regBlood,
      allergies: regAllergies ? regAllergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      chronicConditions: [],
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Family',
        phone: regPhone,
      },
    });

    showNotification(
      `New patient ${newPat.firstName} ${newPat.lastName} registered (${newPat.mrn}). Profile active.`
    );

    setSelectedPatientId(newPat.id);
    setIsRegisterOpen(false);
    setRegFirstName('');
    setRegLastName('');
    setRegPhone('');
    setRegAllergies('');
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
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
  const query = searchTerm.toLowerCase();

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query) ||
      a.reasonForVisit.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'waiting') return a.status === 'checked_in';
    if (filterMode === 'urgent') return a.status === 'checked_in' && a.tokenNumber <= 2;
    return true;
  });

  const awaitingCheckIn = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Front Desk & Patient Reception Workstation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Front Desk Lead: {currentUser.name} • Patient Admissions & Consultation Queue Coordination
          </p>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search arriving patient, appointment ID, or reason for visit..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg !pl-11 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
          />
        </div>

        {/* Priority Filter as Dropdown Selector */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-teal-500"
            aria-label="Filter queue"
            aria-expanded={isFilterDropdownOpen}
          >
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Queue:</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {filterMode === 'all'
                ? 'All Today'
                : filterMode === 'waiting'
                ? 'Waiting Lounge Only'
                : 'Priority Patients'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Filter Reception Queue
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Today</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {appointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('waiting');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'waiting'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  Waiting Lounge
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {waitingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('urgent');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'urgent'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Priority Next
                </span>
              </button>
            </div>
          )}
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
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5 align-middle">Token</th>
                        <th className="px-4 py-3.5 align-middle">Patient Details</th>
                        <th className="px-4 py-3.5 align-middle">Physician</th>
                        <th className="px-4 py-3.5 align-middle">Scheduled Time</th>
                        <th className="px-4 py-3.5 align-middle">Reason for Visit</th>
                        <th className="px-4 py-3.5 align-middle">Status</th>
                        <th className="px-4 py-3.5 text-right align-middle">Front Desk Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAppointments.map((apt) => (
                        <tr
                          key={apt.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <td className="px-4 py-3.5 align-middle font-mono font-bold text-teal-600 dark:text-teal-400">
                            #{apt.tokenNumber}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {apt.patientName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {apt.patientPhone}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {apt.doctorName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {apt.department}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {new Date(apt.dateTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3.5 align-middle text-slate-600 dark:text-slate-400">
                            {apt.reasonForVisit}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
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
                          </td>
                          <td className="px-4 py-3.5 text-right align-middle">
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                    Sole Receptionist on Duty
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {currentUser.name}
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 block text-[11px] mt-0.5">
                    Lead Front Desk Coordinator • Admissions & Triage
                  </span>
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
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Appointment #</th>
                    <th className="px-4 py-3.5 align-middle">Patient Name</th>
                    <th className="px-4 py-3.5 align-middle">Contact Phone</th>
                    <th className="px-4 py-3.5 align-middle">Scheduled Slot</th>
                    <th className="px-4 py-3.5 align-middle">Consulting Doctor</th>
                    <th className="px-4 py-3.5 align-middle">Status</th>
                    <th className="px-4 py-3.5 text-right align-middle">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {awaitingCheckIn.length > 0 ? (
                    awaitingCheckIn.map((apt) => (
                      <tr
                        key={apt.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {apt.appointmentNumber}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 dark:text-slate-100">
                          {apt.patientName}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {apt.patientPhone}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-slate-800 dark:text-slate-200">
                          {apt.doctorName}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                              {apt.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle">
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<Ticket className="w-3.5 h-3.5" />}
                            onClick={() => handleCheckIn(apt)}
                          >
                            Issue Token & Check In
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                        All scheduled patients have been checked in or no further bookings pending.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
              <Button
                size="xs"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsRegisterOpen(true)}
              >
                Register New Patient
              </Button>
            }
          >
            <CardTitle>Patient Intake & Registration Registry</CardTitle>
            <CardDescription>
              Registered outpatient files and demographic directory under Priya Sharma
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">MRN</th>
                    <th className="px-4 py-3.5 align-middle">Patient Name</th>
                    <th className="px-4 py-3.5 align-middle">Age & Gender</th>
                    <th className="px-4 py-3.5 align-middle">Contact Phone</th>
                    <th className="px-4 py-3.5 align-middle">Blood Group</th>
                    <th className="px-4 py-3.5 align-middle">Emergency Contact</th>
                    <th className="px-4 py-3.5 align-middle">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patients.map((pat) => (
                    <tr
                      key={pat.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {pat.mrn}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {pat.firstName} {pat.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {pat.email}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 capitalize">
                        {pat.age} yrs • {pat.gender}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {pat.phone}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <Badge variant="teal">{pat.bloodGroup}</Badge>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300">
                        {pat.emergencyContact?.name} ({pat.emergencyContact?.relationship})
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                            {pat.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <Button
                size="xs"
                variant="primary"
                icon={<Ticket className="w-3.5 h-3.5" />}
                onClick={() => setIsBookOpen(true)}
              >
                Book Consultation
              </Button>
            }
          >
            <CardTitle>Appointment Booking & Scheduling Terminal</CardTitle>
            <CardDescription>
              Assign consultations directly to clinic physicians across Consultation Desks 1, 2, and 3
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Token #</th>
                    <th className="px-4 py-3.5 align-middle">Appointment ID</th>
                    <th className="px-4 py-3.5 align-middle">Patient Name</th>
                    <th className="px-4 py-3.5 align-middle">Physician</th>
                    <th className="px-4 py-3.5 align-middle">Scheduled Time</th>
                    <th className="px-4 py-3.5 align-middle">Reason for Visit</th>
                    <th className="px-4 py-3.5 align-middle">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {appointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-4 py-3.5 align-middle font-mono font-bold text-teal-600 dark:text-teal-400">
                        #{apt.tokenNumber}
                      </td>
                      <td className="px-4 py-3.5 align-middle font-mono text-slate-800 dark:text-slate-200">
                        {apt.appointmentNumber}
                      </td>
                      <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 dark:text-slate-100">
                        {apt.patientName}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300">
                        {apt.doctorName}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-600 dark:text-slate-400">
                        {apt.reasonForVisit}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        <form onSubmit={handleRegisterPatient} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={regFirstName}
              onChange={(e) => setRegFirstName(e.target.value)}
              placeholder="e.g. John"
              required
            />
            <Input
              label="Last Name"
              value={regLastName}
              onChange={(e) => setRegLastName(e.target.value)}
              placeholder="e.g. Doe"
              required
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
              required
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
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
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
        maxWidth="md"
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
        <form onSubmit={handleBookAppointment} className="space-y-4">
          <Select
            label="Select Registered Patient"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName} (${p.mrn})`,
            }))}
          />

          <Select
            label="Attending Physician"
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
            onChange={(e) => setBookingReason(e.target.value)}
            placeholder="e.g. Follow-up consultation, fever check"
            required
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
