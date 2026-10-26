import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { DictationButton } from '@/components/ui/DictationButton';
import {
  Appointment,
  Doctor,
  Patient,
  User,
  PatientAssignment,
} from '@/types';
import { Shift, LeaveRequest } from '@/types/attendance';
import { Invoice, Payment } from '@/types/billing';
import { formatDoctorName } from '@/lib/doctorNames';
import { isDoctorAvailable } from '@/lib/availability';
import { getAssignedDoctorId } from '@/lib/permissions';
import {
  validateWalkInNewArrival,
  validateWalkInExistingArrival,
} from '@/lib/reception';
import { getAvailableSlots, validateBooking } from '@/lib/scheduling';
import { balanceDue, formatCurrency } from '@/lib/billing';

// ============================================================================
// 1. REGISTER PATIENT MODAL
// ============================================================================
export interface RegisterPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  registerPatient: (
    data: any,
    actingUser?: User | null
  ) => { success: boolean; patient?: Patient; error?: string };
  onSuccess?: (msg: string) => void;
}

export const RegisterPatientModal: React.FC<RegisterPatientModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  registerPatient,
  onSuccess,
}) => {
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDob, setRegDob] = useState('1990-01-01');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmergName, setRegEmergName] = useState('');
  const [regEmergPhone, setRegEmergPhone] = useState('');
  const [regError, setRegError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('First name and last name are required.');
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
    onClose();
    onSuccess?.(`Patient registered: ${createdPat.firstName} ${createdPat.lastName} (${createdPat.mrn}).`);

    // Reset
    setRegFirstName('');
    setRegLastName('');
    setRegPhone('');
    setRegEmail('');
    setRegAddress('');
    setRegEmergName('');
    setRegEmergPhone('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Patient">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Register Patient
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// 2. WALK-IN CHECK-IN MODAL
// ============================================================================
export interface WalkInCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  patientAssignments: PatientAssignment[];
  billingInvoices: Invoice[];
  billingPayments: Payment[];
  todayStr: string;
  currentUser: User | null;
  registerPatient: (
    data: any,
    actingUser?: User | null
  ) => { success: boolean; patient?: Patient; error?: string };
  checkInWalkIn: (
    params: {
      patientId: string;
      doctorId: string;
      reasonForVisit: string;
      isNewPatient?: boolean;
    },
    actingUser?: User | null,
    dateOverride?: string
  ) => { success: boolean; appointment?: Appointment; error?: string };
  onSuccess?: (msg: string) => void;
}

export const WalkInCheckInModal: React.FC<WalkInCheckInModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  patientAssignments,
  billingInvoices,
  billingPayments,
  todayStr,
  currentUser,
  registerPatient,
  checkInWalkIn,
  onSuccess,
}) => {
  const [walkInMode, setWalkInMode] = useState<'existing' | 'new'>('existing');
  const [walkInPatientId, setWalkInPatientId] = useState(patients[0]?.id || '');
  const [walkInDoctorId, setWalkInDoctorId] = useState('');
  const [walkInReason, setWalkInReason] = useState('');
  const [walkInError, setWalkInError] = useState('');

  // New patient walk-in demographics
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDob, setNewDob] = useState('1990-01-01');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newEmergName, setNewEmergName] = useState('');
  const [newEmergPhone, setNewEmergPhone] = useState('');

  // Available doctors today for new walk-ins
  const availableDoctorsToday = useMemo(() => {
    return doctors.filter((d) => isDoctorAvailable(d.id, todayStr));
  }, [doctors, todayStr]);

  useEffect(() => {
    if (!walkInDoctorId && availableDoctorsToday.length > 0) {
      setWalkInDoctorId(availableDoctorsToday[0].id);
    }
  }, [availableDoctorsToday, walkInDoctorId]);

  useEffect(() => {
    if (!walkInPatientId && patients.length > 0) {
      setWalkInPatientId(patients[0].id);
    }
  }, [patients, walkInPatientId]);

  // Active doctor assignment helper for existing walk-in flow
  const currentAssignedDocId = walkInPatientId
    ? getAssignedDoctorId(walkInPatientId, patientAssignments)
    : null;
  const currentAssignedDoc = doctors.find((d) => d.id === currentAssignedDocId);
  const isAssignedDocAvailableToday = currentAssignedDocId
    ? isDoctorAvailable(currentAssignedDocId, todayStr)
    : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError('');

    if (walkInMode === 'new') {
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

      onClose();
      onSuccess?.(
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

      onClose();
      onSuccess?.(
        `Walk-in admitted. Token #${checkInRes.appointment.tokenNumber} issued for ${formatDoctorName(checkInRes.appointment.doctorName)}.`
      );
      setWalkInReason('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Walk-in Patient Check-In">
      <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                value={walkInReason}
                onChange={(e) => setWalkInReason(e.target.value)}
                placeholder="Reason for visit"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!isAssignedDocAvailableToday}
              >
                Check In
              </Button>
            </div>
          </div>
        ) : (
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="patient@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Address"
              />
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
                Assigned Physician Today
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
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                  No physicians are available today.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Chief Complaint</label>
              <Input
                value={walkInReason}
                onChange={(e) => setWalkInReason(e.target.value)}
                placeholder="Reason for visit"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose}>
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
  );
};

// ============================================================================
// 3. BOOK APPOINTMENT MODAL
// ============================================================================
export interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoctorId?: string;
  initialDate?: string;
  initialTime?: string;
  patients: Patient[];
  doctors: Doctor[];
  patientAssignments: PatientAssignment[];
  appointments: Appointment[];
  shifts: Shift[];
  leaves: LeaveRequest[];
  todayStr: string;
  currentUser: User | null;
  bookAppointment: (
    data: {
      patientId: string;
      doctorId: string;
      dateTime: string;
      reasonForVisit: string;
      source?: any;
    },
    actingUser?: User | null
  ) => { success: boolean; appointment?: Appointment; error?: string };
  onSuccess?: (msg: string) => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  isOpen,
  onClose,
  initialDoctorId,
  initialDate,
  initialTime,
  patients,
  doctors,
  patientAssignments,
  appointments,
  shifts,
  leaves,
  todayStr,
  currentUser,
  bookAppointment,
  onSuccess,
}) => {
  const [bookPatientId, setBookPatientId] = useState(patients[0]?.id || '');
  const [bookDoctorId, setBookDoctorId] = useState(initialDoctorId || doctors[0]?.id || '');
  const [bookDate, setBookDate] = useState(initialDate || todayStr);
  const [bookTime, setBookTime] = useState(initialTime || '');
  const [bookReason, setBookReason] = useState('');
  const [bookError, setBookError] = useState('');
  const bookReasonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDoctorId) setBookDoctorId(initialDoctorId);
    if (initialDate) setBookDate(initialDate);
    if (initialTime) setBookTime(initialTime);
  }, [initialDoctorId, initialDate, initialTime]);

  useEffect(() => {
    if (!bookPatientId && patients.length > 0) {
      setBookPatientId(patients[0].id);
    }
  }, [patients, bookPatientId]);

  // Available doctors on chosen booking date
  const availableDoctorsOnBookDate = useMemo(() => {
    return doctors.filter((d) => isDoctorAvailable(d.id, bookDate));
  }, [doctors, bookDate]);

  useEffect(() => {
    if (
      availableDoctorsOnBookDate.length > 0 &&
      !availableDoctorsOnBookDate.some((d) => d.id === bookDoctorId)
    ) {
      setBookDoctorId(availableDoctorsOnBookDate[0].id);
    }
  }, [availableDoctorsOnBookDate, bookDoctorId]);

  // Available booking slots for selected doctor and date
  const availableBookingSlots = useMemo(() => {
    if (!bookDoctorId || !bookDate) return [];
    return getAvailableSlots(
      bookDoctorId,
      bookDate,
      appointments,
      shifts,
      leaves,
      new Date()
    );
  }, [bookDoctorId, bookDate, appointments, shifts, leaves]);

  useEffect(() => {
    if (availableBookingSlots.length > 0 && !availableBookingSlots.includes(bookTime)) {
      setBookTime(availableBookingSlots[0]);
    }
  }, [availableBookingSlots, bookTime]);

  const handleSubmit = (e: React.FormEvent) => {
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

    const validation = validateBooking(
      bookDoctorId,
      bookDate,
      bookTime,
      bookPatientId,
      appointments,
      shifts,
      leaves,
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

    onClose();
    onSuccess?.(`Appointment booked for ${res.appointment.patientName} on ${bookDate} at ${bookTime}.`);
    setBookReason('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Consultation Appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="button" variant="outline" onClick={onClose} className="py-2 px-4 min-h-[44px]">
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
  );
};
