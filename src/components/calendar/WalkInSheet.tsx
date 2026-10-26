import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Doctor } from '@/types';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, ColumnDef } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { walkInBuckets, waitStats, getWalkInWaitMinutes } from '@/lib/calendar';
import { formatDoctorName } from '@/lib/doctorNames';

export interface WalkInSheetProps {
  appointments: Appointment[];
  doctors: Doctor[];
  todayStr: string;
  onOpenWalkInModal: () => void;
}

export const WalkInSheet: React.FC<WalkInSheetProps> = ({
  appointments,
  doctors,
  todayStr,
  onOpenWalkInModal,
}) => {
  // Real-time ticker so wait times for patients still waiting increment live without animation
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [sheetDate, setSheetDate] = useState<string>(todayStr);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Active doctors for grid columns
  const activeDoctors = useMemo(() => {
    const active = doctors.filter((d) => d.status === 'active');
    return active.length > 0 ? active : doctors;
  }, [doctors]);

  // Wait stats from engine
  const stats = useMemo(() => {
    return waitStats(sheetDate, appointments, now);
  }, [sheetDate, appointments, now]);

  // One-hour walk-in buckets for the time grid
  const buckets = useMemo(() => {
    return walkInBuckets(sheetDate, appointments, 60);
  }, [sheetDate, appointments]);

  // Filtered walk-in appointments for the table
  const dayWalkIns = useMemo(() => {
    return appointments
      .filter((a) => {
        if (a.source !== 'walk_in') return false;
        const checkInDate = (a.checkedInAt || a.dateTime || '').slice(0, 10);
        return checkInDate === sheetDate;
      })
      .sort((a, b) => {
        const timeA = (a.checkedInAt || a.dateTime || '').slice(11, 16);
        const timeB = (b.checkedInAt || b.dateTime || '').slice(11, 16);
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return (a.tokenNumber || 0) - (b.tokenNumber || 0);
      });
  }, [sheetDate, appointments]);

  // Paginated walk-ins
  const paginatedWalkIns = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dayWalkIns.slice(startIndex, startIndex + pageSize);
  }, [dayWalkIns, currentPage, pageSize]);

  // Format appointment status text
  const formatStatus = (status: string): string => {
    if (status === 'checked_in') return 'Waiting';
    if (status === 'in_consultation') return 'In Consultation';
    if (status === 'completed') return 'Completed';
    return status.replace(/_/g, ' ');
  };

  // Table columns: Time, Token, Patient, Doctor, Reason, Status, Checked in by, Wait (min)
  const columns: ColumnDef<Appointment>[] = [
    {
      key: 'time',
      header: 'Time',
      priority: 1,
      minWidthRem: 5,
      render: (apt) => {
        const timeStr = (apt.checkedInAt || apt.dateTime || '').slice(11, 16);
        return (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {timeStr || '—'}
          </span>
        );
      },
    },
    {
      key: 'token',
      header: 'Token',
      priority: 1,
      minWidthRem: 4.5,
      render: (apt) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          #{apt.tokenNumber || '—'}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      priority: 1,
      isPrimary: true,
      minWidthRem: 10,
      render: (apt) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {apt.patientName}
        </span>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      priority: 2,
      minWidthRem: 10,
      render: (apt) => {
        const doc = doctors.find((d) => d.id === apt.doctorId);
        return (
          <span className="text-slate-700 dark:text-slate-300">
            {doc ? formatDoctorName(doc) : apt.doctorName || 'Assigned Physician'}
          </span>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      priority: 3,
      minWidthRem: 10,
      render: (apt) => (
        <span className="text-slate-600 dark:text-slate-400">
          {apt.reasonForVisit || 'General Consultation'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      priority: 1,
      minWidthRem: 7,
      render: (apt) => (
        <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
          {formatStatus(apt.status)}
        </span>
      ),
    },
    {
      key: 'checkedInBy',
      header: 'Checked in by',
      priority: 4,
      minWidthRem: 8,
      render: (apt) => (
        <span className="text-slate-600 dark:text-slate-400">
          {apt.checkedInBy?.name || 'Reception Desk'}
        </span>
      ),
    },
    {
      key: 'wait',
      header: 'Wait (min)',
      priority: 1,
      align: 'right',
      minWidthRem: 5.5,
      render: (apt) => {
        const wait = getWalkInWaitMinutes(apt, now);
        return (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {wait} min
          </span>
        );
      },
    },
  ];

  const summaryLine = `${stats.count} walk-in${stats.count === 1 ? '' : 's'}, average wait ${stats.average} min, longest ${stats.longest} min`;

  return (
    <div className="space-y-4">
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={onOpenWalkInModal}>
            Walk-in Check-In
          </Button>
          <div className="w-44">
            <DatePicker
              value={sheetDate}
              onChange={(d) => {
                setSheetDate(d);
                setCurrentPage(1);
              }}
              maxDate={todayStr}
            />
          </div>
        </div>

        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {summaryLine}
        </div>
      </div>

      {/* TIME GRID (DESKTOP/TABLET, hidden under 40rem / 640px) */}
      <div className="hidden sm:block border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-x-auto shadow-sm max-h-[60vh] overflow-y-auto">
        <table className="w-full border-collapse table-fixed text-left">
          <thead>
            <tr className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-10 border-b border-slate-200 dark:border-slate-700">
              <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 w-28 p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                Time Bucket
              </th>
              {activeDoctors.map((doc) => (
                <th
                  key={doc.id}
                  className="p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 truncate"
                >
                  <div>{doc.name}</div>
                  <div className="text-[0.6875rem] font-normal text-slate-500 dark:text-slate-400 truncate">
                    {doc.specialization}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {buckets.map((bucket) => (
              <tr key={bucket.time} className="min-h-[2.75rem] h-auto">
                <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 w-28 p-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap align-top">
                  {bucket.label}
                </td>
                {activeDoctors.map((doc) => {
                  const docWalkIns = bucket.byDoctor[doc.id] || [];
                  return (
                    <td
                      key={doc.id}
                      className="p-2 border-r border-slate-100 dark:border-slate-800 align-top text-xs"
                    >
                      {docWalkIns.length === 0 ? (
                        <div className="text-slate-400 dark:text-slate-600">—</div>
                      ) : (
                        <div className="space-y-1">
                          {docWalkIns.map((apt) => (
                            <div
                              key={apt.id}
                              className="text-xs text-slate-800 dark:text-slate-200 truncate font-medium"
                            >
                              #{apt.tokenNumber} {apt.patientName}, {formatStatus(apt.status)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TABLE BELOW (Shared Table, 10 per page, stack mode on phones) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Walk-in Records ({dayWalkIns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            stackBelow="sm"
            columns={columns}
            data={paginatedWalkIns}
            keyExtractor={(item) => item.id}
            emptyMessage={
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No walk-in patients recorded for this date.
              </div>
            }
          />
          {dayWalkIns.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={dayWalkIns.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

