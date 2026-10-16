import React, { useState, useEffect } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import {
  getScopedPatients,
  getScopedAppointments,
  getScopedPrescriptions,
  getScopedInvoices,
} from '@/lib/selectors';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { DatePicker } from '@/components/ui/DatePicker';
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
  Filter,
  Plus,
  CheckCircle2,
  Calendar,
  Pill,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BloodGroup, Invoice } from '@/types';

interface PatientViewProps {
  activeTab?: string;
}

export const PatientView: React.FC<PatientViewProps> = ({ activeTab: _activeTab = 'overview' }) => {
  const { currentUser } = useAuth();
  const {
    patients: rawPatients,
    appointments: rawAppointments,
    prescriptions: rawPrescriptions,
    vitals: rawVitals,
    invoices: rawInvoices = [],
    patientAssignments = [],
    addPatient,
    updatePatient,
    recordPayment,
  } = useClinic();

  const patients = React.useMemo(() => {
    return getScopedPatients(currentUser, rawPatients, patientAssignments);
  }, [currentUser, rawPatients, patientAssignments]);

  const appointments = React.useMemo(() => {
    return getScopedAppointments(currentUser, rawAppointments, patientAssignments);
  }, [currentUser, rawAppointments, patientAssignments]);

  const prescriptions = React.useMemo(() => {
    return getScopedPrescriptions(currentUser, rawPrescriptions, patientAssignments);
  }, [currentUser, rawPrescriptions, patientAssignments]);

  const vitals = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'patient') {
      const myPatientIds = new Set(patients.map((p) => p.id));
      return rawVitals.filter((v) => myPatientIds.has(v.patientId));
    }
    return rawVitals;
  }, [currentUser, patients, rawVitals]);

  const invoices = React.useMemo(() => {
    return getScopedInvoices(currentUser, rawInvoices, patientAssignments);
  }, [currentUser, rawInvoices, patientAssignments]);

  const handlePayInvoice = (inv: Invoice) => {
    const due = Math.max(0, inv.totalAmount - inv.paidAmount);
    if (due <= 0) return;
    recordPayment(inv.id, due, 'card');
    showNotification(`Payment of $${due.toFixed(2)} recorded for Invoice ${inv.invoiceNumber}.`);
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'allergy' | 'chronic'>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Notification State
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Register New Outpatient Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('1994-05-18');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('female');
  const [regBlood, setRegBlood] = useState<BloodGroup>('O+');
  const [regAllergies, setRegAllergies] = useState('');
  const [regChronic, setRegChronic] = useState('');
  const [regEmergName, setRegEmergName] = useState('');
  const [regEmergPhone, setRegEmergPhone] = useState('');
  const [regEmergRelation, setRegEmergRelation] = useState('Spouse');
  const [regError, setRegError] = useState('');

  const resetRegisterForm = () => {
    setRegFirstName('');
    setRegLastName('');
    setRegEmail('');
    setRegPhone('');
    setRegDob('1994-05-18');
    setRegGender('female');
    setRegBlood('O+');
    setRegAllergies('');
    setRegChronic('');
    setRegEmergName('');
    setRegEmergPhone('');
    setRegEmergRelation('Spouse');
    setRegError('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('First name and last name are required.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Contact telephone number is required.');
      return;
    }

    const birthYear = parseInt(regDob.split('-')[0], 10);
    const calculatedAge = isNaN(birthYear) ? 30 : Math.max(1, new Date().getFullYear() - birthYear);

    const allergiesArr = regAllergies
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a.toLowerCase() !== 'none');

    const chronicArr = regChronic
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && c.toLowerCase() !== 'none');

    const newPatient = addPatient({
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      email: regEmail.trim() || `${regFirstName.toLowerCase()}.${regLastName.toLowerCase()}@outpatient.clinic`,
      phone: regPhone.trim(),
      dob: regDob,
      gender: regGender,
      bloodGroup: regBlood,
      address: 'Central District, Clinic Zone 1',
      emergencyContact: {
        name: regEmergName.trim() || 'Primary Kin',
        relationship: regEmergRelation.trim() || 'Family',
        phone: regEmergPhone.trim() || regPhone.trim(),
      },
      allergies: allergiesArr,
      chronicConditions: chronicArr,
      age: calculatedAge,
    });

    setIsRegisterOpen(false);
    resetRegisterForm();
    setSelectedPatientId(newPatient.id);
    showNotification(`Outpatient demographic file registered for ${newPatient.firstName} ${newPatient.lastName} (${newPatient.mrn}).`);
  };

  // Editable Allergy State for Selected Patient in Inspector
  const [editingAllergyText, setEditingAllergyText] = useState('');

  // Selected Patient Details
  const inspectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  React.useEffect(() => {
    if (inspectedPatient) {
      setEditingAllergyText(inspectedPatient.allergies.join(', '));
    } else {
      setEditingAllergyText('');
    }
  }, [inspectedPatient?.id, inspectedPatient?.allergies]);

  const handleSaveInspectedAllergies = () => {
    if (!inspectedPatient) return;
    const allergies = editingAllergyText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && a.toLowerCase() !== 'none');
    updatePatient(inspectedPatient.id, { allergies });
    showNotification(`Allergy warnings updated for ${inspectedPatient.firstName} ${inspectedPatient.lastName}.`);
  };

  // Key Clinical KPI Metrics
  const totalPatients = patients.length;
  const activePatientsCount = patients.filter((p) => p.status === 'active').length;
  const allergyRiskCount = patients.filter((p) => p.allergies && p.allergies.length > 0).length;
  const chronicCareCount = patients.filter((p) => p.chronicConditions && p.chronicConditions.length > 0).length;

  // Search Suggestions: Patient Names Only
  const patientSearchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
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
  }, [patients]);

  // Filtering Logic
  const query = searchTerm.toLowerCase().trim();
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const matchesSearch =
      query === '' ||
      fullName.includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return p.status === 'active';
    if (statusFilter === 'allergy') return p.allergies.length > 0;
    if (statusFilter === 'chronic') return p.chronicConditions.length > 0;
    return true;
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (currentUser?.role === 'patient') {
    const patient = patients[0];
    const patientVitals = vitals.find((v) => v.patientId === patient?.id || v.patientId === currentUser.patientId);

    return (
      <div className="space-y-6">
        {notification && (
          <div className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Patient Portal
          </h1>
        </div>

        {/* Section 1: Personal Record */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between items-baseline gap-2 pt-1 first:pt-0">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Patient Name:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                  {patient ? `${patient.firstName} ${patient.lastName}` : currentUser.name}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">MRN:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                  {patient?.mrn || currentUser.badgeNumber || 'None recorded'}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Demographics:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right capitalize">
                  {patient?.age ? `${patient.age} yrs` : ''} {patient?.gender ? `• ${patient.gender}` : ''}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Date of Birth:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                  {patient?.dob || 'None recorded'}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Blood Group:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                  {patient?.bloodGroup || 'None recorded'}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Contact Phone:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                  {patient?.phone || 'None recorded'}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Email:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right break-all">
                  {patient?.email || currentUser.email}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Allergies:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                  {patient?.allergies && patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None recorded'}
                </span>
              </div>

              <div className="flex justify-between items-baseline gap-2 pt-2">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Chronic Conditions:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                  {patient?.chronicConditions && patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'None recorded'}
                </span>
              </div>

              {patient?.emergencyContact && (
                <div className="flex justify-between items-baseline gap-2 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Emergency Contact:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {patient.emergencyContact.name} ({patient.emergencyContact.relationship}) • {patient.emergencyContact.phone}
                  </span>
                </div>
              )}

              {patientVitals && (
                <div className="flex justify-between items-baseline gap-2 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Latest Clinical Vitals:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    BP {patientVitals.systolicBp}/{patientVitals.diastolicBp} mmHg • HR {patientVitals.heartRateBpm} bpm • O2 {patientVitals.oxygenSaturationPct}% • Temp {patientVitals.temperatureCelsius}°C
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Prescriptions */}
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {prescriptions.length} {prescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
              </span>
            }
          >
            <CardTitle>Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prescriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No active prescriptions on file.
              </div>
            ) : (
              prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {rx.prescriptionNumber}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {rx.date}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Doctor: </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{rx.doctorName}</span>
                  </div>
                  {rx.diagnosis && (
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Diagnosis: </span>
                      {rx.diagnosis}
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Medications</span>
                    {rx.items.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{item.medicineName} {item.dosage}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.frequency} • {item.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Section 3: Invoices */}
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}
              </span>
            }
          >
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No invoices on record.
              </div>
            ) : (
              invoices.map((inv) => {
                const balance = Math.max(0, inv.totalAmount - inv.paidAmount);
                const isPaid = inv.status === 'paid' || balance === 0;

                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                          {inv.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {isPaid ? 'Paid' : inv.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {inv.items && inv.items.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                        {inv.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>{item.description} (x{item.quantity})</span>
                            <span className="text-slate-800 dark:text-slate-200">${item.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Billed: </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">${inv.totalAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Paid: </span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">${inv.paidAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Due: </span>
                        <span className={`font-bold ${balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          ${balance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {!isPaid && balance > 0 && (
                      <div className="pt-2">
                        <Button
                          variant="primary"
                          className="w-full min-h-[44px] h-11 text-sm font-semibold cursor-pointer"
                          onClick={() => handlePayInvoice(inv)}
                        >
                          Pay Balance (${balance.toFixed(2)})
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Feedback Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-semibold text-teal-950 dark:text-teal-100">Patient Directory:</span>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Executive Workstation Header */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-teal-300 font-medium">
            Central Medical Records & EHR Governance
          </div>
          <h2 className="text-xl font-bold mt-1 text-slate-100 tracking-tight">
            Patients Medical Directory & Health Records Governance
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              resetRegisterForm();
              setIsRegisterOpen(true);
            }}
          >
            Register Outpatient
          </Button>
        </div>
      </div>

      {/* Patient Governance Bar: Side-by-Side Search & Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Outpatient Directory Governance
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Search by patient name or select filter to inspect medical profiles:
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
            {/* Search Input with Interactive Dropdown and Autofill */}
            <div className="relative w-full sm:w-64">
              <InteractiveSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                suggestions={patientSearchSuggestions}
                placeholder="Search by patient name..."
              />
            </div>

            {/* Scope Filter Dropdown using custom Select with Filter icon */}
            <div className="w-full sm:w-60">
              <Select
                icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                value={statusFilter}
                placeholder="Select Filter Scope"
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'allergy' | 'chronic')}
                options={[
                  { value: 'all', label: `All Patients (${totalPatients})` },
                  { value: 'active', label: `Active in Care (${activePatientsCount})` },
                  { value: 'allergy', label: `Allergy Warnings (${allergyRiskCount})` },
                  { value: 'chronic', label: `Chronic Conditions (${chronicCareCount})` },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Master Patient Records Directory Ledger Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader
          action={
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredPatients.length} Records in Active Ledger
            </span>
          }
        >
          <CardTitle>Master Outpatient Medical Ledger</CardTitle>
          <CardDescription>
            Electronic Health Records, allergy profiles, and consultation histories under clinical administration
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table stackBelow="md">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/12 min-w-[80px]">MRN</TableHead>
                  <TableHead className="w-3/12 min-w-[180px]">Patient Name & Contact</TableHead>
                  <TableHead hideBelow="sm" className="w-1/12 min-w-[100px]">Demographics</TableHead>
                  <TableHead hideBelow="md" className="w-1/12 min-w-[80px]">Blood Group</TableHead>
                  <TableHead hideBelow="lg" className="w-2/12 min-w-[120px]">Allergies</TableHead>
                  <TableHead hideBelow="xl" className="w-1/12 min-w-[120px]">Chronic Conditions</TableHead>
                  <TableHead hideBelow="xl" className="w-2/12 min-w-[130px]">Emergency Contact</TableHead>
                  <TableHead className="w-1/12 min-w-[100px] text-right align-middle whitespace-nowrap">Medical File Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? (
                  paginatedPatients.map((pat) => {
                    const isSelected = selectedPatientId === pat.id;
                    return (
                      <React.Fragment key={pat.id}>
                        <TableRow
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-teal-50/60 dark:bg-teal-950/40'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <TableCell label="MRN" className="w-1/12 min-w-[80px] font-mono font-bold text-slate-900 dark:text-slate-100">
                            {pat.mrn}
                          </TableCell>
                          <TableCell label="Patient Name & Contact" className="w-3/12 min-w-[180px]">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {pat.firstName} {pat.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{pat.phone}</span>
                              <span>•</span>
                              <span>{pat.email}</span>
                            </div>
                          </TableCell>
                          <TableCell label="Demographics" hideBelow="sm" className="w-1/12 min-w-[100px] text-slate-700 dark:text-slate-300 capitalize">
                            {pat.age} yrs • {pat.gender}
                          </TableCell>
                          <TableCell label="Blood Group" hideBelow="md" className="w-1/12 min-w-[80px]">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{pat.bloodGroup}</span>
                          </TableCell>
                          <TableCell label="Allergies" hideBelow="lg" className="w-2/12 min-w-[120px]">
                            {pat.allergies && pat.allergies.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                                  {pat.allergies.join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                                None Recorded
                              </span>
                            )}
                          </TableCell>
                          <TableCell label="Chronic Conditions" hideBelow="xl" className="w-1/12 min-w-[120px] text-slate-600 dark:text-slate-400">
                            {pat.chronicConditions && pat.chronicConditions.length > 0
                              ? pat.chronicConditions.join(', ')
                              : 'None'}
                          </TableCell>
                          <TableCell label="Emergency Contact" hideBelow="xl" className="w-2/12 min-w-[130px] text-slate-700 dark:text-slate-300">
                            <div className="font-medium text-xs">{pat.emergencyContact?.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {pat.emergencyContact?.relationship} • {pat.emergencyContact?.phone}
                            </div>
                          </TableCell>
                          <TableCell label="Action" fullWidthOnStack className="w-1/12 min-w-[100px] text-right align-middle whitespace-nowrap">
                            <Button
                              size="xs"
                              variant={isSelected ? 'secondary' : 'outline'}
                              onClick={() => setSelectedPatientId(isSelected ? null : pat.id)}
                            >
                              <span className="flex items-center gap-1">
                                {isSelected ? 'Close File' : 'Inspect File'}
                                {isSelected ? (
                                  <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                                )}
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Inline Inspection Panel for Selected Patient */}
                        {isSelected && (
                          <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-y border-teal-100 dark:border-teal-900/40 animate-fadeIn">
                            <td colSpan={8} className="p-5">
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5 shadow-xs">
                                {/* Inspection Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        Electronic Health Record: {pat.firstName} {pat.lastName}
                                      </h3>
                                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase">
                                        {pat.status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      MRN: <strong className="font-mono text-slate-700 dark:text-slate-300">{pat.mrn}</strong> • Registered: {pat.registeredDate} • Address: {pat.address}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => setSelectedPatientId(null)}
                                    >
                                      Close Inspection
                                    </Button>
                                  </div>
                                </div>

                                {/* Editable Allergy Profile Banner inside Inspector */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        editingAllergyText.trim() && editingAllergyText.toLowerCase().trim() !== 'none'
                                          ? 'bg-rose-500'
                                          : 'bg-slate-400'
                                      }`}
                                    />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      Allergy Safety Warnings:
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                                    <input
                                      type="text"
                                      value={editingAllergyText}
                                      onChange={(e) => setEditingAllergyText(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveInspectedAllergies()}
                                      placeholder="e.g. Penicillin, Peanuts (or None)"
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors shadow-xs font-medium"
                                    />
                                    <Button
                                      size="xs"
                                      variant="secondary"
                                      onClick={handleSaveInspectedAllergies}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>

                                {/* Patient Clinical Ledger Tabs Breakdown */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  {/* Clinical Vitals Card */}
                                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                                      <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                      <span>Latest Triage Vitals</span>
                                    </div>
                                    {(() => {
                                      const patientVitals = vitals.find((v) => v.patientId === pat.id);
                                      if (!patientVitals) {
                                        return (
                                          <p className="text-xs text-slate-400 italic py-2">
                                            No clinical triage vitals recorded for this patient.
                                          </p>
                                        );
                                      }
                                      return (
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-mono">
                                          <div>
                                            <span className="text-[10px] text-slate-400 block font-sans">BP</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {patientVitals.systolicBp}/{patientVitals.diastolicBp} mmHg
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-400 block font-sans">Heart Rate</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {patientVitals.heartRateBpm} bpm
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-400 block font-sans">O2 Sat</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {patientVitals.oxygenSaturationPct}%
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-400 block font-sans">Temperature</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {patientVitals.temperatureCelsius}°C
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Prescriptions & Medications Card */}
                                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                                      <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                      <span>Active Prescriptions (e-Rx)</span>
                                    </div>
                                    {(() => {
                                      const patientRx = prescriptions.filter((rx) => rx.patientId === pat.id);
                                      if (patientRx.length === 0) {
                                        return (
                                          <p className="text-xs text-slate-400 italic py-2">
                                            No active prescriptions on file.
                                          </p>
                                        );
                                      }
                                      return (
                                        <div className="space-y-2 max-h-36 overflow-y-auto pt-1">
                                          {patientRx.map((rx) => (
                                            <div key={rx.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0">
                                              <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                                                <span>{rx.prescriptionNumber}</span>
                                                <span className="text-[10px] font-mono text-slate-500">{rx.date}</span>
                                              </div>
                                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                                Dx: {rx.diagnosis}
                                              </div>
                                              <div className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">
                                                {rx.items.map((i) => i.medicineName).join(', ')}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Visits & Consultations Card */}
                                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                      <span>Consultation & Visit Log</span>
                                    </div>
                                    {(() => {
                                      const patientApts = appointments.filter((a) => a.patientId === pat.id);
                                      if (patientApts.length === 0) {
                                        return (
                                          <p className="text-xs text-slate-400 italic py-2">
                                            No consultations recorded.
                                          </p>
                                        );
                                      }
                                      return (
                                        <div className="space-y-2 max-h-36 overflow-y-auto pt-1">
                                          {patientApts.map((a) => (
                                            <div key={a.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0">
                                              <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                                                <span>{a.doctorName}</span>
                                                <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-bold">
                                                  Token #{a.tokenNumber}
                                                </span>
                                              </div>
                                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                                {a.reasonForVisit}
                                              </div>
                                              <div className="text-[10px] text-slate-500 capitalize">
                                                Status: {a.status.replace('_', ' ')}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                      {searchTerm.trim() !== ''
                        ? `No outpatients found matching "${searchTerm}".`
                        : 'No outpatient records found under the current filter scope.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPatients.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Register New Outpatient Demographic File Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          resetRegisterForm();
        }}
        title="Register Outpatient Demographic File"
        description="Creates a verified Electronic Health Record (EHR) profile with MRN assignment."
        maxWidth="lg"
        fullScreenOnMobile={true}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRegisterOpen(false);
                resetRegisterForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleRegisterSubmit}
            >
              Authorize & Create Record
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
          {regError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
              {regError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={regFirstName}
              onChange={(e) => {
                setRegFirstName(e.target.value);
                if (regError) setRegError('');
              }}
              placeholder="e.g. Eleanor"
              error={!regFirstName.trim() && regError ? 'First name is required' : undefined}
            />
            <Input
              label="Last Name"
              value={regLastName}
              onChange={(e) => {
                setRegLastName(e.target.value);
                if (regError) setRegError('');
              }}
              placeholder="e.g. Vance"
              error={!regLastName.trim() && regError ? 'Last name is required' : undefined}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Telephone"
              value={regPhone}
              onChange={(e) => {
                setRegPhone(e.target.value);
                if (regError) setRegError('');
              }}
              placeholder="e.g. +1 (555) 234-5678"
              error={!regPhone.trim() && regError ? 'Telephone is required' : undefined}
            />
            <Input
              label="Email Address"
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="e.g. eleanor.vance@outpatient.clinic"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DatePicker
              label="Date of Birth"
              value={regDob}
              onChange={setRegDob}
              required
            />
            <Select
              label="Gender"
              value={regGender}
              onChange={(e) => setRegGender(e.target.value as 'male' | 'female' | 'other')}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Input
              label="Allergies (comma-separated)"
              value={regAllergies}
              onChange={(e) => setRegAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts (or None)"
            />
            <Input
              label="Chronic Conditions (comma-separated)"
              value={regChronic}
              onChange={(e) => setRegChronic(e.target.value)}
              placeholder="e.g. Hypertension, Asthma (or None)"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Emergency Contact Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Contact Name"
                value={regEmergName}
                onChange={(e) => setRegEmergName(e.target.value)}
                placeholder="e.g. Thomas Vance"
              />
              <Input
                label="Relationship"
                value={regEmergRelation}
                onChange={(e) => setRegEmergRelation(e.target.value)}
                placeholder="e.g. Spouse / Sibling"
              />
              <Input
                label="Contact Phone"
                value={regEmergPhone}
                onChange={(e) => setRegEmergPhone(e.target.value)}
                placeholder="e.g. +1 (555) 987-6543"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientView;
