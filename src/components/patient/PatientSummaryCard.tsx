import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Visit, Doctor, Prescription } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DetailList, DetailItem } from '@/components/ui/DetailList';
import { formatDate } from '@/lib/time';
import { formatDoctorName } from '@/lib/doctorNames';
import { activeMedications } from '@/lib/prescribing';

export interface PatientSummaryCardProps {
  summaryPatient: Patient | null;
  patientVisits: Visit[];
  doctors: Doctor[];
  prescriptions: Prescription[];
  onCompareVisits: () => void;
  isPatientRole?: boolean;
}

const deduplicateList = (items?: (string | null | undefined)[]): string[] => {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
};

export const PatientSummaryCard = React.memo<PatientSummaryCardProps>(({
  summaryPatient,
  patientVisits,
  doctors,
  prescriptions,
  onCompareVisits,
  isPatientRole = false,
}) => {
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');

  useEffect(() => {
    if (patientVisits.length > 0) {
      if (!selectedVisitId || !patientVisits.some((v) => v.id === selectedVisitId)) {
        setSelectedVisitId(patientVisits[0].id);
      }
    } else {
      setSelectedVisitId('');
    }
  }, [patientVisits, selectedVisitId]);

  const currentDisplayedVisit = useMemo(() => {
    if (patientVisits.length === 0) return null;
    return patientVisits.find((v) => v.id === selectedVisitId) || patientVisits[0];
  }, [patientVisits, selectedVisitId]);

  const getConsultingDoctorName = (doctorId: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (doc) return formatDoctorName(doc);
    return doctorId || 'None recorded';
  };

  return (
    <Card className="h-full flex flex-col p-5">
      <CardHeader className="!p-0 mb-4">
        <div className="w-full">
          <CardTitle>Patient Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="!p-0 p-0 flex-1 flex flex-col justify-start">
        <div className="flex-1 flex flex-col justify-start">
          {summaryPatient ? (
            <div className="flex-1 flex flex-col justify-start gap-4">
              {/* Section 1: Previous Visit Record */}
              <div className="py-2.5 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-fs-label font-semibold text-slate-500 dark:text-slate-400 block">
                    Previous visit record
                  </span>
                  {!isPatientRole && patientVisits.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onCompareVisits}
                      className="text-xs h-7 min-h-0 px-2 py-0.5"
                    >
                      Compare visits
                    </Button>
                  )}
                </div>

                {/* Visit Select */}
                <div className="mb-2.5">
                  {patientVisits.length > 0 ? (
                    <Select
                      id="select-patient-visit"
                      label="Visit"
                      value={currentDisplayedVisit?.id || ''}
                      onChange={(e) => setSelectedVisitId(e.target.value)}
                      options={patientVisits.map((v) => {
                        const doc = doctors.find((d) => d.id === v.doctorId);
                        const docName = doc ? formatDoctorName(doc) : v.doctorId;
                        const shortReason =
                          v.reason.length > 26 ? `${v.reason.slice(0, 26)}...` : v.reason;
                        return {
                          value: v.id,
                          label: `${formatDate(v.date)}, ${docName}, ${shortReason}`,
                        };
                      })}
                    />
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400 py-1">
                      No previous visits
                    </div>
                  )}
                </div>

                <DetailList columns={2} className="flex-1" reversed>
                  <DetailItem
                    label="Last Visit"
                    className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                    value={
                      currentDisplayedVisit
                        ? formatDate(currentDisplayedVisit.date)
                        : 'None recorded'
                    }
                  />
                  <DetailItem
                    label="Consulting Doctor"
                    className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                    value={
                      currentDisplayedVisit
                        ? getConsultingDoctorName(currentDisplayedVisit.doctorId)
                        : 'None recorded'
                    }
                  />
                  {currentDisplayedVisit?.vitals && (
                    <DetailItem
                      label="Blood Pressure"
                      className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                      value={`${currentDisplayedVisit.vitals.systolicBp ?? '--'}/${currentDisplayedVisit.vitals.diastolicBp ?? '--'} mmHg`}
                    />
                  )}
                  {currentDisplayedVisit?.vitals && (
                    <DetailItem
                      label="Heart Rate"
                      className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                      value={`${currentDisplayedVisit.vitals.heartRateBpm ?? '--'} bpm`}
                    />
                  )}
                  {currentDisplayedVisit?.vitals && (
                    <DetailItem
                      label="SpO2"
                      className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                      value={`${currentDisplayedVisit.vitals.oxygenSaturationPct ?? '--'}%`}
                    />
                  )}
                  {currentDisplayedVisit?.vitals && (
                    <DetailItem
                      label="Temperature"
                      className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                      value={`${currentDisplayedVisit.vitals.temperatureCelsius ?? '--'} °C`}
                    />
                  )}
                </DetailList>
                <DetailList
                  reversed
                  className={`flex-1 ${currentDisplayedVisit?.vitals ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
                >
                  {!currentDisplayedVisit?.vitals && (
                    <DetailItem
                      label="Vitals"
                      className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                      value="None recorded"
                    />
                  )}
                  <DetailItem
                    label="Last Reason"
                    className="!grid-cols-[auto_1fr] sm:!grid-cols-[auto_1fr] !px-2.5 gap-2"
                    value={currentDisplayedVisit?.reason || 'None recorded'}
                  />
                </DetailList>
              </div>

              {/* Section 2: Clinical Profile */}
              <div className="py-2.5 flex flex-col">
                <span className="text-fs-label font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Clinical profile
                </span>
                <DetailList className="flex-1" reversed>
                  <DetailItem
                    label="Chronic Conditions"
                    value={
                      summaryPatient.chronicConditions && summaryPatient.chronicConditions.length > 0
                        ? deduplicateList(summaryPatient.chronicConditions).join(', ')
                        : 'None recorded'
                    }
                  />
                  <DetailItem
                    label="Current Medications"
                    value={(() => {
                      const activeMeds = activeMedications(summaryPatient.id, prescriptions, new Date());
                      if (activeMeds.length > 0) return activeMeds.join(', ');
                      return 'None recorded';
                    })()}
                  />
                </DetailList>
              </div>

              {/* Section 3: Demographics & Primary Care */}
              <div className="py-2.5 flex flex-col">
                <span className="text-fs-label font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Demographics & primary care
                </span>
                <DetailList className="flex-1" reversed>
                  <DetailItem
                    label="Phone"
                    value={summaryPatient.phone || 'None recorded'}
                  />
                  {summaryPatient.emergencyContact && summaryPatient.emergencyContact.name && (
                    <DetailItem
                      label="Emergency Contact"
                      value={
                        <div>
                          <div>
                            {summaryPatient.emergencyContact.name} ({summaryPatient.emergencyContact.relationship || 'Contact'})
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-fs-body mt-0.5">
                            {summaryPatient.emergencyContact.phone}
                          </div>
                        </div>
                      }
                    />
                  )}
                </DetailList>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
              No active consultation
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

PatientSummaryCard.displayName = 'PatientSummaryCard';

