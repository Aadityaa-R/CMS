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
  FlaskConical,
  CheckCircle,
  AlertCircle,
  Search,
  Activity,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { LabTest } from '@/types';

interface LabTechnicianViewProps {
  activeTab: string;
}

export const LabTechnicianView: React.FC<LabTechnicianViewProps> = ({ activeTab = 'overview' }) => {
  const { currentUser } = useAuth();
  const { labTests, updateLabTestStatus } = useClinic();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'stat_urgent' | 'routine'>('all');

  // Result Certification Modal State
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [techNotes, setTechNotes] = useState('');
  const [findingFlag, setFindingFlag] = useState<'normal' | 'abnormal' | 'critical'>('normal');

  // Feedback Notification Banner State
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Filter queues
  const pendingCollection = labTests.filter((t) => t.status === 'ordered');
  const pendingAnalysis = labTests.filter((t) => t.status === 'sample_collected');
  const completedTests = labTests.filter((t) => t.status === 'completed');
  const urgentOrders = labTests.filter(
    (t) => t.priority === 'urgent' || t.priority === 'stat'
  );

  // Search and priority filter helper
  const filterList = (tests: LabTest[]) => {
    return tests.filter((t) => {
      const matchSearch =
        t.testOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.doctorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPriority =
        priorityFilter === 'all'
          ? true
          : priorityFilter === 'stat_urgent'
          ? t.priority === 'stat' || t.priority === 'urgent'
          : t.priority === 'routine';

      return matchSearch && matchPriority;
    });
  };

  const handleOpenResultModal = (test: LabTest) => {
    setSelectedTest(test);
    setResultValue(test.result || '');
    setReferenceRange(test.referenceRange || 'Normal clinical threshold');
    setTechNotes(test.clinicalNotes || '');
    setFindingFlag('normal');
  };

  const handleCollectSample = (test: LabTest) => {
    updateLabTestStatus(test.id, 'sample_collected');
    showNotification(
      `Biological specimen collected for ${test.patientName} (${test.testName}). Order moved to testing queue.`
    );
  };

  const handleSaveResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    const formattedResult =
      findingFlag === 'critical'
        ? `CRITICAL ALERT: ${resultValue}`
        : findingFlag === 'abnormal'
        ? `ABNORMAL: ${resultValue}`
        : resultValue;

    updateLabTestStatus(selectedTest.id, 'completed', {
      result: formattedResult,
      notes: `${techNotes ? techNotes + ' | ' : ''}Ref: ${referenceRange} (Classified: ${findingFlag.toUpperCase()})`,
      technicianName: currentUser.name,
    });

    showNotification(
      `Diagnostic report certified for ${selectedTest.patientName} (${selectedTest.testName}). Published to Physician EMR and Patient Portal.`
    );

    setSelectedTest(null);
    setResultValue('');
    setReferenceRange('');
    setTechNotes('');
  };

  // Helper for Specimen Tube Color
  const getContainerBadge = (sampleType: string) => {
    const s = sampleType.toLowerCase();
    if (s.includes('blood') || s.includes('edta')) {
      return <Badge size="sm" variant="danger">Lavender EDTA Tube</Badge>;
    }
    if (s.includes('serum') || s.includes('lipid') || s.includes('cmp')) {
      return <Badge size="sm" variant="amber">Gold Serum Gel Tube</Badge>;
    }
    if (s.includes('urine')) {
      return <Badge size="sm" variant="warning">Sterile Urine Cup</Badge>;
    }
    return <Badge size="sm" variant="neutral">{sampleType}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Diagnostic Pathology & Laboratory Workstation
          </h2>
          <p className="text-xs text-slate-500">
            Lead Medical Technologist: {currentUser.name} • Certified Diagnostic Laboratory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="md">
            Automated Clinical Analyzers Online
          </Badge>
        </div>
      </div>

      {/* Real-time Feedback Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between gap-3 shadow-xs transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-teal-700 hover:text-teal-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar - visible in overview or sub-modules */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Awaiting Sample"
          value={pendingCollection.length}
          subtitle="Orders requiring phlebotomy"
          icon={<Activity className="w-5 h-5" />}
          colorScheme="amber"
        />
        <StatCard
          title="In Testing Pipeline"
          value={pendingAnalysis.length}
          subtitle="Specimens ready for assay"
          icon={<FlaskConical className="w-5 h-5" />}
          colorScheme="blue"
        />
        <StatCard
          title="Urgent / STAT Priority"
          value={urgentOrders.length}
          subtitle="Emergency rapid turnaround"
          icon={<AlertCircle className="w-5 h-5" />}
          colorScheme={urgentOrders.length > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="Certified Today"
          value={completedTests.length}
          subtitle="Reports published to EMR"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="teal"
        />
      </div>

      {/* Reusable Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, patient name, doctor, or investigation..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Priority:</span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              onClick={() => setPriorityFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                priorityFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({labTests.length})
            </button>
            <button
              onClick={() => setPriorityFilter('stat_urgent')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                priorityFilter === 'stat_urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              STAT & Urgent ({urgentOrders.length})
            </button>
            <button
              onClick={() => setPriorityFilter('routine')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                priorityFilter === 'routine'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Routine
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: LABORATORY WORKLIST (OVERVIEW)                              */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <Card>
          <CardHeader
            action={
              <span className="text-xs font-semibold text-slate-500">
                {filterList(labTests).length} Orders in Master Worklist
              </span>
            }
          >
            <CardTitle>Master Pathology Worklist & Specimen Tracking</CardTitle>
            <CardDescription>
              Consolidated view of all diagnostic orders, accession status, and published results
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Investigation Name</th>
                    <th className="px-4 py-3">Ordering Doctor</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Specimen Tube</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reported Result</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filterList(labTests).length > 0 ? (
                    filterList(labTests).map((test) => {
                      const isStat = test.priority === 'stat';
                      return (
                        <tr
                          key={test.id}
                          className={`hover:bg-slate-50/75 transition-colors ${
                            isStat && test.status !== 'completed' ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                            {test.testOrderNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{test.patientName}</div>
                            <div className="text-[11px] text-slate-500">ID: {test.patientId}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{test.testName}</div>
                            <div className="text-[11px] text-slate-500">{test.category}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{test.doctorName}</td>
                          <td className="px-4 py-3">
                            <Badge
                              size="sm"
                              variant={
                                test.priority === 'stat'
                                  ? 'danger'
                                  : test.priority === 'urgent'
                                  ? 'amber'
                                  : 'neutral'
                              }
                            >
                              {test.priority.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{getContainerBadge(test.sampleType)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              size="sm"
                              variant={
                                test.status === 'completed'
                                  ? 'success'
                                  : test.status === 'sample_collected'
                                  ? 'info'
                                  : 'warning'
                              }
                            >
                              {test.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {test.result ? (
                              <span className="font-semibold text-teal-800">{test.result}</span>
                            ) : (
                              <span className="text-slate-400 italic">Pending assay</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {test.status === 'ordered' && (
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => handleCollectSample(test)}
                              >
                                Collect Sample
                              </Button>
                            )}

                            {test.status === 'sample_collected' && (
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => handleOpenResultModal(test)}
                              >
                                Enter Result
                              </Button>
                            )}

                            {test.status === 'completed' && (
                              <span className="text-emerald-700 font-medium text-[11px] inline-flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Certified
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No laboratory orders found matching the criteria.
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
      {/* SUB-MODULE 2: SAMPLE COLLECTION & PHLEBOTOMY (`samples`)                  */}
      {/* ========================================================================= */}
      {activeTab === 'samples' && (
        <Card>
          <CardHeader
            action={
              <Badge variant="amber" size="md">
                {filterList(pendingCollection).length} Orders Awaiting Collection
              </Badge>
            }
          >
            <CardTitle>Specimen Intake & Phlebotomy Accessioning</CardTitle>
            <CardDescription>
              Verify patient identity, collect biological specimens in designated containers, and mark accessioned
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Patient Name</th>
                    <th className="px-4 py-3">Required Investigation</th>
                    <th className="px-4 py-3">Specimen Container Tube</th>
                    <th className="px-4 py-3">Ordering Physician</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Clinical Indication</th>
                    <th className="px-4 py-3 text-right">Phlebotomy Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filterList(pendingCollection).length > 0 ? (
                    filterList(pendingCollection).map((test) => (
                      <tr key={test.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                          {test.testOrderNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {test.patientName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{test.testName}</div>
                          <div className="text-[11px] text-slate-500">{test.category}</div>
                        </td>
                        <td className="px-4 py-3">{getContainerBadge(test.sampleType)}</td>
                        <td className="px-4 py-3 text-slate-700">{test.doctorName}</td>
                        <td className="px-4 py-3">
                          <Badge
                            size="sm"
                            variant={
                              test.priority === 'stat'
                                ? 'danger'
                                : test.priority === 'urgent'
                                ? 'amber'
                                : 'neutral'
                            }
                          >
                            {test.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {test.clinicalNotes || 'Routine pre-consultation assessment'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<Activity className="w-3.5 h-3.5" />}
                            onClick={() => handleCollectSample(test)}
                          >
                            Collect Sample
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <span className="font-semibold text-slate-700 block">All Specimens Collected</span>
                        No test requisitions currently pending biological sample collection.
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
      {/* SUB-MODULE 3: DIAGNOSTIC RESULTS ENTRY & CERTIFICATION (`results`)        */}
      {/* ========================================================================= */}
      {activeTab === 'results' && (
        <Card>
          <CardHeader
            action={
              <Badge variant="teal" size="md">
                {filterList(pendingAnalysis).length} Samples Awaiting Certification
              </Badge>
            }
          >
            <CardTitle>Diagnostic Results Entry & Certification Queue</CardTitle>
            <CardDescription>
              Analyze collected specimens on laboratory instrumentation and publish validated clinical reports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Assay / Test Name</th>
                    <th className="px-4 py-3">Ordering Physician</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Specimen Collected At</th>
                    <th className="px-4 py-3">Clinical Indication</th>
                    <th className="px-4 py-3 text-right">Laboratory Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filterList(pendingAnalysis).length > 0 ? (
                    filterList(pendingAnalysis).map((test) => (
                      <tr key={test.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                          {test.testOrderNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {test.patientName}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {test.testName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{test.doctorName}</td>
                        <td className="px-4 py-3">
                          <Badge
                            size="sm"
                            variant={
                              test.priority === 'stat'
                                ? 'danger'
                                : test.priority === 'urgent'
                                ? 'amber'
                                : 'neutral'
                            }
                          >
                            {test.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {test.sampleCollectedAt
                            ? new Date(test.sampleCollectedAt).toLocaleTimeString()
                            : 'Specimen in Lab'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {test.clinicalNotes || 'Diagnostic verification'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<FlaskConical className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenResultModal(test)}
                          >
                            Enter Result
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-80" />
                        <span className="font-semibold text-slate-700 block">All Diagnostic Assays Certified</span>
                        No accessioned specimens currently waiting for result entry.
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
      {/* RESULT CERTIFICATION MODAL                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedTest)}
        onClose={() => setSelectedTest(null)}
        title={`Enter Diagnostic Findings: ${selectedTest?.testName}`}
        description="Results are certified with technologist credentials and published directly to the Physician EMR and Patient Portal."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTest(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle className="w-4 h-4" />}
              onClick={handleSaveResult}
            >
              Certify & Publish Result
            </Button>
          </>
        }
      >
        {selectedTest && (
          <form onSubmit={handleSaveResult} className="space-y-4">
            {/* Requisition Summary Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Patient</span>
                <span className="font-semibold text-slate-900">{selectedTest.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Order Reference</span>
                <span className="font-mono text-slate-800">{selectedTest.testOrderNumber} ({selectedTest.category})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ordering Physician</span>
                <span className="text-slate-800">{selectedTest.doctorName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Specimen Container</span>
                <span className="font-medium text-teal-800">{selectedTest.sampleType}</span>
              </div>
            </div>

            {/* Diagnostic Result Value */}
            <Input
              label="Diagnostic Result Value & Units"
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              placeholder="e.g. 138 mg/dL or Total: 210 mg/dL, LDL: 130 mg/dL, HDL: 45 mg/dL"
              required
            />

            {/* Reference Range & Normal Values */}
            <Input
              label="Clinical Reference Range"
              value={referenceRange}
              onChange={(e) => setReferenceRange(e.target.value)}
              placeholder="e.g. 70 - 99 mg/dL fasting or Desirable: < 200 mg/dL"
            />

            {/* Finding Classification */}
            <Select
              label="Clinical Finding Classification"
              value={findingFlag}
              onChange={(e) => setFindingFlag(e.target.value as any)}
              options={[
                { value: 'normal', label: 'Normal / Within Reference Range' },
                { value: 'abnormal', label: 'Abnormal / Elevated or Low' },
                { value: 'critical', label: 'Critical / Panic Value (Physician Immediate Alert)' },
              ]}
            />

            {/* Technologist Notes / Observations */}
            <Textarea
              label="Technologist Analytical Notes & Quality Control"
              value={techNotes}
              onChange={(e) => setTechNotes(e.target.value)}
              placeholder="Analyzer calibration check verified, sample free of hemolysis, result certified."
              rows={2}
            />

            {/* Certification signature notice */}
            <div className="p-2.5 bg-teal-50/60 rounded-lg border border-teal-100 flex items-center gap-2 text-[11px] text-teal-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>
                Certifying Technologist Signature: <strong>{currentUser.name}</strong> ({currentUser.badgeNumber || 'LAB-703'})
              </span>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
