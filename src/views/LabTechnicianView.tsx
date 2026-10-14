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
import {
  CheckCircle,
  Search,
  CheckCircle2,
  Filter,
  ChevronDown,
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
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  // Close priority dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPriorityDropdownOpen(false);
      }
    };
    if (isPriorityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPriorityDropdownOpen]);

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
  const routineOrders = labTests.filter((t) => t.priority === 'routine');

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

  // Helper for Specimen Tube Name
  const getContainerName = (sampleType: string): string => {
    const s = sampleType.toLowerCase();
    if (s.includes('blood') || s.includes('edta')) {
      return 'Lavender EDTA Tube';
    }
    if (s.includes('serum') || s.includes('lipid') || s.includes('cmp')) {
      return 'Gold Serum Gel Tube';
    }
    if (s.includes('urine')) {
      return 'Sterile Urine Cup';
    }
    return sampleType;
  };

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Diagnostic Pathology & Laboratory Workstation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lead Medical Technologist: {currentUser.name} • Certified Diagnostic Laboratory
          </p>
        </div>
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

      {/* KPI Stats Bar - visible in overview or sub-modules */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Awaiting Sample"
          value={pendingCollection.length}
          unit={pendingCollection.length === 1 ? 'Order' : 'Orders'}
          subtitle="Orders requiring phlebotomy"
          colorScheme="slate"
        />
        <StatCard
          title="In Testing Pipeline"
          value={pendingAnalysis.length}
          unit={pendingAnalysis.length === 1 ? 'Order' : 'Orders'}
          subtitle="Orders ready for assay"
          colorScheme="teal"
        />
        <StatCard
          title="Urgent / STAT Priority"
          value={urgentOrders.length}
          unit={urgentOrders.length === 1 ? 'Order' : 'Orders'}
          subtitle="Orders requiring rapid turnaround"
          colorScheme={urgentOrders.length > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="Certified Today"
          value={completedTests.length}
          unit={completedTests.length === 1 ? 'Order' : 'Orders'}
          subtitle="Orders certified and published"
          colorScheme="teal"
        />
      </div>

      {/* Reusable Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, patient name, doctor, or investigation..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg !pl-11 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-xs"
          />
        </div>

        {/* Priority Filter as Dropdown Selector */}
        <div className="relative" ref={priorityDropdownRef}>
          <button
            type="button"
            onClick={() => setIsPriorityDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-teal-500"
            aria-label="Filter orders by priority"
            aria-expanded={isPriorityDropdownOpen}
          >
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Priority:</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {priorityFilter === 'all'
                ? `All (${labTests.length})`
                : priorityFilter === 'stat_urgent'
                ? `STAT & Urgent (${urgentOrders.length})`
                : `Routine (${routineOrders.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {isPriorityDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Filter by Order Priority
              </div>
              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('all');
                  setIsPriorityDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  priorityFilter === 'all'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Orders</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {labTests.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('stat_urgent');
                  setIsPriorityDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  priorityFilter === 'stat_urgent'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  STAT & Urgent
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-mono font-medium">
                  {urgentOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPriorityFilter('routine');
                  setIsPriorityDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  priorityFilter === 'routine'
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>Routine Orders</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {routineOrders.length}
                </span>
              </button>
            </div>
          )}
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
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Order #</th>
                    <th className="px-4 py-3.5 align-middle">Patient</th>
                    <th className="px-4 py-3.5 align-middle">Investigation Name</th>
                    <th className="px-4 py-3.5 align-middle">Ordering Doctor</th>
                    <th className="px-4 py-3.5 align-middle">Priority</th>
                    <th className="px-4 py-3.5 align-middle">Specimen Tube</th>
                    <th className="px-4 py-3.5 align-middle">Status</th>
                    <th className="px-4 py-3.5 align-middle">Reported Result</th>
                    <th className="px-4 py-3.5 text-left align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filterList(labTests).length > 0 ? (
                    filterList(labTests).map((test) => {
                      const isStat = test.priority === 'stat';
                      return (
                        <tr
                          key={test.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                            isStat && test.status !== 'completed' ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 align-middle font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {test.testOrderNumber}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{test.patientName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">ID: {test.patientId}</div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{test.testName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{test.category}</div>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-700 dark:text-slate-300">{test.doctorName}</td>
                          <td className="px-4 py-3.5 align-middle">
                            <span
                              className={`text-xs capitalize font-medium ${
                                test.priority === 'stat' || test.priority === 'urgent'
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {test.priority === 'stat' ? 'STAT' : test.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-700 dark:text-slate-300 font-normal">
                            {getContainerName(test.sampleType)}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  test.status === 'completed'
                                    ? 'bg-teal-500'
                                    : test.status === 'sample_collected'
                                    ? 'bg-teal-400'
                                    : 'bg-slate-400 dark:bg-slate-500'
                                }`}
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300 capitalize font-medium">
                                {test.status.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            {test.result ? (
                              <span className="font-semibold text-xs text-teal-800 dark:text-teal-300">{test.result}</span>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">Pending assay</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap space-x-2">
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
                              <span className="text-teal-700 dark:text-teal-400 font-medium text-xs">
                                Certified
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
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
              <span className="text-xs font-semibold text-slate-500">
                {filterList(pendingCollection).length} Orders Awaiting Collection
              </span>
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
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Order #</th>
                    <th className="px-4 py-3.5 align-middle">Patient</th>
                    <th className="px-4 py-3.5 align-middle">Investigation Name</th>
                    <th className="px-4 py-3.5 align-middle">Ordering Doctor</th>
                    <th className="px-4 py-3.5 align-middle">Priority</th>
                    <th className="px-4 py-3.5 align-middle">Specimen Tube</th>
                    <th className="px-4 py-3.5 align-middle">Status</th>
                    <th className="px-4 py-3.5 align-middle">Clinical Indication</th>
                    <th className="px-4 py-3.5 text-left align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filterList(pendingCollection).length > 0 ? (
                    filterList(pendingCollection).map((test) => {
                      const isStat = test.priority === 'stat';
                      return (
                        <tr
                          key={test.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                            isStat ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 align-middle font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {test.testOrderNumber}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{test.patientName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">ID: {test.patientId}</div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{test.testName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{test.category}</div>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-700 dark:text-slate-300">{test.doctorName}</td>
                          <td className="px-4 py-3.5 align-middle">
                            <span
                              className={`text-xs capitalize font-medium ${
                                test.priority === 'stat' || test.priority === 'urgent'
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {test.priority === 'stat' ? 'STAT' : test.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-700 dark:text-slate-300 font-normal">
                            {getContainerName(test.sampleType)}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-400 dark:bg-slate-500" />
                              <span className="text-xs text-slate-700 dark:text-slate-300 capitalize font-medium">
                                Awaiting Specimen
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-600 dark:text-slate-400">
                            {test.clinicalNotes || 'Routine pre-consultation assessment'}
                          </td>
                          <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => handleCollectSample(test)}
                            >
                              Collect Sample
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
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
              <span className="text-xs font-semibold text-slate-500">
                {filterList(pendingAnalysis).length} Samples Awaiting Certification
              </span>
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
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 align-middle">Order #</th>
                    <th className="px-4 py-3.5 align-middle">Patient</th>
                    <th className="px-4 py-3.5 align-middle">Investigation Name</th>
                    <th className="px-4 py-3.5 align-middle">Ordering Doctor</th>
                    <th className="px-4 py-3.5 align-middle">Priority</th>
                    <th className="px-4 py-3.5 align-middle">Specimen Tube</th>
                    <th className="px-4 py-3.5 align-middle">Status</th>
                    <th className="px-4 py-3.5 align-middle">Collected At</th>
                    <th className="px-4 py-3.5 text-left align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filterList(pendingAnalysis).length > 0 ? (
                    filterList(pendingAnalysis).map((test) => {
                      const isStat = test.priority === 'stat';
                      return (
                        <tr
                          key={test.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                            isStat ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 align-middle font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {test.testOrderNumber}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{test.patientName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">ID: {test.patientId}</div>
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{test.testName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{test.category}</div>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-700 dark:text-slate-300">{test.doctorName}</td>
                          <td className="px-4 py-3.5 align-middle">
                            <span
                              className={`text-xs capitalize font-medium ${
                                test.priority === 'stat' || test.priority === 'urgent'
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {test.priority === 'stat' ? 'STAT' : test.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-700 dark:text-slate-300 font-normal">
                            {getContainerName(test.sampleType)}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-teal-500" />
                              <span className="text-xs text-slate-700 dark:text-slate-300 capitalize font-medium">
                                In Lab Testing
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-xs text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {test.sampleCollectedAt
                              ? new Date(test.sampleCollectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Specimen in Lab'}
                          </td>
                          <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap">
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handleOpenResultModal(test)}
                            >
                              Enter Result
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
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
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Patient</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedTest.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Order Reference</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedTest.testOrderNumber} ({selectedTest.category})</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Ordering Physician</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedTest.doctorName}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Specimen Container</span>
                <span className="font-medium text-teal-800 dark:text-teal-300">{selectedTest.sampleType}</span>
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
            <div className="p-2.5 bg-teal-50/60 dark:bg-teal-950/60 rounded-lg border border-teal-100 dark:border-teal-800 flex items-center gap-2 text-[11px] text-teal-800 dark:text-teal-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
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
