import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import {
  Stethoscope,
  Pill,
  FlaskConical,
  Activity,
  CheckCircle,
  Clock,
  Plus,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Appointment, PrescriptionItem } from '@/types';

interface DoctorViewProps {
  activeTab: string;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ activeTab: _activeTab }) => {
  const { currentUser } = useAuth();
  const {
    appointments,
    patients,
    vitals,
    prescriptions,
    labTests,
    createPrescription,
    createLabTest,
    updateAppointmentStatus,
  } = useClinic();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(
    appointments.find((a) => a.status === 'in_consultation') || appointments[0] || null
  );

  // Prescription Modal State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState('Hypertension Follow-Up - Stable');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      id: 'item-1',
      medicineName: 'Amlodipine Besylate',
      dosage: '5 mg',
      frequency: 'Once daily in morning',
      duration: '30 days',
      instructions: 'Take with water after breakfast.',
      dispensed: false,
    },
  ]);

  // Lab Order Modal State
  const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState('Lipid Profile Assay');
  const [labPriority, setLabPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [labNotes, setLabNotes] = useState('Routine screening for cardiovascular risk.');

  // Current Patient context
  const currentPatient = selectedAppointment
    ? patients.find((p) => p.id === selectedAppointment.patientId)
    : null;

  const currentPatientVitals = selectedAppointment
    ? vitals.find((v) => v.patientId === selectedAppointment.patientId)
    : null;

  const handleAddMedicationRow = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      {
        id: `item-${prev.length + 1}`,
        medicineName: '',
        dosage: '',
        frequency: 'Twice daily',
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

  const handleSavePrescription = () => {
    if (!selectedAppointment || !currentPatient) return;
    const validItems = prescriptionItems.filter((i) => i.medicineName.trim().length > 0);
    if (validItems.length === 0) return;

    createPrescription({
      patientId: currentPatient.id,
      patientName: `${currentPatient.firstName} ${currentPatient.lastName}`,
      doctorId: currentUser.id,
      doctorName: currentUser.name,
      appointmentId: selectedAppointment.id,
      diagnosis,
      items: validItems,
    });

    setIsPrescriptionModalOpen(false);
  };

  const handleSaveLabOrder = () => {
    if (!selectedAppointment || !currentPatient) return;

    createLabTest({
      patientId: currentPatient.id,
      patientName: `${currentPatient.firstName} ${currentPatient.lastName}`,
      doctorId: currentUser.id,
      doctorName: currentUser.name,
      testName: selectedLabTest,
      category: 'Diagnostic Pathology',
      sampleType: 'Venous Blood / Serum',
      priority: labPriority,
      clinicalNotes: labNotes,
    });

    setIsLabOrderModalOpen(false);
  };

  // KPIs
  const todayAppointments = appointments.filter(
    (a) => a.doctorId === 'doc-1' || a.doctorName.includes('Vance')
  );
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const inQueueCount = appointments.filter(
    (a) => a.status === 'in_consultation' || a.status === 'checked_in'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Doctor Clinical Workstation
          </h2>
          <p className="text-xs text-slate-500">
            Assigned to {currentUser.name} ({currentUser.department})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Consultation Room 101 Active
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Patients Today"
          value={todayAppointments.length}
          subtitle="Consultation schedule"
          icon={<Stethoscope className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Patients in Waiting Queue"
          value={inQueueCount}
          subtitle="Checked in or in room"
          icon={<Clock className="w-5 h-5" />}
          colorScheme="amber"
        />
        <StatCard
          title="Completed Consultations"
          value={completedCount}
          subtitle="Electronic records updated"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="blue"
        />
      </div>

      {/* Main Clinical Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Waiting Queue & Scheduled Consultations */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader
              action={
                <span className="text-xs font-semibold text-slate-500">
                  {appointments.length} Consultations
                </span>
              }
            >
              <CardTitle>Today's Patient Queue</CardTitle>
              <CardDescription>
                Select a patient to review EMR and start consultation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {appointments.map((apt) => {
                  const isSelected = selectedAppointment?.id === apt.id;
                  return (
                    <div
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-teal-50/60 border-l-4 border-teal-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Token #{apt.tokenNumber}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-medium text-slate-600">
                            {new Date(apt.dateTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <Badge
                          size="sm"
                          variant={
                            apt.status === 'in_consultation'
                              ? 'teal'
                              : apt.status === 'checked_in'
                              ? 'info'
                              : apt.status === 'completed'
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {apt.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="font-semibold text-slate-900 text-sm">
                        {apt.patientName}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        Reason: {apt.reasonForVisit}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        {apt.status !== 'in_consultation' && apt.status !== 'completed' && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAppointmentStatus(apt.id, 'in_consultation');
                              setSelectedAppointment(apt);
                            }}
                          >
                            Call into Room
                          </Button>
                        )}
                        {apt.status === 'in_consultation' && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAppointmentStatus(apt.id, 'completed');
                            }}
                          >
                            Finish Consultation
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Consultation Desk & EMR Record */}
        <div className="lg:col-span-7 space-y-4">
          {selectedAppointment && currentPatient ? (
            <>
              {/* Patient Banner */}
              <Card>
                <div className="p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white rounded-t-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-teal-300 font-semibold">
                        Medical Record: {currentPatient.mrn}
                      </div>
                      <h3 className="text-lg font-bold mt-0.5">
                        {currentPatient.firstName} {currentPatient.lastName}
                      </h3>
                      <div className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                        <span>Age: {currentPatient.age} yrs</span>
                        <span>•</span>
                        <span className="capitalize">{currentPatient.gender}</span>
                        <span>•</span>
                        <span>Blood: {currentPatient.bloodGroup}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="soft"
                        className="bg-teal-700/80 text-white border-teal-500 hover:bg-teal-700"
                        icon={<Pill className="w-3.5 h-3.5" />}
                        onClick={() => setIsPrescriptionModalOpen(true)}
                      >
                        Prescribe Rx
                      </Button>
                      <Button
                        size="sm"
                        variant="soft"
                        className="bg-teal-700/80 text-white border-teal-500 hover:bg-teal-700"
                        icon={<FlaskConical className="w-3.5 h-3.5" />}
                        onClick={() => setIsLabOrderModalOpen(true)}
                      >
                        Order Lab Test
                      </Button>
                    </div>
                  </div>

                  {/* Allergy Banner */}
                  {currentPatient.allergies.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="text-xs font-semibold text-rose-300">
                        Known Allergies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentPatient.allergies.map((allergy) => (
                          <span
                            key={allergy}
                            className="text-[11px] bg-rose-950/80 text-rose-200 border border-rose-800 px-2 py-0.5 rounded font-medium"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vitals Summary Card */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      Vital Signs (Triage Assessment)
                    </span>
                    {currentPatientVitals && (
                      <span className="text-[11px] text-slate-500">
                        Recorded by {currentPatientVitals.recordedByName}
                      </span>
                    )}
                  </div>

                  {currentPatientVitals ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[11px] text-slate-500 font-medium">
                          Blood Pressure
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {currentPatientVitals.systolicBp}/
                          {currentPatientVitals.diastolicBp}
                        </div>
                        <div className="text-[10px] text-slate-400">mmHg</div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[11px] text-slate-500 font-medium">
                          Heart Rate
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {currentPatientVitals.heartRateBpm}
                        </div>
                        <div className="text-[10px] text-slate-400">bpm</div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[11px] text-slate-500 font-medium">
                          SpO2 Saturation
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {currentPatientVitals.oxygenSaturationPct}%
                        </div>
                        <div className="text-[10px] text-slate-400">Room Air</div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="text-[11px] text-slate-500 font-medium">
                          Body Temp
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {currentPatientVitals.temperatureCelsius}°C
                        </div>
                        <div className="text-[10px] text-slate-400">Normothermic</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                      No vitals recorded for this visit yet. Request nurse triage station.
                    </div>
                  )}
                </div>

                {/* Consultation Chief Complaint & Clinical Action */}
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                      Chief Complaint / Reason for Visit
                    </h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-1.5">
                      {selectedAppointment.reasonForVisit}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                      Doctor Clinical Notes & Observations
                    </h4>
                    <Textarea
                      rows={3}
                      defaultValue={selectedAppointment.notes || ''}
                      placeholder="Enter clinical examination findings, auscultation, follow-up instructions..."
                    />
                  </div>

                  {/* Active Prescriptions for this Patient */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                        Patient Medication & Prescriptions
                      </h4>
                      <Button
                        size="xs"
                        variant="soft"
                        onClick={() => setIsPrescriptionModalOpen(true)}
                      >
                        + Add Medication
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {prescriptions
                        .filter((rx) => rx.patientId === currentPatient.id)
                        .map((rx) => (
                          <div
                            key={rx.id}
                            className="p-3 bg-white rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                {rx.prescriptionNumber} • {rx.diagnosis}
                              </span>
                              <Badge
                                size="sm"
                                variant={rx.status === 'dispensed' ? 'success' : 'amber' as any}
                              >
                                {rx.status}
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1">
                              {rx.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs text-slate-700 flex justify-between"
                                >
                                  <span>
                                    • {item.medicineName} ({item.dosage}) - {item.frequency}
                                  </span>
                                  <span className="text-slate-400">
                                    {item.dispensed ? 'Dispensed' : 'Pending Pharmacy'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Diagnostic Tests for this Patient */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                        Diagnostic Lab Orders
                      </h4>
                      <Button
                        size="xs"
                        variant="soft"
                        onClick={() => setIsLabOrderModalOpen(true)}
                      >
                        + Order New Test
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {labTests
                        .filter((lt) => lt.patientId === currentPatient.id)
                        .map((lt) => (
                          <div
                            key={lt.id}
                            className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {lt.testName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Status: {lt.status.replace('_', ' ')} • Result:{' '}
                                {lt.result || 'Pending Processing'}
                              </div>
                            </div>
                            <Badge
                              size="sm"
                              variant={lt.status === 'completed' ? 'success' : 'info'}
                            >
                              {lt.status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium">Select a patient from the queue</p>
                <p className="text-xs text-slate-400 mt-1">
                  Choose any patient in the waiting list to begin or view their consultation details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Prescription Modal */}
      <Modal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        title="Electronic Prescription Order (e-Rx)"
        description="Prescription will be routed immediately to the clinic pharmacy dispensary."
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
              onClick={handleSavePrescription}
            >
              Authorize & Transmit Prescription
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Clinical Diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Essential Hypertension"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Prescribed Medications
              </span>
              <Button
                type="button"
                size="xs"
                variant="soft"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddMedicationRow}
              >
                Add Medicine
              </Button>
            </div>

            {prescriptionItems.map((med, idx) => (
              <div
                key={med.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Medication Name"
                    value={med.medicineName}
                    onChange={(e) =>
                      handleUpdateMedication(idx, 'medicineName', e.target.value)
                    }
                    placeholder="e.g. Amlodipine"
                  />
                  <Input
                    label="Dosage / Strength"
                    value={med.dosage}
                    onChange={(e) =>
                      handleUpdateMedication(idx, 'dosage', e.target.value)
                    }
                    placeholder="e.g. 5 mg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Frequency"
                    value={med.frequency}
                    onChange={(e) =>
                      handleUpdateMedication(idx, 'frequency', e.target.value)
                    }
                    placeholder="e.g. Once daily after breakfast"
                  />
                  <Input
                    label="Duration"
                    value={med.duration}
                    onChange={(e) =>
                      handleUpdateMedication(idx, 'duration', e.target.value)
                    }
                    placeholder="e.g. 30 days"
                  />
                </div>
                <Input
                  label="Instructions for Patient"
                  value={med.instructions}
                  onChange={(e) =>
                    handleUpdateMedication(idx, 'instructions', e.target.value)
                  }
                  placeholder="Special instructions"
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Lab Order Modal */}
      <Modal
        isOpen={isLabOrderModalOpen}
        onClose={() => setIsLabOrderModalOpen(false)}
        title="Diagnostic Laboratory Investigation Order"
        description="Orders a pathology / diagnostic specimen test for the patient."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLabOrderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveLabOrder}
            >
              Transmit Lab Order
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Select
            label="Select Diagnostic Investigation"
            value={selectedLabTest}
            onChange={(e) => setSelectedLabTest(e.target.value)}
            options={[
              { value: 'Comprehensive Metabolic Panel (CMP)', label: 'Comprehensive Metabolic Panel (CMP)' },
              { value: 'Glycated Hemoglobin (HbA1c)', label: 'Glycated Hemoglobin (HbA1c)' },
              { value: 'Lipid Profile Assay', label: 'Lipid Profile Assay' },
              { value: 'High-Sensitivity C-Reactive Protein (hs-CRP)', label: 'hs-CRP Inflammation Test' },
              { value: 'Complete Blood Count (CBC)', label: 'Complete Blood Count (CBC)' },
              { value: 'Thyroid Stimulating Hormone (TSH)', label: 'Thyroid Stimulating Hormone (TSH)' },
            ]}
          />

          <Select
            label="Clinical Priority"
            value={labPriority}
            onChange={(e) =>
              setLabPriority(e.target.value as 'routine' | 'urgent' | 'stat')
            }
            options={[
              { value: 'routine', label: 'Routine (Standard turnaround)' },
              { value: 'urgent', label: 'Urgent (Within 4 hours)' },
              { value: 'stat', label: 'STAT (Immediate medical necessity)' },
            ]}
          />

          <Input
            label="Clinical Indication / Notes"
            value={labNotes}
            onChange={(e) => setLabNotes(e.target.value)}
            placeholder="Reason for requesting investigation"
          />
        </div>
      </Modal>
    </div>
  );
};

