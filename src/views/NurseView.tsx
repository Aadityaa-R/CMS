import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import {
  Activity,
  Heart,
  Plus,
  CheckCircle,
} from 'lucide-react';

interface NurseViewProps {
  activeTab: string;
}

export const NurseView: React.FC<NurseViewProps> = ({ activeTab: _activeTab }) => {
  const { currentUser } = useAuth();
  const { appointments, patients, vitals, recordVitals } = useClinic();

  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');

  // Vital Signs Form
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('72');
  const [temperature, setTemperature] = useState('36.7');
  const [respRate, setRespRate] = useState('16');
  const [spo2, setSpo2] = useState('99');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('170');

  // Computed BMI
  const heightInMeters = parseFloat(height) / 100;
  const computedBmi =
    heightInMeters > 0
      ? (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1)
      : '24.2';

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    recordVitals({
      patientId: selectedPatientId,
      recordedBy: currentUser.id,
      recordedByName: currentUser.name,
      systolicBp: parseInt(systolic) || 120,
      diastolicBp: parseInt(diastolic) || 80,
      heartRateBpm: parseInt(heartRate) || 72,
      temperatureCelsius: parseFloat(temperature) || 36.6,
      respiratoryRate: parseInt(respRate) || 16,
      oxygenSaturationPct: parseInt(spo2) || 98,
      weightKg: parseFloat(weight) || 70,
      heightCm: parseFloat(height) || 170,
      bmi: parseFloat(computedBmi) || 24.2,
    });

    setIsVitalsModalOpen(false);
  };

  const waitingForTriage = appointments.filter(
    (a) => a.status === 'checked_in'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Nursing & Clinical Triage Station
          </h2>
          <p className="text-xs text-slate-500">
            Lead Nurse: {currentUser.name} • Outpatient Clinical Triage
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsVitalsModalOpen(true)}
        >
          Record Patient Vitals
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Triage Waiting Queue"
          value={waitingForTriage.length}
          subtitle="Patients awaiting vital signs"
          icon={<Activity className="w-5 h-5" />}
          colorScheme="amber"
        />
        <StatCard
          title="Vitals Logged Today"
          value={vitals.length}
          subtitle="Comprehensive intake records"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Triage Protocol"
          value="Level 1 Active"
          subtitle="All observation parameters normal"
          icon={<Heart className="w-5 h-5" />}
          colorScheme="blue"
        />
      </div>

      {/* Triage Queue & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waiting for Vitals Queue */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patients Awaiting Triage Assessment</CardTitle>
              <CardDescription>
                Measure vitals before escorting to physician consultation room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {waitingForTriage.length > 0 ? (
                waitingForTriage.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">
                        Token #{apt.tokenNumber} • {apt.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Doctor: {apt.doctorName}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Chief complaint: {apt.reasonForVisit}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedPatientId(apt.patientId);
                        setIsVitalsModalOpen(true);
                      }}
                    >
                      Record Vitals
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  All waiting patients have completed vitals assessment.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Vitals Logs */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Vital Sign Assessments</CardTitle>
              <CardDescription>
                Clinical observations and physiological measurements
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">BP (mmHg)</th>
                      <th className="px-4 py-3">Heart Rate</th>
                      <th className="px-4 py-3">Temp (°C)</th>
                      <th className="px-4 py-3">SpO2</th>
                      <th className="px-4 py-3">BMI</th>
                      <th className="px-4 py-3">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vitals.map((v) => {
                      const patient = patients.find((p) => p.id === v.patientId);
                      const isHighBp = v.systolicBp >= 140 || v.diastolicBp >= 90;
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {patient
                              ? `${patient.firstName} ${patient.lastName}`
                              : 'Patient'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                isHighBp ? 'text-rose-600' : 'text-slate-900'
                              }`}
                            >
                              {v.systolicBp}/{v.diastolicBp}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {v.heartRateBpm} bpm
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {v.temperatureCelsius}°C
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {v.oxygenSaturationPct}%
                          </td>
                          <td className="px-4 py-3 text-slate-700">{v.bmi}</td>
                          <td className="px-4 py-3">
                            <Badge
                              size="sm"
                              variant={isHighBp ? 'warning' : 'success'}
                            >
                              {isHighBp ? 'Elevated BP' : 'Normal'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Vitals Modal */}
      <Modal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        title="Record Clinical Vital Signs"
        description="All measurements are instantly transmitted to the physician's EMR consultation view."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVitalsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveVitals}
            >
              Save & Escort to Doctor
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveVitals} className="space-y-4">
          <Select
            label="Patient"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName} (${p.mrn})`,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Systolic BP (mmHg)"
              type="number"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="120"
              required
            />
            <Input
              label="Diastolic BP (mmHg)"
              type="number"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="80"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Heart Rate (BPM)"
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="72"
              required
            />
            <Input
              label="Body Temperature (°C)"
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="36.7"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Respiratory Rate (breaths/min)"
              type="number"
              value={respRate}
              onChange={(e) => setRespRate(e.target.value)}
              placeholder="16"
              required
            />
            <Input
              label="Oxygen Saturation SpO2 (%)"
              type="number"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              placeholder="99"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70"
              required
            />
            <Input
              label="Height (cm)"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              required
            />
          </div>

          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 text-xs text-teal-800 flex justify-between items-center">
            <span>Auto-Calculated Body Mass Index (BMI):</span>
            <span className="font-bold text-sm">{computedBmi} kg/m²</span>
          </div>
        </form>
      </Modal>
    </div>
  );
};
