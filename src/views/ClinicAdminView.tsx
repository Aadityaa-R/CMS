import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Users,
  UserCheck,
  Calendar,
  CreditCard,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { BloodGroup } from '@/types';

interface ClinicAdminViewProps {
  activeTab: string;
}

export const ClinicAdminView: React.FC<ClinicAdminViewProps> = ({ activeTab }) => {
  const {
    patients,
    doctors,
    appointments,
    invoices,
    inventory,
    addPatient,
    updateAppointmentStatus,
  } = useClinic();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  // Form State for Adding Patient
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('1990-01-01');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [allergies, setAllergies] = useState('');

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) return;

    const birthYear = new Date(dob).getFullYear();
    const calculatedAge = new Date().getFullYear() - birthYear;

    addPatient({
      firstName,
      lastName,
      gender,
      dob,
      age: calculatedAge > 0 ? calculatedAge : 30,
      phone,
      email: email || `${firstName.toLowerCase()}@patient.com`,
      address: address || 'City Center',
      bloodGroup,
      allergies: allergies ? allergies.split(',').map((s) => s.trim()) : [],
      chronicConditions: [],
      emergencyContact: {
        name: 'Primary Contact',
        relationship: 'Family',
        phone,
      },
    });

    setIsAddPatientOpen(false);
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setAllergies('');
  };

  // Calculations for KPI Cards
  const totalPatients = patients.length;
  const activeDoctors = doctors.filter((d) => d.status === 'active').length;
  const todayAppointments = appointments.length;
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const pendingRevenue = invoices.reduce(
    (acc, inv) => acc + (inv.totalAmount - inv.paidAmount),
    0
  );
  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStockLevel).length;

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const query = searchTerm.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.phone.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Clinic Administration Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Real-time clinic performance, medical departments, and patient operations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddPatientOpen(true)}
          >
            Register Patient
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Patients"
          value={totalPatients}
          subtitle="Electronic Medical Records"
          icon={<Users className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Active Medical Staff"
          value={activeDoctors}
          subtitle="Consulting Physicians"
          icon={<UserCheck className="w-5 h-5" />}
          colorScheme="blue"
        />
        <StatCard
          title="Scheduled Appointments"
          value={todayAppointments}
          subtitle="Across all departments"
          icon={<Calendar className="w-5 h-5" />}
          colorScheme="purple"
        />
        <StatCard
          title="Clinic Revenue Collected"
          value={`$${totalRevenue.toFixed(2)}`}
          subtitle={`Pending: $${pendingRevenue.toFixed(2)}`}
          icon={<CreditCard className="w-5 h-5" />}
          colorScheme="amber"
        />
      </div>

      {/* Submodule Tabs View */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Appointments */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader
                action={
                  <span className="text-xs text-slate-500 font-medium">
                    {appointments.length} Total Today
                  </span>
                }
              >
                <CardTitle>Today's Appointment Schedule</CardTitle>
                <CardDescription>
                  Live status of clinic consultations and patient queue
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                      <tr>
                        <th className="px-4 py-3">Token & ID</th>
                        <th className="px-4 py-3">Patient</th>
                        <th className="px-4 py-3">Attending Doctor</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.slice(0, 5).map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            #{apt.tokenNumber} - {apt.appointmentNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
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
                                apt.status === 'completed'
                                  ? 'success'
                                  : apt.status === 'in_consultation'
                                  ? 'teal'
                                  : apt.status === 'checked_in'
                                  ? 'info'
                                  : 'warning'
                              }
                            >
                              {apt.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {apt.status !== 'completed' && (
                              <Button
                                size="xs"
                                variant="soft"
                                onClick={() =>
                                  updateAppointmentStatus(apt.id, 'completed')
                                }
                              >
                                Mark Completed
                              </Button>
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

          {/* Clinic Health & Inventory Alerts */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operational Alerts</CardTitle>
                <CardDescription>Supplies and staff notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockCount > 0 ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/60 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-amber-900">
                        Low Stock Alert ({lowStockCount} items)
                      </div>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Hydrochlorothiazide 12.5mg is below minimum threshold (18 / 50).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200/60 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-900">
                        Inventory Levels Optimal
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        All essential medical supplies meet threshold requirements.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      Average Wait Time
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Current patient check-in to consultation triage is 14 minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Patients Directory Tab */}
      {(activeTab === 'patients' || activeTab === 'overview') && (
        <Card>
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <div className="relative w-64 flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, MRN, phone..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white shadow-xs transition-all"
                  />
                </div>
              </div>
            }
          >
            <CardTitle>Registered Patient Directory</CardTitle>
            <CardDescription>
              Demographic records, allergies, and contact profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">MRN</th>
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Age / Gender</th>
                    <th className="px-4 py-3">Contact Number</th>
                    <th className="px-4 py-3">Blood Group</th>
                    <th className="px-4 py-3">Allergies</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((pat) => (
                    <tr key={pat.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {pat.mrn}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {pat.firstName} {pat.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500">{pat.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 capitalize">
                        {pat.age} yrs • {pat.gender}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{pat.phone}</td>
                      <td className="px-4 py-3">
                        <Badge variant="teal">{pat.bloodGroup}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {pat.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {pat.allergies.map((alg) => (
                              <Badge key={alg} variant="danger" size="sm">
                                {alg}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">None Recorded</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={pat.status === 'active' ? 'success' : 'neutral'}
                        >
                          {pat.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctors Tab */}
      {activeTab === 'doctors' && (
        <Card>
          <CardHeader>
            <CardTitle>Medical Specialist Directory</CardTitle>
            <CardDescription>
              Physician roster, consultation fees, and working hours
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">Physician</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Qualifications</th>
                    <th className="px-4 py-3">Consultation Hours</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {doc.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {doc.specialization}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {doc.qualification}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {doc.consultationHours}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ${doc.consultationFee}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{doc.roomNumber}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={doc.status === 'active' ? 'success' : 'warning'}
                        >
                          {doc.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Patient Modal */}
      <Modal
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        title="Register New Clinic Patient"
        description="Create an official Electronic Medical Record (EMR) for the patient."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddPatientOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSavePatient}
            >
              Save Registration
            </Button>
          </>
        }
      >
        <form onSubmit={handleSavePatient} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John"
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Doe"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as 'male' | 'female' | 'other')
              }
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
            <Select
              label="Blood Group"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
            />
          </div>

          <Input
            label="Residential Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address, city"
          />

          <Input
            label="Allergies (comma-separated)"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Peanuts"
            helperText="Critical for doctor and pharmacy safety alerts"
          />
        </form>
      </Modal>
    </div>
  );
};
