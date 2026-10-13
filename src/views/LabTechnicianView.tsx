import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/ui/StatCard';
import {
  FlaskConical,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { LabTest } from '@/types';

interface LabTechnicianViewProps {
  activeTab: string;
}

export const LabTechnicianView: React.FC<LabTechnicianViewProps> = ({ activeTab: _activeTab }) => {
  const { currentUser } = useAuth();
  const { labTests, updateLabTestStatus } = useClinic();

  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [techNotes, setTechNotes] = useState('');

  const pendingTests = labTests.filter((t) => t.status !== 'completed');
  const completedTests = labTests.filter((t) => t.status === 'completed');
  const urgentOrders = labTests.filter(
    (t) => t.priority === 'urgent' || t.priority === 'stat'
  );

  const handleOpenResultModal = (test: LabTest) => {
    setSelectedTest(test);
    setResultValue(test.result || '');
    setTechNotes(test.clinicalNotes || '');
  };

  const handleSaveResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    updateLabTestStatus(selectedTest.id, 'completed', {
      result: resultValue,
      notes: techNotes,
      technicianName: currentUser.name,
    });

    setSelectedTest(null);
    setResultValue('');
    setTechNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Diagnostic Pathology & Laboratory Workstation
          </h2>
          <p className="text-xs text-slate-500">
            Lead Medical Technologist: {currentUser.name} • Clinical Pathology Diagnostics
          </p>
        </div>
        <Badge variant="teal" size="md">
          Diagnostic Analyzers Calibrated
        </Badge>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Laboratory Orders"
          value={pendingTests.length}
          subtitle="In queue or processing"
          icon={<FlaskConical className="w-5 h-5" />}
          colorScheme="amber"
        />
        <StatCard
          title="Urgent / STAT Priority"
          value={urgentOrders.length}
          subtitle="Fast turnaround required"
          icon={<AlertCircle className="w-5 h-5" />}
          colorScheme={urgentOrders.length > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="Completed Assays Today"
          value={completedTests.length}
          subtitle="Results published to EMR"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="teal"
        />
      </div>

      {/* Laboratory Worklist Table */}
      <Card>
        <CardHeader
          action={
            <span className="text-xs font-semibold text-slate-500">
              {labTests.length} Total Laboratory Orders
            </span>
          }
        >
          <CardTitle>Pathology Worklist & Specimen Tracking</CardTitle>
          <CardDescription>
            Collect specimens, run automated analyzers, and record certified laboratory results
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Investigation Name</th>
                  <th className="px-4 py-3">Ordering Doctor</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Specimen Status</th>
                  <th className="px-4 py-3">Result / Values</th>
                  <th className="px-4 py-3 text-right">Laboratory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {test.testOrderNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {test.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Specimen: {test.sampleType}
                      </div>
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
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {test.priority.toUpperCase()}
                      </Badge>
                    </td>
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
                        <span className="font-bold text-teal-800">
                          {test.result}
                        </span>
                      ) : (
                        <span className="text-slate-400">Awaiting Testing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {test.status === 'ordered' && (
                        <button
                          onClick={() =>
                            updateLabTestStatus(test.id, 'sample_collected')
                          }
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium text-xs transition-colors"
                        >
                          Collect Sample
                        </button>
                      )}

                      {test.status !== 'completed' && (
                        <button
                          onClick={() => handleOpenResultModal(test)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium text-xs transition-colors"
                        >
                          Enter Result
                        </button>
                      )}

                      {test.status === 'completed' && (
                        <span className="text-emerald-700 font-medium text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Validated
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

      {/* Enter Result Modal */}
      <Modal
        isOpen={Boolean(selectedTest)}
        onClose={() => setSelectedTest(null)}
        title={`Enter Diagnostic Result for ${selectedTest?.testName}`}
        description="Results will be instantly published to the attending physician's desk and patient record."
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
              onClick={handleSaveResult}
            >
              Certify & Publish Result
            </Button>
          </>
        }
      >
        {selectedTest && (
          <form onSubmit={handleSaveResult} className="space-y-3.5">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Patient:</strong> {selectedTest.patientName}
              </div>
              <div>
                <strong>Test Order:</strong> {selectedTest.testOrderNumber} (
                {selectedTest.category})
              </div>
              <div>
                <strong>Ordering Physician:</strong> {selectedTest.doctorName}
              </div>
            </div>

            <Input
              label="Diagnostic Result Value"
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              placeholder="e.g. 138 mg/dL or Normal or Negative"
              required
            />

            <Input
              label="Technologist Notes / Findings"
              value={techNotes}
              onChange={(e) => setTechNotes(e.target.value)}
              placeholder="Special laboratory observations or assay calibration notes"
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
