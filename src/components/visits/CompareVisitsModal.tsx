import React, { useState, useMemo, useEffect } from 'react';
import { Visit, Patient, Doctor } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/time';
import { formatDoctorName } from '@/lib/doctorNames';
import { getVitalMarker, NORMAL_VITAL_RANGES } from '@/lib/vitals';
import { formatDelta } from '@/lib/visits';

export interface CompareVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  visits: Visit[];
  doctors: Doctor[];
}

export const CompareVisitsModal: React.FC<CompareVisitsModalProps> = ({
  isOpen,
  onClose,
  patient,
  visits,
  doctors,
}) => {
  // Sort patient visits most recent first for the selection list
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visits]);

  // Selected visit IDs (up to 4, default up to 4 most recent)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reset or initialize selections when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(sortedVisits.slice(0, 4).map((v) => v.id));
    }
  }, [isOpen, sortedVisits]);

  // Toggle selection with FIFO eviction of the oldest date when 5th is clicked
  const handleToggleVisit = (visitId: string) => {
    if (selectedIds.includes(visitId)) {
      setSelectedIds((prev) => prev.filter((id) => id !== visitId));
    } else {
      const next = [...selectedIds, visitId];
      if (next.length > 4) {
        // Find the visit with the oldest date among the 5 to uncheck
        const oldest = sortedVisits
          .filter((v) => next.includes(v.id))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        if (oldest) {
          setSelectedIds(next.filter((id) => id !== oldest.id));
          return;
        }
      }
      setSelectedIds(next);
    }
  };

  // Chosen visits in chronological date order (earliest to latest) for column comparison
  const chosenVisitsInDateOrder = useMemo(() => {
    return sortedVisits
      .filter((v) => selectedIds.includes(v.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sortedVisits, selectedIds]);

  const getDoctorName = (doctorId: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (doc) return formatDoctorName(doc);
    return doctorId;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Compare Visits — ${patient.firstName} ${patient.lastName}`}
      maxWidth="2xl"
      fullScreenOnMobile={true}
      footer={
        <div className="flex justify-end w-full">
          <Button variant="outline" size="sm" onClick={onClose} className="min-h-[44px]">
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Visit Selection Checkbox List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select visits to compare (maximum 4)
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIds.length} of {sortedVisits.length} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
            {sortedVisits.map((v) => {
              const isChecked = selectedIds.includes(v.id);
              return (
                <label
                  key={v.id}
                  className={`flex items-start gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-teal-500/40 bg-teal-50/40 dark:bg-teal-950/20 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleVisit(v.id)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(v.date)}
                    </div>
                    <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 truncate">
                      {getDoctorName(v.doctorId)} • {v.reason}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        {chosenVisitsInDateOrder.length > 0 ? (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse" aria-label="Visit comparison table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <th scope="col" className="p-2.5 font-bold text-slate-700 dark:text-slate-300 w-32 border-r border-slate-200 dark:border-slate-800">
                    Metric / Visit
                  </th>
                  {chosenVisitsInDateOrder.map((v, idx) => (
                    <th
                      key={v.id}
                      scope="col"
                      className="p-2.5 font-bold text-slate-900 dark:text-slate-100 min-w-[140px] border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                    >
                      <div>{formatDate(v.date)}</div>
                      <div className="text-[0.6875rem] font-normal text-slate-500 dark:text-slate-400">
                        {idx === 0 ? 'Baseline' : `Visit ${idx + 1}`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Doctor row */}
                <tr>
                  <th scope="row" className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-200 dark:border-slate-800">
                    Doctor
                  </th>
                  {chosenVisitsInDateOrder.map((v) => (
                    <td key={v.id} className="p-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                      {getDoctorName(v.doctorId)}
                    </td>
                  ))}
                </tr>

                {/* Reason row */}
                <tr>
                  <th scope="row" className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-200 dark:border-slate-800">
                    Reason
                  </th>
                  {chosenVisitsInDateOrder.map((v) => (
                    <td key={v.id} className="p-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                      {v.reason || 'General examination'}
                    </td>
                  ))}
                </tr>

                {/* Blood Pressure row */}
                <tr>
                  <th scope="row" className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-200 dark:border-slate-800">
                    Blood Pressure
                  </th>
                  {chosenVisitsInDateOrder.map((v, idx) => {
                    const prev = idx > 0 ? chosenVisitsInDateOrder[idx - 1] : null;
                    const sysMarker = getVitalMarker(v.vitals?.systolicBp, NORMAL_VITAL_RANGES.systolicBp);
                    const diaMarker = getVitalMarker(v.vitals?.diastolicBp, NORMAL_VITAL_RANGES.diastolicBp);
                    const marker = sysMarker === 'High' || diaMarker === 'High' ? 'High' : (sysMarker === 'Low' || diaMarker === 'Low' ? 'Low' : null);

                    const sysDelta = prev ? formatDelta(v.vitals?.systolicBp, prev.vitals?.systolicBp) : null;
                    const diaDelta = prev ? formatDelta(v.vitals?.diastolicBp, prev.vitals?.diastolicBp) : null;

                    return (
                      <td key={v.id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {v.vitals?.systolicBp ?? '--'}/{v.vitals?.diastolicBp ?? '--'} mmHg
                          {marker && (
                            <span className="ml-1 text-[0.6875rem] font-bold text-rose-600 dark:text-rose-400">
                              {marker}
                            </span>
                          )}
                        </div>
                        {prev && (sysDelta || diaDelta) && (
                          <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                            {sysDelta}/{diaDelta}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Heart Rate row */}
                <tr>
                  <th scope="row" className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-200 dark:border-slate-800">
                    Heart Rate
                  </th>
                  {chosenVisitsInDateOrder.map((v, idx) => {
                    const prev = idx > 0 ? chosenVisitsInDateOrder[idx - 1] : null;
                    const marker = getVitalMarker(v.vitals?.heartRateBpm, NORMAL_VITAL_RANGES.heartRateBpm);
                    const delta = prev ? formatDelta(v.vitals?.heartRateBpm, prev.vitals?.heartRateBpm) : null;

                    return (
                      <td key={v.id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {v.vitals?.heartRateBpm ?? '--'} bpm
                          {marker && (
                            <span className="ml-1 text-[0.6875rem] font-bold text-rose-600 dark:text-rose-400">
                              {marker}
                            </span>
                          )}
                        </div>
                        {prev && delta && (
                          <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                            {delta}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* SpO2 row */}
                <tr>
                  <th scope="row" className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-200 dark:border-slate-800">
                    SpO2
                  </th>
                  {chosenVisitsInDateOrder.map((v, idx) => {
                    const prev = idx > 0 ? chosenVisitsInDateOrder[idx - 1] : null;
                    const marker = getVitalMarker(v.vitals?.oxygenSaturationPct, NORMAL_VITAL_RANGES.oxygenSaturationPct);
                    const delta = prev ? formatDelta(v.vitals?.oxygenSaturationPct, prev.vitals?.oxygenSaturationPct) : null;

                    return (
                      <td key={v.id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {v.vitals?.oxygenSaturationPct ?? '--'}%
                          {marker && (
                            <span className="ml-1 text-[0.6875rem] font-bold text-rose-600 dark:text-rose-400">
                              {marker}
                            </span>
                          )}
                        </div>
                        {prev && delta && (
                          <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                            {delta}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Temperature row */}
                <tr>
                  <th scope="row" className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-200 dark:border-slate-800">
                    Temperature
                  </th>
                  {chosenVisitsInDateOrder.map((v, idx) => {
                    const prev = idx > 0 ? chosenVisitsInDateOrder[idx - 1] : null;
                    const marker = getVitalMarker(v.vitals?.temperatureCelsius, NORMAL_VITAL_RANGES.temperatureCelsius);
                    const delta = prev ? formatDelta(v.vitals?.temperatureCelsius, prev.vitals?.temperatureCelsius, 1) : null;

                    return (
                      <td key={v.id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {v.vitals?.temperatureCelsius ?? '--'} °C
                          {marker && (
                            <span className="ml-1 text-[0.6875rem] font-bold text-rose-600 dark:text-rose-400">
                              {marker}
                            </span>
                          )}
                        </div>
                        {prev && delta && (
                          <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                            {delta}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
            No visits selected. Check at least one visit above to view details.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CompareVisitsModal;

