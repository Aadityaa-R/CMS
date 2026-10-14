import React, { useState, useEffect } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import {
  CheckCircle2,
  Filter,
  FilePlus,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { Appointment, PrescriptionItem } from '@/types';

interface DoctorViewProps {
  activeTab?: string;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ activeTab = 'overview' }) => {
  const { currentUser, currentRole } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>(activeTab || 'overview');

  useEffect(() => {
    if (activeTab && activeTab !== 'overview') {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);

  const {
    doctors,
    appointments,
    patients,
    vitals,
    prescriptions,
    createPrescription,
    updateAppointmentStatus,
    saveVitals,
  } = useClinic();

  const isMD = currentRole === 'md' || currentRole === 'admin' || currentUser.role === 'md';

  // Active doctor queue selection (defaults to doc-1 Marcus Vance for MD, doc-2 Nathan Hayes for staff doctor)
  const [activeDoctorId, setActiveDoctorId] = useState<string>(() => {
    if (currentRole === 'doctor') return 'doc-2';
    return 'doc-1';
  });

  const isReadOnlyView = isMD && activeDoctorId !== 'doc-1';

  useEffect(() => {
    if (currentRole === 'doctor') {
      setActiveDoctorId('doc-2');
    } else if (currentRole === 'md' || currentRole === 'admin') {
      setActiveDoctorId('doc-1');
    }
  }, [currentRole]);

  const activeDoctor = doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  const doctorAppointments = appointments.filter((a) => a.doctorId === activeDoctorId);

  // Search & Filter State (Equal Authority Governance pattern)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'urgent'>('all');

  // Real-time Feedback Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Active consultation patient
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');

  useEffect(() => {
    const inConsult = doctorAppointments.find((a) => a.status === 'in_consultation');
    if (inConsult) {
      setSelectedAppointmentId(inConsult.id);
    } else if (doctorAppointments.length > 0) {
      setSelectedAppointmentId(doctorAppointments[0].id);
    } else {
      setSelectedAppointmentId('');
    }
  }, [activeDoctorId]);

  const activeAppointment =
    doctorAppointments.find((a) => a.id === selectedAppointmentId) ||
    doctorAppointments.find((a) => a.status === 'in_consultation') ||
    doctorAppointments[0] ||
    null;
  const activePatient = activeAppointment ? patients.find((p) => p.id === activeAppointment.patientId) : null;
  const activeVitals = activePatient ? vitals.find((v) => v.patientId === activePatient.id) : null;

  // Clinical Triage Vitals Input State
  const [vitalsForm, setVitalsForm] = useState({
    systolicBp: '',
    diastolicBp: '',
    heartRateBpm: '',
    oxygenSaturationPct: '',
    temperatureCelsius: '',
  });

  useEffect(() => {
    if (activeVitals) {
      setVitalsForm({
        systolicBp: activeVitals.systolicBp ? String(activeVitals.systolicBp) : '',
        diastolicBp: activeVitals.diastolicBp ? String(activeVitals.diastolicBp) : '',
        heartRateBpm: activeVitals.heartRateBpm ? String(activeVitals.heartRateBpm) : '',
        oxygenSaturationPct: activeVitals.oxygenSaturationPct ? String(activeVitals.oxygenSaturationPct) : '',
        temperatureCelsius: activeVitals.temperatureCelsius ? String(activeVitals.temperatureCelsius) : '',
      });
    } else {
      setVitalsForm({
        systolicBp: '',
        diastolicBp: '',
        heartRateBpm: '',
        oxygenSaturationPct: '',
        temperatureCelsius: '',
      });
    }
  }, [activePatient?.id, activeVitals?.id, activeVitals?.recordedAt]);

  const handleVitalChange = (field: keyof typeof vitalsForm, value: string) => {
    setVitalsForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveVitals = () => {
    if (!activePatient) return;
    saveVitals(activePatient.id, {
      systolicBp: vitalsForm.systolicBp ? Number(vitalsForm.systolicBp) : 120,
      diastolicBp: vitalsForm.diastolicBp ? Number(vitalsForm.diastolicBp) : 80,
      heartRateBpm: vitalsForm.heartRateBpm ? Number(vitalsForm.heartRateBpm) : 72,
      oxygenSaturationPct: vitalsForm.oxygenSaturationPct ? Number(vitalsForm.oxygenSaturationPct) : 98,
      temperatureCelsius: vitalsForm.temperatureCelsius ? Number(vitalsForm.temperatureCelsius) : 37.0,
      recordedBy: currentUser?.id || 'usr-1',
      recordedByName: currentUser?.name || 'Dr. Marcus Vance',
    });
    showNotification(`Triage vitals updated for ${activePatient.firstName} ${activePatient.lastName}.`);
  };

  // Prescription Modal State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescPatientId, setPrescPatientId] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      id: 'item-1',
      medicineName: '',
      dosage: '',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'Take after meals with water',
      dispensed: false,
    },
  ]);

  // Consultation Notes Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [clinicalNotesText, setClinicalNotesText] = useState('');

  // Handlers
  const handleStartConsultation = (apt: Appointment) => {
    updateAppointmentStatus(apt.id, 'in_consultation');
    setSelectedAppointmentId(apt.id);
    showNotification(`Consultation started for ${apt.patientName}. Patient now at desk.`);
  };

  const handleConcludeConsultation = (aptId: string, patientName: string) => {
    if (activePatient && (vitalsForm.systolicBp || vitalsForm.heartRateBpm)) {
      saveVitals(activePatient.id, {
        systolicBp: vitalsForm.systolicBp ? Number(vitalsForm.systolicBp) : 120,
        diastolicBp: vitalsForm.diastolicBp ? Number(vitalsForm.diastolicBp) : 80,
        heartRateBpm: vitalsForm.heartRateBpm ? Number(vitalsForm.heartRateBpm) : 72,
        oxygenSaturationPct: vitalsForm.oxygenSaturationPct ? Number(vitalsForm.oxygenSaturationPct) : 98,
        temperatureCelsius: vitalsForm.temperatureCelsius ? Number(vitalsForm.temperatureCelsius) : 37.0,
        recordedBy: currentUser?.id || 'usr-1',
        recordedByName: currentUser?.name || 'Dr. Marcus Vance',
      });
    }
    updateAppointmentStatus(aptId, 'completed');
    showNotification(`Consultation concluded for ${patientName}. Visit marked completed.`);
  };

  const handleAddMedicationRow = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      {
        id: `item-${prev.length + 1}`,
        medicineName: '',
        dosage: '',
        frequency: 'Once daily',
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

  const handleOpenPrescriptionModal = (targetPatientId?: string) => {
    const pId = targetPatientId || activePatient?.id || patients[0]?.id || '';
    setPrescPatientId(pId);
    setDiagnosis('');
    setPrescriptionItems([
      {
        id: 'item-1',
        medicineName: '',
        dosage: '',
        frequency: 'Once daily in morning',
        duration: '30 days',
        instructions: 'Take after breakfast',
        dispensed: false,
      },
    ]);
    setIsPrescriptionModalOpen(true);
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const patientObj = patients.find((p) => p.id === prescPatientId);
    if (!patientObj || !diagnosis.trim()) return;

    const validItems = prescriptionItems.filter((i) => i.medicineName.trim().length > 0);
    if (validItems.length === 0) return;

    const newRx = createPrescription({
      patientId: patientObj.id,
      patientName: `${patientObj.firstName} ${patientObj.lastName}`,
      doctorId: activeDoctor.id,
      doctorName: activeDoctor.name,
      appointmentId: activeAppointment?.id,
      diagnosis,
      items: validItems,
    });

    showNotification(
      `e-Prescription #${newRx.prescriptionNumber} written for ${newRx.patientName}. Transmitted to pharmacy repository.`
    );

    setIsPrescriptionModalOpen(false);
  };

  const handleSaveConsultationNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;

    showNotification(
      `Consultation notes recorded for ${activeAppointment.patientName}. Appended to permanent EMR.`
    );
    setIsNotesModalOpen(false);
    setClinicalNotesText('');
  };

  // Metrics
  const totalQueue = doctorAppointments.length;
  const inConsultation = doctorAppointments.filter((a) => a.status === 'in_consultation').length;
  const doctorPrescriptions = prescriptions.filter(
    (r) => r.doctorId === activeDoctor.id || r.doctorName === activeDoctor.name
  );
  const totalPrescriptions = doctorPrescriptions.length;

  // Global Active Triage Queue across all attending physician desks for MD oversight
  const allActiveTriageAppointments = appointments.filter(
    (a) => a.status === 'in_consultation' || a.status === 'checked_in'
  );

  // Filter Helper with Equal Authority
  const query = searchTerm.toLowerCase().trim();

  const filteredAppointments = doctorAppointments.filter((a) => {
    const matchesSearch =
      query === '' ||
      a.patientName.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query) ||
      a.reasonForVisit.toLowerCase().includes(query) ||
      a.tokenNumber.toString().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return a.status === 'in_consultation' || a.status === 'checked_in';
    if (filterMode === 'urgent') return a.status === 'in_consultation';
    return true;
  });

  const doctorPatientIds = new Set(doctorAppointments.map((a) => a.patientId));
  const doctorPatients = patients.filter((p) => doctorPatientIds.has(p.id));

  const filteredPatients = doctorPatients.filter((p) => {
    const matchesSearch =
      query === '' ||
      p.firstName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.phone.includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return p.status === 'active';
    if (filterMode === 'urgent') return p.allergies.length > 0;
    return true;
  });

  const filteredPrescriptions = doctorPrescriptions.filter((r) => {
    const matchesSearch =
      query === '' ||
      r.prescriptionNumber.toLowerCase().includes(query) ||
      r.patientName.toLowerCase().includes(query) ||
      r.diagnosis.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return r.status === 'pending';
    if (filterMode === 'urgent') return r.status === 'pending';
    return true;
  });

  const doctorSearchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    doctorAppointments.forEach((apt) => {
      list.push({
        label: apt.patientName,
        category: 'Patient',
        sublabel: `${apt.tokenNumber} • ${apt.reasonForVisit}`,
      });
      list.push({
        label: String(apt.tokenNumber),
        category: 'Token',
        sublabel: apt.patientName,
      });
      list.push({
        label: apt.reasonForVisit,
        category: 'Complaint',
        sublabel: apt.patientName,
      });
    });
    patients.forEach((p) => {
      list.push({
        label: p.mrn,
        category: 'MRN',
        sublabel: `${p.firstName} ${p.lastName}`,
      });
    });
    return list;
  }, [doctorAppointments, patients]);

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Physician Consultation Desk & Clinical Care
            </h2>
            {isMD ? (
              <Badge variant="teal">Managing Director Console</Badge>
            ) : (
              <Badge variant="neutral">Staff Physician Desk</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consulting Physician: <strong className="text-slate-700 dark:text-slate-200">{activeDoctor.name}</strong> ({activeDoctor.qualification}) • {activeDoctor.department} • {activeDoctor.roomNumber}
          </p>
        </div>
      </div>

      {/* MD Clinical Queue Inspector Governance Bar (Clearance Governance Reference) */}
      {isMD ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  MD Clinical Queue Inspector
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                Search consultation queue or select attending physician to inspect worklist:
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl lg:justify-end">
              {/* Search Input with Interactive Dropdown and Autofill */}
              <div className="relative flex-1 min-w-[200px]">
                <InteractiveSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  suggestions={doctorSearchSuggestions}
                  placeholder="Search patient, MRN, diagnosis, or token..."
                />
              </div>

              {/* Attending Physician Worklist Selector using Custom Select with Filter icon */}
              <div className="w-full sm:w-64 shrink-0">
                <Select
                  icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                  value={activeDoctorId}
                  placeholder="Select Attending Physician"
                  onChange={(e) => setActiveDoctorId(e.target.value)}
                  options={doctors.map((doc) => {
                    const count = appointments.filter((a) => a.doctorId === doc.id).length;
                    return {
                      value: doc.id,
                      label: `${doc.name} ${doc.id === 'doc-1' ? '(MD)' : ''} (${count} visits)`,
                    };
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Staff Doctor Station Governance Bar */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Staff Consultation Station
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Active physician session for {currentUser.name} at {activeDoctor.roomNumber}:
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl lg:justify-end">
              <div className="relative flex-1 min-w-[200px]">
                <InteractiveSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  suggestions={doctorSearchSuggestions}
                  placeholder="Search consultation queue or patient..."
                />
              </div>

              <div className="w-full sm:w-56 shrink-0">
                <Select
                  icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                  value={filterMode}
                  placeholder="Select Scope"
                  onChange={(e) => setFilterMode(e.target.value as 'all' | 'active' | 'urgent')}
                  options={[
                    { value: 'all', label: 'All Items' },
                    { value: 'active', label: 'Active / In Progress' },
                    { value: 'urgent', label: 'STAT / Urgent' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Workstation Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Consultation Desk' },
          { id: 'patients', label: 'Patients' },
          { id: 'prescriptions', label: 'e-Prescriptions' },
          { id: 'schedule', label: 'Weekly Schedule' },
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
            <span className="font-semibold text-teal-950 dark:text-teal-100">Consultation Desk:</span>
            <span>{notification}</span>
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
          title="Consultation Queue"
          value={totalQueue}
          unit="Visits"
          subtitle={`Assigned to ${activeDoctor.name}`}
          colorScheme="slate"
        />
        <StatCard
          title="Active Consultation"
          value={inConsultation}
          unit={inConsultation === 1 ? 'Patient' : 'Patients'}
          subtitle="Currently at desk"
          colorScheme="teal"
        />
        <StatCard
          title="e-Prescriptions Logged"
          value={totalPrescriptions}
          unit="Orders"
          subtitle={`Issued by ${activeDoctor.name}`}
          colorScheme="slate"
        />
        <StatCard
          title="Assigned Patients"
          value={doctorPatients.length}
          unit="Profiles"
          subtitle="Direct clinical roster"
          colorScheme="slate"
        />
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: CONSULTATION DESK (`overview`)                              */}
      {/* ========================================================================= */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Patient Desk (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {activePatient && activeAppointment ? (
                <Card>
                  <CardHeader
                    action={
                      !isReadOnlyView ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            icon={<FilePlus className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenPrescriptionModal(activePatient.id)}
                          >
                            Prescribe
                          </Button>
                          {activeAppointment.status === 'in_consultation' ? (
                            <Button
                              size="xs"
                              variant="primary"
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                              onClick={() => handleConcludeConsultation(activeAppointment.id, activePatient.firstName)}
                            >
                              Conclude Visit
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => handleStartConsultation(activeAppointment)}
                            >
                              Start Consultation
                            </Button>
                          )}
                        </div>
                      ) : null
                    }
                  >
                    <CardTitle>
                      Active Consultation Desk: {activePatient.firstName} {activePatient.lastName}
                    </CardTitle>
                    <CardDescription>
                      {activePatient.mrn} • {activePatient.age} yrs • {activePatient.gender} • Blood Group: {activePatient.bloodGroup}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Safety Alert (Red dot only if allergy exists) */}
                    {activePatient.allergies.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Allergy Warning:</span>
                        <span className="text-slate-700 dark:text-slate-300">{activePatient.allergies.join(', ')}</span>
                      </div>
                    )}

                    {/* Consultation Chief Complaint */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                        Chief Complaint & Reason for Visit
                      </span>
                      <p className="text-slate-900 dark:text-slate-100 font-medium">
                        {activeAppointment.reasonForVisit}
                      </p>
                      {activeAppointment.notes && (
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                          Intake Note: {activeAppointment.notes}
                        </p>
                      )}
                    </div>

                    {/* Clinical Triage Vitals (Editable Input Controls) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Clinical Triage Vitals
                        </span>
                        {!isReadOnlyView && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={handleSaveVitals}
                          >
                            Save Vitals
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <Input
                          label="BP Systolic (mmHg)"
                          type="number"
                          placeholder="120"
                          value={vitalsForm.systolicBp}
                          onChange={(e) => handleVitalChange('systolicBp', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          className="font-mono text-xs py-1.5"
                        />
                        <Input
                          label="BP Diastolic (mmHg)"
                          type="number"
                          placeholder="80"
                          value={vitalsForm.diastolicBp}
                          onChange={(e) => handleVitalChange('diastolicBp', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          className="font-mono text-xs py-1.5"
                        />
                        <Input
                          label="Heart Rate (bpm)"
                          type="number"
                          placeholder="72"
                          value={vitalsForm.heartRateBpm}
                          onChange={(e) => handleVitalChange('heartRateBpm', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          className="font-mono text-xs py-1.5"
                        />
                        <Input
                          label="O2 Saturation (%)"
                          type="number"
                          placeholder="98"
                          value={vitalsForm.oxygenSaturationPct}
                          onChange={(e) => handleVitalChange('oxygenSaturationPct', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          className="font-mono text-xs py-1.5"
                        />
                        <Input
                          label="Temperature (°C)"
                          type="number"
                          step="0.1"
                          placeholder="36.8"
                          value={vitalsForm.temperatureCelsius}
                          onChange={(e) => handleVitalChange('temperatureCelsius', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveVitals()}
                          disabled={isReadOnlyView}
                          className="font-mono text-xs py-1.5"
                        />
                      </div>
                    </div>

                    {/* Consultation Notes Action */}
                    {!isReadOnlyView && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setIsNotesModalOpen(true)}
                        >
                          Record Consultation Notes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No active consultation selected. Choose a patient from the queue below.
                  </CardContent>
                </Card>
              )}

              {/* Waiting Consultations Worklist (Interactive Inspector Cards) */}
              <Card>
                <CardHeader
                  action={
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {filteredAppointments.length} on {activeDoctor.name}&apos;s Worklist
                    </span>
                  }
                >
                  <CardTitle>
                    {activeDoctor.name}&apos;s Consultation Worklist
                  </CardTitle>
                  <CardDescription>
                    Ordered queue of checked-in, in-progress, and scheduled consultations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((apt) => {
                        const isCurrent = apt.id === selectedAppointmentId;
                        const isLive = apt.status === 'in_consultation';
                        const isWaiting = apt.status === 'checked_in';

                        return (
                          <div
                            key={apt.id}
                            className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isCurrent
                                ? 'bg-teal-50/50 dark:bg-teal-950/30 border-l-2 border-teal-500'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isLive
                                    ? 'bg-teal-500'
                                    : isWaiting
                                    ? 'bg-teal-600'
                                    : 'bg-slate-400'
                                }`}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {apt.patientName}
                                  </h4>
                                  <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400">
                                    #{apt.tokenNumber} • {apt.appointmentNumber}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    {new Date(apt.dateTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                  Complaint: <strong>{apt.reasonForVisit}</strong>
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Phone: {apt.patientPhone} — Status:{' '}
                                  <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                    {apt.status.replace('_', ' ')}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="xs"
                                variant={isCurrent ? 'secondary' : 'outline'}
                                onClick={() => setSelectedAppointmentId(apt.id)}
                              >
                                {isCurrent ? 'Viewing' : 'Inspect File'}
                              </Button>
                              {!isReadOnlyView && (
                                apt.status !== 'completed' ? (
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    onClick={() => handleStartConsultation(apt)}
                                  >
                                    Engage
                                  </Button>
                                ) : (
                                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                                    Completed
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        No consultations found matching active search criteria on this worklist.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Active Doctor Schedule Card */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Consulting Physician Profile</CardTitle>
                  <CardDescription>Clinical credentials & schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">
                      {activeDoctor.id === 'doc-1' ? 'Managing Director & Lead Physician' : 'Staff Consulting Physician'}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {activeDoctor.name}, {activeDoctor.qualification}
                    </span>
                    <span className="text-teal-600 dark:text-teal-400 block text-[11px] mt-0.5">
                      {activeDoctor.specialization} • {activeDoctor.department}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Assigned Room:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{activeDoctor.roomNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Working Hours:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{activeDoctor.consultationHours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Duty Days:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {activeDoctor.availableDays.length === 5 ? 'Mon - Fri' : activeDoctor.availableDays.join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Consultation Fee:</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        ${activeDoctor.consultationFee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Persistent Downward Notification Box: Active Outpatient Desk & Immediate Triage Attention Queue */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader
              action={
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {allActiveTriageAppointments.length} Active Consultations Across Clinic
                  </span>
                </div>
              }
            >
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Active Consultation Triage & Clearance Queue
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time outpatient desks across attending physicians requiring Managing Director clearance, active engagement, or triage authorization.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {allActiveTriageAppointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    All Attending Physician Queues Cleared
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    No outpatients currently waiting or in consultation across any clinic suite.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allActiveTriageAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              apt.status === 'in_consultation' ? 'bg-teal-500' : 'bg-slate-400'
                            }`}
                          />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {apt.patientName}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            (Token #{apt.tokenNumber} • {apt.appointmentNumber})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Attending Physician: <strong>{apt.doctorName}</strong> ({apt.department}) • Scheduled:{' '}
                          <span className="font-mono">
                            {new Date(apt.dateTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Complaint: {apt.reasonForVisit} — Status:{' '}
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {apt.status.replace('_', ' ')}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveDoctorId(apt.doctorId);
                            setSelectedAppointmentId(apt.id);
                          }}
                        >
                          Switch to Desk
                        </Button>
                        {!isReadOnlyView && apt.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleConcludeConsultation(apt.id, apt.patientName)}
                          >
                            Conclude Visit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 2: PATIENTS (`patients`)                                       */}
      {/* ========================================================================= */}
      {selectedTab === 'patients' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredPatients.length} Patients in Care
              </span>
            }
          >
            <CardTitle>Patients Medical Directory</CardTitle>
            <CardDescription>
              Electronic Health Records, allergy profiles, and consultation histories under {activeDoctor.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">MRN</th>
                    <th className="px-4 py-3.5 align-middle">Patient Name</th>
                    <th className="px-4 py-3.5 align-middle">Demographics</th>
                    <th className="px-4 py-3.5 align-middle">Phone</th>
                    <th className="px-4 py-3.5 align-middle">Blood Group</th>
                    <th className="px-4 py-3.5 align-middle">Allergies</th>
                    <th className="px-4 py-3.5 align-middle">Chronic Conditions</th>
                    <th className="px-4 py-3.5 text-right align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPatients.map((pat) => (
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
                      <td className="px-4 py-3.5 align-middle">
                        {pat.allergies.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300 text-xs">
                              {pat.allergies.join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">None Recorded</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-600 dark:text-slate-400">
                        {pat.chronicConditions.length > 0 ? pat.chronicConditions.join(', ') : 'None'}
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle space-x-1.5">
                        {!isReadOnlyView ? (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                const apt = appointments.find((a) => a.patientId === pat.id);
                                if (apt) {
                                  setSelectedAppointmentId(apt.id);
                                  setSelectedTab('overview');
                                }
                              }}
                            >
                              Admit to Desk
                            </Button>
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => handleOpenPrescriptionModal(pat.id)}
                            >
                              Prescribe
                            </Button>
                          </>
                        ) : null}
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
      {/* SUB-MODULE 3: WRITE PRESCRIPTIONS (`prescriptions`)                       */}
      {/* ========================================================================= */}
      {selectedTab === 'prescriptions' && (
        <Card>
          <CardHeader>
            <CardTitle>e-Prescription Master Ledger</CardTitle>
            <CardDescription>
              Electronic medication orders, therapeutic dosing, and pharmaceutical fulfillment records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Rx #</th>
                    <th className="px-4 py-3.5 align-middle">Patient Name</th>
                    <th className="px-4 py-3.5 align-middle">Issue Date</th>
                    <th className="px-4 py-3.5 align-middle">Diagnosis</th>
                    <th className="px-4 py-3.5 align-middle">Prescribed Regimen</th>
                    <th className="px-4 py-3.5 align-middle">Dispense Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPrescriptions.map((rx) => (
                    <tr
                      key={rx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {rx.prescriptionNumber}
                      </td>
                      <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 dark:text-slate-100">
                        {rx.patientName}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {rx.date}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-slate-800 dark:text-slate-200 font-medium">
                        {rx.diagnosis}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="space-y-1">
                          {rx.items.map((item) => (
                            <div key={item.id} className="text-slate-700 dark:text-slate-300">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.medicineName}</span>{' '}
                              <span className="text-slate-500">({item.dosage} • {item.frequency})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              rx.status === 'dispensed'
                                ? 'bg-teal-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                            {rx.status.replace('_', ' ')}
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
      {/* SUB-MODULE 4: WEEKLY SCHEDULE (`schedule`)                                */}
      {/* ========================================================================= */}
      {selectedTab === 'schedule' && (
        <Card>
          <CardHeader>
            <CardTitle>Consulting Desk Roster & Clinic Calendar</CardTitle>
            <CardDescription>
              Operational schedule for {activeDoctor.name} across weekly outpatient blocks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {activeDoctor.availableDays.map((day) => (
                <div
                  key={day}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{day}</span>
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeDoctor.consultationHours}
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                    {activeDoctor.roomNumber}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: WRITE PRESCRIPTION                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        title="Issue Medical Prescription (e-Rx)"
        description="Prescribed medications are immediately logged into the central dispensary."
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
              icon={<FilePlus className="w-4 h-4" />}
              onClick={handleSavePrescription}
            >
              Sign & Issue Prescription
            </Button>
          </>
        }
      >
        <form onSubmit={handleSavePrescription} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Select Patient"
              value={prescPatientId}
              onChange={(e) => setPrescPatientId(e.target.value)}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName} (${p.mrn})`,
              }))}
            />
            <Input
              label="Primary Clinical Diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Essential Hypertension, Bronchitis"
              required
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Prescribed Medications
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddMedicationRow}
              >
                Add Medication
              </Button>
            </div>

            {prescriptionItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="grid grid-cols-3 gap-2.5">
                  <Input
                    label="Medicine Name"
                    value={item.medicineName}
                    onChange={(e) => handleUpdateMedication(idx, 'medicineName', e.target.value)}
                    placeholder="e.g. Amlodipine Besylate"
                    required
                  />
                  <Input
                    label="Dosage"
                    value={item.dosage}
                    onChange={(e) => handleUpdateMedication(idx, 'dosage', e.target.value)}
                    placeholder="e.g. 5 mg"
                    required
                  />
                  <Input
                    label="Frequency"
                    value={item.frequency}
                    onChange={(e) => handleUpdateMedication(idx, 'frequency', e.target.value)}
                    placeholder="e.g. Once daily"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    label="Duration"
                    value={item.duration}
                    onChange={(e) => handleUpdateMedication(idx, 'duration', e.target.value)}
                    placeholder="e.g. 30 days"
                  />
                  <Input
                    label="Instructions"
                    value={item.instructions}
                    onChange={(e) => handleUpdateMedication(idx, 'instructions', e.target.value)}
                    placeholder="e.g. Take after breakfast"
                  />
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD CONSULTATION NOTES                                        */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title={`Clinical Consultation Notes: ${activePatient?.firstName} ${activePatient?.lastName}`}
        description="Records are permanently appended to the electronic medical record."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotesModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveConsultationNotes}
            >
              Save Notes to EMR
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveConsultationNotes} className="space-y-4">
          <Textarea
            label="Physician Assessment & Clinical Plan"
            value={clinicalNotesText}
            onChange={(e) => setClinicalNotesText(e.target.value)}
            placeholder="Document physical examination findings, treatment response, and follow-up plan..."
            rows={4}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
