import React, { useState, useRef, useEffect } from 'react';
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
import {
  FlaskConical,
  Search,
  CheckCircle2,
  Filter,
  ChevronDown,
  FilePlus,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { Appointment, PrescriptionItem } from '@/types';

interface DoctorViewProps {
  activeTab?: string;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ activeTab = 'overview' }) => {
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
    vitals,
    prescriptions,
    labTests,
    createPrescription,
    createLabTest,
    updateAppointmentStatus,
  } = useClinic();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'urgent'>('all');
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

  // Active consultation patient
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(() => {
    const active = appointments.find((a) => a.status === 'in_consultation');
    return active ? active.id : appointments[0]?.id || '';
  });

  const activeAppointment = appointments.find((a) => a.id === selectedAppointmentId) || appointments[0];
  const activePatient = activeAppointment ? patients.find((p) => p.id === activeAppointment.patientId) : null;
  const activeVitals = activePatient ? vitals.find((v) => v.patientId === activePatient.id) : null;

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

  // Lab Order Modal State
  const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
  const [labPatientId, setLabPatientId] = useState<string>('');
  const [testName, setTestName] = useState('Comprehensive Metabolic Panel (CMP)');
  const [testCategory, setTestCategory] = useState('Biochemistry');
  const [sampleType, setSampleType] = useState('Venous Whole Blood');
  const [labPriority, setLabPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [labNotes, setLabNotes] = useState('');

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
      doctorId: 'doc-1',
      doctorName: currentUser.name,
      appointmentId: activeAppointment?.id,
      diagnosis,
      items: validItems,
    });

    showNotification(
      `e-Prescription #${newRx.prescriptionNumber} written for ${newRx.patientName}. Transmitted to pharmacy repository.`
    );

    setIsPrescriptionModalOpen(false);
  };

  const handleOpenLabModal = (targetPatientId?: string) => {
    const pId = targetPatientId || activePatient?.id || patients[0]?.id || '';
    setLabPatientId(pId);
    setTestName('Comprehensive Metabolic Panel (CMP)');
    setTestCategory('Biochemistry');
    setSampleType('Serum / Venous Blood');
    setLabPriority('routine');
    setLabNotes('');
    setIsLabOrderModalOpen(true);
  };

  const handleSaveLabOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const patientObj = patients.find((p) => p.id === labPatientId);
    if (!patientObj || !testName.trim()) return;

    const newLab = createLabTest({
      patientId: patientObj.id,
      patientName: `${patientObj.firstName} ${patientObj.lastName}`,
      doctorId: 'doc-1',
      doctorName: currentUser.name,
      testName,
      category: testCategory,
      sampleType,
      priority: labPriority,
      clinicalNotes: labNotes || 'Diagnostic evaluation ordered during outpatient consultation.',
    });

    showNotification(
      `Diagnostic Order #${newLab.testOrderNumber} (${newLab.testName}) placed for ${newLab.patientName}. Accessioned into Lab Worklist.`
    );

    setIsLabOrderModalOpen(false);
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
  const totalQueue = appointments.length;
  const inConsultation = appointments.filter((a) => a.status === 'in_consultation').length;
  const totalPrescriptions = prescriptions.length;
  const urgentLabOrders = labTests.filter((l) => l.priority === 'stat' || l.priority === 'urgent');

  // Filter Helper
  const query = searchTerm.toLowerCase();

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(query) ||
      a.appointmentNumber.toLowerCase().includes(query) ||
      a.reasonForVisit.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return a.status === 'in_consultation' || a.status === 'checked_in';
    if (filterMode === 'urgent') return a.status === 'in_consultation';
    return true;
  });

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.firstName.toLowerCase().includes(query) ||
      p.lastName.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.phone.includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return p.status === 'active';
    if (filterMode === 'urgent') return p.allergies.length > 0;
    return true;
  });

  const filteredPrescriptions = prescriptions.filter((r) => {
    const matchesSearch =
      r.prescriptionNumber.toLowerCase().includes(query) ||
      r.patientName.toLowerCase().includes(query) ||
      r.diagnosis.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return r.status === 'pending';
    if (filterMode === 'urgent') return r.status === 'pending';
    return true;
  });

  const filteredLabTests = labTests.filter((l) => {
    const matchesSearch =
      l.testOrderNumber.toLowerCase().includes(query) ||
      l.patientName.toLowerCase().includes(query) ||
      l.testName.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterMode === 'active') return l.status === 'ordered' || l.status === 'sample_collected';
    if (filterMode === 'urgent') return l.priority === 'stat' || l.priority === 'urgent';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Physician Consultation Desk & Clinical Care
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Consulting Physician: {currentUser.name} • Internal Medicine & General Practice
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            icon={<FlaskConical className="w-4 h-4" />}
            onClick={() => handleOpenLabModal()}
          >
            Order Lab Test
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<FilePlus className="w-4 h-4" />}
            onClick={() => handleOpenPrescriptionModal()}
          >
            Write Prescription
          </Button>
        </div>
      </div>

      {/* Sub-Workstation Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Consultation Desk' },
          { id: 'patients', label: 'My Patients' },
          { id: 'prescriptions', label: 'e-Prescriptions' },
          { id: 'lab_orders', label: 'Diagnostic Requisitions' },
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
          title="Consultation Queue"
          value={totalQueue}
          unit="Visits"
          subtitle="Outpatient roster today"
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
          subtitle="Issued clinical regimens"
          colorScheme="slate"
        />
        <StatCard
          title="Urgent Investigations"
          value={urgentLabOrders.length}
          unit="Orders"
          subtitle="STAT priority diagnostics"
          colorScheme={urgentLabOrders.length > 0 ? 'rose' : 'slate'}
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
            placeholder="Search consultation queue, patient MRN, prescriptions, or labs..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg !pl-11 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
          />
        </div>

        {/* Priority Filter as Dropdown Selector */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-teal-500"
            aria-label="Filter scope"
            aria-expanded={isFilterDropdownOpen}
          >
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Scope:</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {filterMode === 'all'
                ? 'All Items'
                : filterMode === 'active'
                ? 'Active / In Progress'
                : 'Urgent Only'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Filter Consultation Desk
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
                <span>All Items</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('active');
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  filterMode === 'active'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                  Active / In Progress
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
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  STAT & Urgent
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: CONSULTATION DESK (`overview`)                              */}
      {/* ========================================================================= */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Patient Desk (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {activePatient && activeAppointment ? (
              <Card>
                <CardHeader
                  action={
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<FlaskConical className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenLabModal(activePatient.id)}
                      >
                        Order Labs
                      </Button>
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
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-semibold text-rose-700 dark:text-rose-400">Allergy Warning:</span>
                      <span className="text-rose-800 dark:text-rose-300">{activePatient.allergies.join(', ')}</span>
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

                  {/* Triage Vital Signs Snapshot */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-2">
                      Clinical Triage Vitals
                    </span>
                    {activeVitals ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Blood Pressure</span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {activeVitals.systolicBp}/{activeVitals.diastolicBp} <span className="text-[10px] font-normal text-slate-500">mmHg</span>
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Heart Rate</span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {activeVitals.heartRateBpm} <span className="text-[10px] font-normal text-slate-500">bpm</span>
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">O2 Saturation</span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {activeVitals.oxygenSaturationPct}%
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Temperature</span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                            {activeVitals.temperatureCelsius}°C
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center">
                        No triage vitals recorded for this visit yet.
                      </div>
                    )}
                  </div>

                  {/* Consultation Notes Action */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setIsNotesModalOpen(true)}
                    >
                      Record Consultation Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No active consultation selected. Choose a patient from the queue below.
                </CardContent>
              </Card>
            )}

            {/* Waiting Consultations Ledger */}
            <Card>
              <CardHeader
                action={
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {filteredAppointments.length} Total on Roster
                  </span>
                }
              >
                <CardTitle>Today's Patient Consultation Queue</CardTitle>
                <CardDescription>
                  Ordered schedule of checked-in and upcoming clinic consultations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5 align-middle">Token #</th>
                        <th className="px-4 py-3.5 align-middle">Patient Name</th>
                        <th className="px-4 py-3.5 align-middle">Scheduled Time</th>
                        <th className="px-4 py-3.5 align-middle">Clinical Reason</th>
                        <th className="px-4 py-3.5 align-middle">Status</th>
                        <th className="px-4 py-3.5 text-right align-middle">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAppointments.map((apt) => {
                        const isCurrent = apt.id === selectedAppointmentId;
                        return (
                          <tr
                            key={apt.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                              isCurrent ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''
                            }`}
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
                            <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                              {new Date(apt.dateTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300">
                              {apt.reasonForVisit}
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    apt.status === 'in_consultation'
                                      ? 'bg-teal-500'
                                      : apt.status === 'checked_in'
                                      ? 'bg-teal-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                                  {apt.status.replace('_', ' ')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right align-middle space-x-1.5">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setSelectedAppointmentId(apt.id)}
                              >
                                View File
                              </Button>
                              {apt.status !== 'completed' && (
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  onClick={() => handleStartConsultation(apt)}
                                >
                                  Engage
                                </Button>
                              )}
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
                    Primary Physician
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Dr. Marcus Vance, MD, FACP
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 block text-[11px] mt-0.5">
                    Lead Attending Physician • Internal Medicine
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Assigned Room:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">Consultation Desk 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Working Hours:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">09:00 AM - 04:30 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Duty Days:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">Mon - Fri</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Consultation Fee:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">$120.00</span>
                  </div>
                </div>

                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/40 rounded-xl border border-teal-200/70 dark:border-teal-800/60">
                  <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-200 font-semibold mb-1">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Clinic Staffing Scope</span>
                  </div>
                  <p className="text-[11px] text-teal-900 dark:text-teal-300">
                    Solo clinical workstation. All registered appointments, e-prescriptions, and diagnostic investigations are managed directly by Dr. Marcus Vance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 2: MY PATIENTS (`patients`)                                    */}
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
            <CardTitle>My Outpatient Medical Directory</CardTitle>
            <CardDescription>
              Electronic Health Records, allergy profiles, and consultation histories under Dr. Marcus Vance
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
                          variant="outline"
                          onClick={() => handleOpenPrescriptionModal(pat.id)}
                        >
                          Prescribe
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleOpenLabModal(pat.id)}
                        >
                          Order Lab
                        </Button>
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
          <CardHeader
            action={
              <Button
                size="xs"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenPrescriptionModal()}
              >
                Write Prescription
              </Button>
            }
          >
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
      {/* SUB-MODULE 4: ORDER LAB TESTS (`lab_orders`)                              */}
      {/* ========================================================================= */}
      {selectedTab === 'lab_orders' && (
        <Card>
          <CardHeader
            action={
              <Button
                size="xs"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenLabModal()}
              >
                Order Lab Test
              </Button>
            }
          >
            <CardTitle>Diagnostic Pathology Requisitions</CardTitle>
            <CardDescription>
              Clinical laboratory orders requested by Dr. Marcus Vance with real-time assay progress
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Order #</th>
                    <th className="px-4 py-3.5 align-middle">Patient Name</th>
                    <th className="px-4 py-3.5 align-middle">Investigation Name</th>
                    <th className="px-4 py-3.5 align-middle">Priority</th>
                    <th className="px-4 py-3.5 align-middle">Specimen Status</th>
                    <th className="px-4 py-3.5 align-middle">Reported Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLabTests.map((lab) => {
                    const isStat = lab.priority === 'stat' || lab.priority === 'urgent';
                    return (
                      <tr
                        key={lab.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                          isStat && lab.status !== 'completed' ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 align-middle font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {lab.testOrderNumber}
                        </td>
                        <td className="px-4 py-3.5 align-middle font-semibold text-slate-900 dark:text-slate-100">
                          {lab.patientName}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{lab.testName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{lab.category}</div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {isStat ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
                                {lab.priority}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                              {lab.priority}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                lab.status === 'completed'
                                  ? 'bg-teal-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span className="text-xs capitalize font-medium text-slate-700 dark:text-slate-300">
                              {lab.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {lab.result ? (
                            <span className="font-semibold text-xs text-teal-800 dark:text-teal-300">
                              {lab.result}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">In Laboratory</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 5: WEEKLY SCHEDULE (`schedule`)                                */}
      {/* ========================================================================= */}
      {selectedTab === 'schedule' && (
        <Card>
          <CardHeader>
            <CardTitle>Consulting Desk Roster & Clinic Calendar</CardTitle>
            <CardDescription>
              Operational schedule for Dr. Marcus Vance across weekly outpatient blocks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                <div
                  key={day}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{day}</span>
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    09:00 AM - 04:30 PM
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                    Consultation Desk 1
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-1">
                Clinical Workflow Notes:
              </span>
              Appointments are slotted in 30-minute intervals. Walk-in registrations coordinated by Front Desk are triaged directly into the consultation queue.
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
      {/* MODAL 2: ORDER LAB TEST                                                   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isLabOrderModalOpen}
        onClose={() => setIsLabOrderModalOpen(false)}
        title="Order Diagnostic Laboratory Investigation"
        description="Requisitions are dispatched directly to the Laboratory Technologist worklist."
        maxWidth="lg"
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
              icon={<FlaskConical className="w-4 h-4" />}
              onClick={handleSaveLabOrder}
            >
              Place Diagnostic Order
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveLabOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Select Patient"
              value={labPatientId}
              onChange={(e) => setLabPatientId(e.target.value)}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName} (${p.mrn})`,
              }))}
            />
            <Input
              label="Investigation / Assay Name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. Lipid Profile, Complete Blood Count"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Category"
              value={testCategory}
              onChange={(e) => setTestCategory(e.target.value)}
              placeholder="e.g. Biochemistry"
            />
            <Input
              label="Specimen Container"
              value={sampleType}
              onChange={(e) => setSampleType(e.target.value)}
              placeholder="e.g. Venous Whole Blood"
            />
            <Select
              label="Clinical Priority"
              value={labPriority}
              onChange={(e) => setLabPriority(e.target.value as any)}
              options={[
                { value: 'routine', label: 'Routine (Standard turnaround)' },
                { value: 'urgent', label: 'Urgent (Priority processing)' },
                { value: 'stat', label: 'STAT (Immediate panic alert)' },
              ]}
            />
          </div>

          <Textarea
            label="Clinical Indication / Diagnostic Notes"
            value={labNotes}
            onChange={(e) => setLabNotes(e.target.value)}
            placeholder="e.g. Suspected metabolic disorder, pre-prescription safety check."
            rows={2}
          />
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD CONSULTATION NOTES                                        */}
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
