import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Calendar,
  Pill,
  FlaskConical,
  CreditCard,
  Plus,
  Clock,
} from 'lucide-react';

interface PatientViewProps {
  activeTab?: string;
}

export const PatientView: React.FC<PatientViewProps> = ({ activeTab: _activeTab = 'overview' }) => {
  const {
    patients,
    doctors,
    appointments,
    prescriptions,
    labTests,
    invoices,
    addAppointment,
  } = useClinic();

  // Eleanor Wright's patient record
  const currentPatient = patients.find((p) => p.mrn === 'MRN-84291') || patients[0];

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [appointmentDate, setAppointmentDate] = useState('2026-10-20');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [reason, setReason] = useState('Follow-up blood pressure consultation');

  const myAppointments = appointments.filter(
    (a) => a.patientId === currentPatient.id
  );
  const myPrescriptions = prescriptions.filter(
    (p) => p.patientId === currentPatient.id
  );
  const myLabTests = labTests.filter((l) => l.patientId === currentPatient.id);
  const myInvoices = invoices.filter((i) => i.patientId === currentPatient.id);

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

    addAppointment({
      patientId: currentPatient.id,
      patientName: `${currentPatient.firstName} ${currentPatient.lastName}`,
      patientPhone: currentPatient.phone,
      doctorId: doc.id,
      doctorName: doc.name,
      department: doc.department,
      dateTime: `${appointmentDate}T${appointmentTime}:00`,
      durationMinutes: 30,
      status: 'scheduled',
      reasonForVisit: reason,
    });

    setIsBookModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Patient Profile Header */}
      <div className="bg-gradient-to-r from-teal-700 to-slate-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold">
            {currentPatient.firstName[0]}
            {currentPatient.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                Welcome, {currentPatient.firstName} {currentPatient.lastName}
              </h2>
              <span className="text-xs bg-teal-500/30 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full">
                Active Patient
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
              <span>Medical Record Number: <strong>{currentPatient.mrn}</strong></span>
              <span>•</span>
              <span>Blood Group: <strong>{currentPatient.bloodGroup}</strong></span>
              <span>•</span>
              <span>Contact: {currentPatient.phone}</span>
            </div>
          </div>
        </div>

        <Button
          size="md"
          variant="primary"
          className="bg-white text-teal-900 hover:bg-slate-100 font-semibold"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsBookModalOpen(true)}
        >
          Book New Consultation
        </Button>
      </div>

      {/* Submodules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">My Appointments</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{myAppointments.length} Booked</div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Active Prescriptions</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{myPrescriptions.length} Orders</div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Laboratory Tests</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{myLabTests.length} Reports</div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Billing Invoices</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{myInvoices.length} Invoices</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Section */}
        <Card>
          <CardHeader
            action={
              <Button
                size="xs"
                variant="soft"
                onClick={() => setIsBookModalOpen(true)}
              >
                + Book Visit
              </Button>
            }
          >
            <CardTitle>My Appointments & Visits</CardTitle>
            <CardDescription>Scheduled checkups and clinic visits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myAppointments.length > 0 ? (
              myAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {apt.appointmentNumber}
                      </span>
                      <Badge
                        size="sm"
                        variant={
                          apt.status === 'completed'
                            ? 'success'
                            : apt.status === 'in_consultation'
                            ? 'teal'
                            : 'info'
                        }
                      >
                        {apt.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {apt.doctorName} ({apt.department})
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Reason: {apt.reasonForVisit}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(apt.dateTime).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(apt.dateTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>Token #{apt.tokenNumber}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No appointments scheduled.</p>
            )}
          </CardContent>
        </Card>

        {/* Prescriptions Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Active Prescriptions & Medications</CardTitle>
            <CardDescription>Prescribed medications, instructions, and dispensary status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myPrescriptions.length > 0 ? (
              myPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        {rx.prescriptionNumber}
                      </span>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Prescribed by {rx.doctorName} • {rx.diagnosis}
                      </div>
                    </div>
                    <Badge
                      size="sm"
                      variant={rx.status === 'dispensed' ? 'success' : 'warning'}
                    >
                      {rx.status}
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-200/60 pt-1">
                    {rx.items.map((item) => (
                      <div key={item.id} className="py-2 text-xs">
                        <div className="font-semibold text-slate-900">
                          {item.medicineName} ({item.dosage})
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Dosage: {item.frequency} for {item.duration}
                        </div>
                        <div className="text-slate-500 text-[11px] italic mt-0.5">
                          "{item.instructions}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No active prescriptions.</p>
            )}
          </CardContent>
        </Card>

        {/* Lab Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Laboratory Reports</CardTitle>
            <CardDescription>Diagnostic investigations, specimens, and clinical results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myLabTests.length > 0 ? (
              myLabTests.map((lt) => (
                <div
                  key={lt.id}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {lt.testName}
                    </span>
                    <Badge
                      size="sm"
                      variant={lt.status === 'completed' ? 'success' : 'info'}
                    >
                      {lt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Order #{lt.testOrderNumber} • Ordered by {lt.doctorName}
                  </div>
                  {lt.result ? (
                    <div className="p-2.5 bg-white rounded border border-slate-200 mt-2 text-xs">
                      <div className="font-semibold text-teal-800">
                        Result: {lt.result}
                      </div>
                      {lt.referenceRange && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Reference Range: {lt.referenceRange}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 mt-2">
                      Specimen collected. Lab analysis in progress.
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No laboratory tests recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Invoices & Receipts</CardTitle>
            <CardDescription>Clinic fees, procedures, and payment status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myInvoices.length > 0 ? (
              myInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </span>
                      <div className="text-[11px] text-slate-500">Date: {inv.date}</div>
                    </div>
                    <Badge
                      size="sm"
                      variant={inv.status === 'paid' ? 'success' : 'danger'}
                    >
                      {inv.status}
                    </Badge>
                  </div>

                  <div className="divide-y divide-slate-200/60 pt-1">
                    {inv.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-1.5 flex justify-between text-xs text-slate-700"
                      >
                        <span>{item.description}</span>
                        <span className="font-semibold">${item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span>${inv.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No invoices on file.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Book Clinic Appointment"
        description="Select a specialist physician and preferred consultation schedule."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBookModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBookAppointment}
            >
              Confirm Appointment
            </Button>
          </>
        }
      >
        <form onSubmit={handleBookAppointment} className="space-y-3.5">
          <Select
            label="Attending Doctor"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.specialization}) - $${d.consultationFee}`,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Appointment Date"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />
            <Input
              label="Preferred Time"
              type="time"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reason for Visit / Symptoms"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe your symptoms"
            required
          />
        </form>
      </Modal>
    </div>
  );
};
