import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import {
  UserCheck,
  Plus,
  Clock,
  Ticket,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { BloodGroup } from '@/types';

interface ReceptionistViewProps {
  activeTab: string;
}

export const ReceptionistView: React.FC<ReceptionistViewProps> = ({ activeTab: _activeTab }) => {
  const {
    appointments,
    patients,
    doctors,
    updateAppointmentStatus,
    addPatient,
    addAppointment,
  } = useClinic();

  const [search, setSearch] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Registration Form
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('1995-05-15');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('female');
  const [regBlood, setRegBlood] = useState<BloodGroup>('B+');

  // Booking Form
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [bookingReason, setBookingReason] = useState('General consultation');

  const checkedInCount = appointments.filter((a) => a.status === 'checked_in').length;
  const inConsultCount = appointments.filter((a) => a.status === 'in_consultation').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regLastName || !regPhone) return;

    const birthYear = new Date(regDob).getFullYear();
    const calculatedAge = new Date().getFullYear() - birthYear;

    const newPat = addPatient({
      firstName: regFirstName,
      lastName: regLastName,
      gender: regGender,
      dob: regDob,
      age: calculatedAge > 0 ? calculatedAge : 28,
      phone: regPhone,
      email: `${regFirstName.toLowerCase()}@patient.com`,
      address: 'Springfield',
      bloodGroup: regBlood,
      allergies: [],
      chronicConditions: [],
      emergencyContact: {
        name: 'Family Member',
        relationship: 'Contact',
        phone: regPhone,
      },
    });

    setSelectedPatientId(newPat.id);
    setIsRegisterOpen(false);
    setRegFirstName('');
    setRegLastName('');
    setRegPhone('');
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === selectedPatientId) || patients[0];
    const doc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

    addAppointment({
      patientId: pat.id,
      patientName: `${pat.firstName} ${pat.lastName}`,
      patientPhone: pat.phone,
      doctorId: doc.id,
      doctorName: doc.name,
      department: doc.department,
      dateTime: new Date().toISOString(),
      durationMinutes: 30,
      status: 'checked_in', // Immediate check-in for walk-ins
      reasonForVisit: bookingReason,
    });

    setIsBookOpen(false);
  };

  const filteredAppointments = appointments.filter(
    (a) =>
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.appointmentNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Front Desk & Patient Triage Reception
          </h2>
          <p className="text-xs text-slate-500">
            Check-in arriving patients, issue tokens, and manage physician queues.
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

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="In Waiting Lounge"
          value={checkedInCount}
          subtitle="Checked in with token"
          icon={<Clock className="w-5 h-5" />}
          colorScheme="amber"
        />
        <StatCard
          title="Currently with Physician"
          value={inConsultCount}
          subtitle="Active in consultation rooms"
          icon={<UserCheck className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Completed Today"
          value={completedCount}
          subtitle="Patients discharged"
          icon={<CheckCircle2 className="w-5 h-5" />}
          colorScheme="blue"
        />
      </div>

      {/* Front Desk Queue & Check-In Action Table */}
      <Card>
        <CardHeader
          action={
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search appointment or patient..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          }
        >
          <CardTitle>Today's Front Desk Queue & Token Dispatch</CardTitle>
          <CardDescription>
            Verify arriving patients and advance them to the nursing triage station
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Patient Details</th>
                  <th className="px-4 py-3">Assigned Physician</th>
                  <th className="px-4 py-3">Scheduled Time</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3 text-right">Front Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-1 rounded-md">
                        #{apt.tokenNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {apt.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {apt.patientPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{apt.doctorName}</div>
                      <div className="text-[11px] text-slate-500">
                        {apt.department}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(apt.dateTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          apt.status === 'checked_in'
                            ? 'warning'
                            : apt.status === 'in_consultation'
                            ? 'teal'
                            : apt.status === 'completed'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {apt.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {apt.status === 'scheduled' || apt.status === 'confirmed' ? (
                        <button
                          onClick={() =>
                            updateAppointmentStatus(apt.id, 'checked_in')
                          }
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium text-xs transition-colors"
                        >
                          Check In & Issue Token
                        </button>
                      ) : apt.status === 'checked_in' ? (
                        <span className="text-amber-700 font-medium text-[11px]">
                          Waiting in Lounge
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
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

      {/* Quick Register Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Walk-In Patient Registration"
        description="Quick intake form to generate immediate Medical Record Number (MRN)."
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
              Register & Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterPatient} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={regFirstName}
              onChange={(e) => setRegFirstName(e.target.value)}
              placeholder="First name"
              required
            />
            <Input
              label="Last Name"
              value={regLastName}
              onChange={(e) => setRegLastName(e.target.value)}
              placeholder="Last name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              value={regDob}
              onChange={(e) => setRegDob(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Gender"
              value={regGender}
              onChange={(e) =>
                setRegGender(e.target.value as 'male' | 'female' | 'other')
              }
              options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Select
              label="Blood Group"
              value={regBlood}
              onChange={(e) => setRegBlood(e.target.value as BloodGroup)}
              options={[
                { value: 'A+', label: 'A+' },
                { value: 'B+', label: 'B+' },
                { value: 'O+', label: 'O+' },
                { value: 'AB+', label: 'AB+' },
                { value: 'O-', label: 'O-' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* Quick Walk-In Booking Modal */}
      <Modal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        title="Immediate Walk-In Check-In & Token"
        description="Creates a today's consultation slot and marks the patient checked-in."
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
              onClick={handleBookAppointment}
            >
              Assign Token & Check In
            </Button>
          </>
        }
      >
        <form onSubmit={handleBookAppointment} className="space-y-3.5">
          <Select
            label="Patient"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName} (${p.mrn})`,
            }))}
          />

          <Select
            label="Doctor"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.specialization}) - Room: ${d.roomNumber}`,
            }))}
          />

          <Input
            label="Reason for Visit"
            value={bookingReason}
            onChange={(e) => setBookingReason(e.target.value)}
            placeholder="e.g. Acute headache, prescription renewal"
          />
        </form>
      </Modal>
    </div>
  );
};
