import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';
import { useAttendance } from '@/context/AttendanceContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select, SelectOption } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { INITIAL_PENDING_APPROVALS, DEMO_USERS } from '@/data/mockData';
import { getRepository } from '@/data/storage';
import { ClaimRequest } from '@/types/storage';
import {
  isAdmin,
  hasCapability,
} from '@/lib/permissions';
import {
  canViewWidget,
} from '@/lib/dashboardWidgets';
import {
  calculateDashboardMetrics,
  calculateDailySummary,
  generateDailySummaryCsv,
  DateRangePreset,
  ChartBucketType,
  formatCurrency,
  toLocalDateKey,
  PatientsAndVisitsBucket,
  FeesAndPaymentsBucket,
} from '@/lib/dashboardMetrics';

interface DashboardViewProps {
  onNavigate?: (tab: string, subTab?: string) => void;
}

const DATE_RANGE_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30_days', label: 'Last 30 days' },
];

const formatStatusText = (status: string): string => {
  switch (status) {
    case 'in_consultation':
      return 'In Consultation';
    case 'checked_in':
      return 'Checked In';
    case 'scheduled':
      return 'Scheduled';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'no_show':
      return 'No Show';
    default:
      return status.replace(/_/g, ' ');
  }
};

const getGreeting = (name: string): string => {
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 18) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 18 || hour < 4) {
    timeGreeting = 'Good evening';
  }
  return `${timeGreeting}, ${name}`;
};

// Grouped bar chart component for Patients and Visits
interface PatientsAndVisitsChartProps {
  buckets: PatientsAndVisitsBucket[];
  activeBucket: ChartBucketType;
  onBucketChange: (bucket: ChartBucketType) => void;
}

const PatientsAndVisitsChart: React.FC<PatientsAndVisitsChartProps> = ({
  buckets,
  activeBucket,
  onBucketChange,
}) => {
  const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.newPatients, b.visits)));
  const yCeiling = maxVal <= 4 ? 4 : maxVal <= 8 ? 8 : maxVal <= 12 ? 12 : Math.ceil(maxVal / 5) * 5;
  const gridTicks = [0, yCeiling * 0.25, yCeiling * 0.5, yCeiling * 0.75, yCeiling];

  const n = buckets.length;
  const slotWidth = n > 0 ? 520 / n : 520;
  const barWidth = Math.max(3, Math.min(16, (slotWidth - 6) / 2));

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Patients and Visits
          </h3>
          <div className="flex items-center gap-4">
            {(['day', 'week', 'month'] as ChartBucketType[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onBucketChange(b)}
                className={`pb-1 text-xs font-semibold cursor-pointer border-b-2 transition-none ${
                  activeBucket === b
                    ? 'text-teal-700 dark:text-teal-400 border-teal-600 dark:border-teal-500'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
                }`}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <svg
            role="img"
            aria-label="Grouped bar chart showing new patients and visits"
            viewBox="0 0 600 240"
            className="w-full h-56 sm:h-64"
          >
            <defs>
              <pattern
                id="bar-hatch"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="var(--chart-hatch-rect)" fillOpacity="0.35" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-hatch-line)" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Gridlines and Y-axis ticks */}
            {gridTicks.map((tick) => {
              const y = 20 + 175 - (tick / yCeiling) * 175;
              return (
                <g key={tick}>
                  <line
                    x1={45}
                    y1={y}
                    x2={580}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={38}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[0.625rem] fill-slate-500 dark:fill-slate-400"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {buckets.map((b, i) => {
              const slotCenterX = 45 + (i + 0.5) * slotWidth;
              const x1 = slotCenterX - barWidth - 1;
              const h1 = Math.max(0, (b.newPatients / yCeiling) * 175);
              const y1 = 20 + 175 - h1;

              const x2 = slotCenterX + 1;
              const h2 = Math.max(0, (b.visits / yCeiling) * 175);
              const y2 = 20 + 175 - h2;

              const showLabel =
                n <= 10 ||
                (n <= 20 && i % 2 === 0) ||
                (n > 20 && (i % 5 === 0 || i === n - 1));

              return (
                <g key={b.dateKey}>
                  {/* New Patients Bar */}
                  <rect
                    x={x1}
                    y={y1}
                    width={barWidth}
                    height={h1}
                    className="fill-teal-600 dark:fill-teal-500"
                  >
                    <title>{`${b.label}: ${b.newPatients} new patients`}</title>
                  </rect>
                  {/* Visits Bar */}
                  <rect
                    x={x2}
                    y={y2}
                    width={barWidth}
                    height={h2}
                    fill="url(#bar-hatch)"
                    stroke="var(--chart-hatch-line)"
                    strokeWidth="0.5"
                  >
                    <title>{`${b.label}: ${b.visits} visits`}</title>
                  </rect>
                  {/* X-axis label */}
                  {showLabel && (
                    <text
                      x={slotCenterX}
                      y={215}
                      textAnchor="middle"
                      className={`text-[0.625rem] fill-slate-500 dark:fill-slate-400 ${
                        i % 2 !== 0 && n > 6 ? 'hidden sm:inline' : ''
                      }`}
                    >
                      {b.label}
                    </text>
                  )}
                </g>
              );
            })}

            {n === 0 && (
              <text x={300} y={120} textAnchor="middle" className="text-xs fill-slate-400">
                No data available for this range
              </text>
            )}
          </svg>

          {/* Visually hidden screen reader table */}
          <div className="sr-only">
            <table>
              <caption>Patients and visits data</caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">New Patients</th>
                  <th scope="col">Visits</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.dateKey}>
                    <td>{b.label}</td>
                    <td>{b.newPatients}</td>
                    <td>{b.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Static Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-teal-600 dark:bg-teal-500 inline-block" />
          <span>New Patients</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 border border-slate-500 dark:border-slate-400 inline-block chart-hatch-legend"
          />
          <span>Visits</span>
        </div>
      </div>
    </Card>
  );
};

// Line chart component for Fees and Payments
interface FeesAndPaymentsChartProps {
  buckets: FeesAndPaymentsBucket[];
  activeBucket: ChartBucketType;
  onBucketChange: (bucket: ChartBucketType) => void;
}

const FeesAndPaymentsChart: React.FC<FeesAndPaymentsChartProps> = ({
  buckets,
  activeBucket,
  onBucketChange,
}) => {
  const maxVal = Math.max(50, ...buckets.map((b) => Math.max(b.billed, b.collected)));
  const yCeiling =
    maxVal <= 100
      ? 100
      : maxVal <= 500
      ? 500
      : maxVal <= 1000
      ? 1000
      : maxVal <= 2500
      ? 2500
      : Math.ceil(maxVal / 500) * 500;
  const gridTicks = [0, yCeiling * 0.25, yCeiling * 0.5, yCeiling * 0.75, yCeiling];

  const n = buckets.length;
  const plotWidth = 515;
  const calcX = (i: number) => 55 + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const calcY = (val: number) => 20 + 175 - Math.min(175, (val / yCeiling) * 175);

  const billedPoints = buckets.map((b, i) => `${calcX(i)},${calcY(b.billed)}`).join(' ');
  const collectedPoints = buckets.map((b, i) => `${calcX(i)},${calcY(b.collected)}`).join(' ');

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Fees and Payments
          </h3>
          <div className="flex items-center gap-4">
            {(['day', 'week', 'month'] as ChartBucketType[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onBucketChange(b)}
                className={`pb-1 text-xs font-semibold cursor-pointer border-b-2 transition-none ${
                  activeBucket === b
                    ? 'text-teal-700 dark:text-teal-400 border-teal-600 dark:border-teal-500'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
                }`}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <svg
            role="img"
            aria-label="Line chart showing fees billed and payments collected"
            viewBox="0 0 600 240"
            className="w-full h-56 sm:h-64"
          >
            {/* Gridlines and Y-axis ticks */}
            {gridTicks.map((tick) => {
              const y = 20 + 175 - (tick / yCeiling) * 175;
              return (
                <g key={tick}>
                  <line
                    x1={55}
                    y1={y}
                    x2={580}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={48}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[0.625rem] fill-slate-500 dark:fill-slate-400"
                  >
                    ${tick}
                  </text>
                </g>
              );
            })}

            {/* Billed line (solid teal) */}
            {n > 1 && (
              <polyline
                points={billedPoints}
                fill="none"
                stroke="var(--chart-primary)"
                strokeWidth="2"
              />
            )}

            {/* Collected line (dashed slate) */}
            {n > 1 && (
              <polyline
                points={collectedPoints}
                fill="none"
                stroke="var(--chart-secondary)"
                strokeWidth="2"
                strokeDasharray="5,4"
              />
            )}

            {/* Data points */}
            {buckets.map((b, i) => {
              const x = calcX(i);
              const yBilled = calcY(b.billed);
              const yCollected = calcY(b.collected);

              const showLabel =
                n <= 10 ||
                (n <= 20 && i % 2 === 0) ||
                (n > 20 && (i % 5 === 0 || i === n - 1));

              return (
                <g key={b.dateKey}>
                  <circle cx={x} cy={yBilled} r="3" fill="var(--chart-primary)">
                    <title>{`${b.label} - Billed: ${formatCurrency(b.billed * 100)}`}</title>
                  </circle>
                  <rect x={x - 3} y={yCollected - 3} width="6" height="6" fill="var(--chart-secondary)">
                    <title>{`${b.label} - Collected: ${formatCurrency(b.collected * 100)}`}</title>
                  </rect>
                  {showLabel && (
                    <text
                      x={x}
                      y={215}
                      textAnchor="middle"
                      className={`text-[0.625rem] fill-slate-500 dark:fill-slate-400 ${
                        i % 2 !== 0 && n > 6 ? 'hidden sm:inline' : ''
                      }`}
                    >
                      {b.label}
                    </text>
                  )}
                </g>
              );
            })}

            {n === 0 && (
              <text x={300} y={120} textAnchor="middle" className="text-xs fill-slate-400">
                No fee records for this range
              </text>
            )}
          </svg>

          {/* Visually hidden screen reader table */}
          <div className="sr-only">
            <table>
              <caption>Fees and payments data</caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Billed</th>
                  <th scope="col">Collected</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.dateKey}>
                    <td>{b.label}</td>
                    <td>{formatCurrency(b.billed * 100)}</td>
                    <td>{formatCurrency(b.collected * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Static Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-teal-600 dark:bg-teal-500 inline-block" />
          <span>Billed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-500 dark:border-slate-400 inline-block" />
          <span>Collected</span>
        </div>
      </div>
    </Card>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const {
    patients,
    appointments,
    prescriptions,
    doctors,
    patientAssignments = [],
    modules,
    updateAppointmentStatus,
  } = useClinic();
  const { invoices: billingInvoices, payments: billingPayments } = useBilling();
  const {
    shifts,
    records: attendanceRecords,
    leaveRequests,
    clockInUser,
    clockOutUser,
  } = useAttendance();

  // Navigation tab state: "overview" or "daily_summary"
  const [activeTab, setActiveTab] = useState<'overview' | 'daily_summary'>('overview');

  // Overview date range & buckets
  const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');
  const [chartBucket1, setChartBucket1] = useState<ChartBucketType>('day');
  const [chartBucket2, setChartBucket2] = useState<ChartBucketType>('day');

  // Daily Summary date picker
  const [dailySummaryDate, setDailySummaryDate] = useState<string>(() => toLocalDateKey(new Date()));

  // Pagination states
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [patientUpcomingPage, setPatientUpcomingPage] = useState(1);
  const [patientRxPage, setPatientRxPage] = useState(1);

  // Claim requests from repository for Needs Attention
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  React.useEffect(() => {
    let isMounted = true;
    getRepository<ClaimRequest>('claimRequests')
      .list()
      .then((items) => {
        if (isMounted) setClaimRequests(items);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Clock Out confirm modal state
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState<string | null>(null);

  // User accesses
  const userIsAdmin = isAdmin(currentUser, modules);
  const hasConsult = hasCapability(currentUser, 'consultationWorkstation', modules);
  const hasCheckIn = hasCapability(currentUser, 'patientCheckIn', modules);
  const hasBilling = hasCapability(currentUser, 'paymentRecording', modules) || userIsAdmin;
  const isPatient = currentUser?.role === 'patient';

  // Compute metrics for Chart 1
  const metrics1 = useMemo(() => {
    return calculateDashboardMetrics({
      patients,
      appointments,
      invoices: billingInvoices,
      payments: billingPayments,
      prescriptions,
      doctors,
      users: Object.values(DEMO_USERS),
      pendingClearances: INITIAL_PENDING_APPROVALS,
      claimRequests,
      shifts,
      attendanceRecords,
      leaves: leaveRequests,
      currentUser,
      patientAssignments,
      modules,
      dateRange,
      chartBucket: chartBucket1,
      now: new Date(),
    });
  }, [
    patients,
    appointments,
    billingInvoices,
    billingPayments,
    prescriptions,
    doctors,
    claimRequests,
    shifts,
    attendanceRecords,
    leaveRequests,
    currentUser,
    patientAssignments,
    modules,
    dateRange,
    chartBucket1,
  ]);

  // Compute metrics for Chart 2
  const metrics2 = useMemo(() => {
    if (chartBucket1 === chartBucket2) {
      return metrics1;
    }
    return calculateDashboardMetrics({
      patients,
      appointments,
      invoices: billingInvoices,
      payments: billingPayments,
      prescriptions,
      doctors,
      users: Object.values(DEMO_USERS),
      pendingClearances: INITIAL_PENDING_APPROVALS,
      claimRequests,
      shifts,
      attendanceRecords,
      leaves: leaveRequests,
      currentUser,
      patientAssignments,
      modules,
      dateRange,
      chartBucket: chartBucket2,
      now: new Date(),
    });
  }, [
    chartBucket1,
    chartBucket2,
    metrics1,
    patients,
    appointments,
    billingInvoices,
    billingPayments,
    prescriptions,
    doctors,
    claimRequests,
    shifts,
    attendanceRecords,
    leaveRequests,
    currentUser,
    patientAssignments,
    modules,
    dateRange,
  ]);

  // Compute Daily Summary data
  const dailySummaryData = useMemo(() => {
    return calculateDailySummary({
      user: currentUser,
      targetDate: dailySummaryDate,
      now: new Date(),
      patients,
      appointments,
      invoices: billingInvoices,
      payments: billingPayments,
      prescriptions,
      doctors,
      users: Object.values(DEMO_USERS),
      shifts,
      attendanceRecords,
      leaves: leaveRequests,
      modules,
    });
  }, [
    currentUser,
    dailySummaryDate,
    patients,
    appointments,
    billingInvoices,
    billingPayments,
    prescriptions,
    doctors,
    shifts,
    attendanceRecords,
    leaveRequests,
    modules,
  ]);

  // Check if user qualifies for Daily Summary tab
  const qualifiesForDailySummary = useMemo(() => {
    if (isPatient) return false;
    return Boolean(
      dailySummaryData.patients ||
      dailySummaryData.byDoctor ||
      dailySummaryData.byReceptionist ||
      dailySummaryData.collections ||
      dailySummaryData.attendance
    );
  }, [isPatient, dailySummaryData]);

  // Handlers for Clock In / Clock Out
  const handleClockInAction = () => {
    const res = clockInUser();
    if (res.success) {
      setAttendanceMessage('Clock in recorded successfully.');
    } else {
      setAttendanceMessage(res.error || 'Failed to record clock in.');
    }
    setTimeout(() => setAttendanceMessage(null), 4000);
  };

  const handleConfirmClockOut = () => {
    setIsClockOutModalOpen(false);
    const res = clockOutUser();
    if (res.success) {
      setAttendanceMessage('Clock out recorded successfully.');
    } else {
      setAttendanceMessage(res.error || 'Failed to record clock out.');
    }
    setTimeout(() => setAttendanceMessage(null), 4000);
  };

  // CSV Export handler
  const handleExportCsv = () => {
    const csvContent = generateDailySummaryCsv(dailySummaryData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `daily-summary-${dailySummaryDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Paginated records
  const paginatedAppointments = useMemo(() => {
    const list = metrics1.todayAppointments;
    const start = (appointmentsPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.todayAppointments, appointmentsPage]);

  const paginatedPatientAppointments = useMemo(() => {
    const list = metrics1.patientUpcomingAppointments || [];
    const start = (patientUpcomingPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.patientUpcomingAppointments, patientUpcomingPage]);

  const paginatedPatientRx = useMemo(() => {
    const list = metrics1.patientRecentPrescriptions || [];
    const start = (patientRxPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.patientRecentPrescriptions, patientRxPage]);

  const greeting = getGreeting(currentUser?.name || 'User');

  return (
    <div className="space-y-6 pb-8">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #daily-summary-print-area,
          #daily-summary-print-area * {
            visibility: visible;
          }
          #daily-summary-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header: Greeting & Date Range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {greeting}
          </h1>
        </div>

        {/* Date Range Selector (Overview tab only) */}
        {activeTab === 'overview' && !isPatient && (
          <div className="w-full sm:w-48 shrink-0">
            <Select
              value={dateRange}
              options={DATE_RANGE_OPTIONS}
              onChange={(e) => {
                setDateRange(e.target.value as DateRangePreset);
                setAppointmentsPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Attendance Notification Banner */}
      {attendanceMessage && (
        <div role="status" aria-live="polite" className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs text-teal-800 dark:text-teal-300 no-print">
          {attendanceMessage}
        </div>
      )}

      {/* Navigation Tabs: Overview & Daily Summary */}
      {qualifiesForDailySummary && (
        <div className="border-b border-slate-200 dark:border-slate-800 no-print">
          <div role="tablist" aria-label="Dashboard Tabs" className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              role="tab"
              aria-selected={activeTab === 'overview'}
              aria-current={activeTab === 'overview' ? 'page' : undefined}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-none cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-300 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily_summary')}
              role="tab"
              aria-selected={activeTab === 'daily_summary'}
              aria-current={activeTab === 'daily_summary' ? 'page' : undefined}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-none cursor-pointer ${
                activeTab === 'daily_summary'
                  ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-300 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Daily Summary
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW                                                */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Figures: One outlined card with standard 4-col / 2-col grid */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
            {metrics1.summaryFigures.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No summary metrics configured for this account.
              </p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics1.summaryFigures.map((fig) => (
                  <div key={fig.label} className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {fig.formattedValue ?? fig.value}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                      {fig.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Front Desk Today Operational Widget */}
          {canViewWidget('front_desk_today', currentUser, modules) && metrics1.frontDeskToday && (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="pb-3 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Front Desk Today
                </h3>
                <span className="text-xs text-slate-500 font-medium">Operational Status</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {metrics1.frontDeskToday.waiting}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Waiting</p>
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {metrics1.frontDeskToday.inConsultation}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">In Consultation</p>
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {metrics1.frontDeskToday.bookedToday}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Booked Today</p>
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {metrics1.frontDeskToday.checkedInToday}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Checked In Today</p>
                </div>
              </div>
              {metrics1.frontDeskToday.outstandingNow && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Total Outstanding Balance:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {metrics1.frontDeskToday.outstandingNow}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Charts Row: Stack below 1024px. Rendered only when user qualifies */}
          {!isPatient && (userIsAdmin || hasConsult || hasBilling) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(userIsAdmin || hasConsult) && (
                <PatientsAndVisitsChart
                  buckets={metrics1.patientsAndVisits}
                  activeBucket={chartBucket1}
                  onBucketChange={setChartBucket1}
                />
              )}

              {hasBilling && (
                <FeesAndPaymentsChart
                  buckets={metrics2.feesAndPayments || []}
                  activeBucket={chartBucket2}
                  onBucketChange={setChartBucket2}
                />
              )}
            </div>
          )}

          {/* Lists & Operational Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List 1: Today's Appointments */}
            {canViewWidget('today_appointments', currentUser, modules) && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Today&apos;s Appointments
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {metrics1.todayAppointments.length}
                    </span>
                  </div>
                  <div className="p-3 sm:p-0">
                    <Table stackBelow="md">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-2/12 min-w-[80px]">Time</TableHead>
                          <TableHead className="w-4/12 min-w-[130px]">Patient</TableHead>
                          <TableHead className="w-3/12 min-w-[120px]">Doctor</TableHead>
                          <TableHead className="w-3/12 min-w-[90px]">Status</TableHead>
                          {hasCheckIn && (
                            <TableHead className="w-2/12 min-w-[90px] text-right">Action</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAppointments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={hasCheckIn ? 5 : 4} className="py-6 text-center text-slate-500">
                              No appointments scheduled today
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedAppointments.map((apt) => (
                            <TableRow key={apt.id}>
                              <TableCell label="Time" className="w-2/12 min-w-[80px] text-slate-600 dark:text-slate-300">
                                {apt.time}
                              </TableCell>
                              <TableCell label="Patient" className="w-4/12 min-w-[130px] font-medium text-slate-900 dark:text-slate-100">
                                {apt.patientName}
                              </TableCell>
                              <TableCell label="Doctor" className="w-3/12 min-w-[120px] text-slate-600 dark:text-slate-300">
                                {apt.doctorName}
                              </TableCell>
                              <TableCell label="Status" className="w-3/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {formatStatusText(apt.status)}
                              </TableCell>
                              {hasCheckIn && (
                                <TableCell label="Action" fullWidthOnStack className="w-2/12 min-w-[90px] text-right whitespace-nowrap">
                                  {apt.status === 'scheduled' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateAppointmentStatus(apt.id, 'checked_in')}
                                    >
                                      Check In
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400">---</span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {metrics1.todayAppointments.length > 10 && (
                  <Pagination
                    currentPage={appointmentsPage}
                    totalItems={metrics1.todayAppointments.length}
                    pageSize={10}
                    onPageChange={setAppointmentsPage}
                  />
                )}
              </Card>
            )}

            {/* List 2: Needs Attention List */}
            {canViewWidget('needs_attention', currentUser, modules) && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Needs Attention
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">Action Items</span>
                  </div>
                  <div className="p-3 sm:p-0">
                    <Table stackBelow="md">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-6/12 min-w-[180px]">Item</TableHead>
                          <TableHead className="w-3/12 min-w-[90px]">Count</TableHead>
                          <TableHead className="w-3/12 min-w-[100px] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics1.needsAttention.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                              Nothing needs attention.
                            </TableCell>
                          </TableRow>
                        ) : (
                          metrics1.needsAttention.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell label="Item" className="w-6/12 min-w-[180px] font-medium text-slate-900 dark:text-slate-100">
                                {item.label}
                              </TableCell>
                              <TableCell label="Count" className="w-3/12 min-w-[90px] text-slate-600 dark:text-slate-300 font-semibold">
                                {item.count}
                              </TableCell>
                              <TableCell label="Action" fullWidthOnStack className="w-3/12 min-w-[100px] text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onNavigate?.(item.navigateTab, item.navigateSubTab)}
                                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 cursor-pointer"
                                >
                                  Review
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            )}

            {/* List 3: Staff Presence Widget */}
            {canViewWidget('staff_presence', currentUser, modules) && metrics1.staffPresence && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Staff Presence
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">Today</span>
                  </div>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {metrics1.staffPresence.summaryText}
                  </div>
                  <div className="p-3 sm:p-0">
                    <Table stackBelow="md">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-5/12 min-w-[140px]">Name</TableHead>
                          <TableHead className="w-3/12 min-w-[100px]">Shift Start</TableHead>
                          <TableHead className="w-4/12 min-w-[130px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics1.staffPresence.lateOrNotList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                              All scheduled staff have arrived on time.
                            </TableCell>
                          </TableRow>
                        ) : (
                          metrics1.staffPresence.lateOrNotList.map((st) => (
                            <TableRow key={st.staffId}>
                              <TableCell label="Name" className="w-5/12 min-w-[140px] font-medium text-slate-900 dark:text-slate-100">
                                {st.name}
                              </TableCell>
                              <TableCell label="Shift Start" className="w-3/12 min-w-[100px] text-slate-600 dark:text-slate-300">
                                {st.shiftStart}
                              </TableCell>
                              <TableCell label="Status" className="w-4/12 min-w-[130px] text-slate-600 dark:text-slate-300">
                                {st.status}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            )}

            {/* List 4: My Attendance Widget (Every Staff Account) */}
            {!isPatient && metrics1.myAttendance && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      My Attendance
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">Today</span>
                  </div>
                  <div className="py-4 space-y-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {metrics1.myAttendance.statusText}
                    </p>
                    {metrics1.myAttendance.hasShiftToday && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Scheduled Shift: {metrics1.myAttendance.shiftStart} - {metrics1.myAttendance.shiftEnd}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  {!metrics1.myAttendance.isClockedIn ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClockInAction}
                    >
                      Clock In
                    </Button>
                  ) : !metrics1.myAttendance.isClockedOut ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsClockOutModalOpen(true)}
                    >
                      Clock Out
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">Day duty completed</span>
                  )}
                </div>
              </Card>
            )}

            {/* Patient Dashboard Specific Lists */}
            {isPatient && (
              <>
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Upcoming Consultations
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {metrics1.patientUpcomingAppointments?.length || 0}
                      </span>
                    </div>
                    <div className="p-3 sm:p-0">
                      <Table stackBelow="md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-3/12 min-w-[90px]">Date</TableHead>
                            <TableHead className="w-2/12 min-w-[80px]">Time</TableHead>
                            <TableHead className="w-4/12 min-w-[120px]">Doctor</TableHead>
                            <TableHead className="w-3/12 min-w-[90px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPatientAppointments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                                No upcoming appointments scheduled.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedPatientAppointments.map((apt) => (
                              <TableRow key={apt.id}>
                                <TableCell label="Date" className="w-3/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                  {apt.date}
                                </TableCell>
                                <TableCell label="Time" className="w-2/12 min-w-[80px] text-slate-600 dark:text-slate-300">
                                  {apt.time}
                                </TableCell>
                                <TableCell label="Doctor" className="w-4/12 min-w-[120px] font-medium text-slate-900 dark:text-slate-100">
                                  {apt.doctorName}
                                </TableCell>
                                <TableCell label="Status" className="w-3/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                  {formatStatusText(apt.status)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {(metrics1.patientUpcomingAppointments?.length || 0) > 10 && (
                    <Pagination
                      currentPage={patientUpcomingPage}
                      totalItems={metrics1.patientUpcomingAppointments?.length || 0}
                      pageSize={10}
                      onPageChange={setPatientUpcomingPage}
                    />
                  )}
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Recent Prescriptions
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {metrics1.patientRecentPrescriptions?.length || 0}
                      </span>
                    </div>
                    <div className="p-3 sm:p-0">
                      <Table stackBelow="md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-3/12 min-w-[90px]">Date</TableHead>
                            <TableHead className="w-5/12 min-w-[140px]">Medication</TableHead>
                            <TableHead className="w-4/12 min-w-[110px]">Doctor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPatientRx.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                                No prescriptions on record.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedPatientRx.map((rx) => (
                              <TableRow key={rx.id}>
                                <TableCell label="Date" className="w-3/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                  {rx.date}
                                </TableCell>
                                <TableCell label="Medication" className="w-5/12 min-w-[140px] font-medium text-slate-900 dark:text-slate-100">
                                  {rx.medications}
                                </TableCell>
                                <TableCell label="Doctor" className="w-4/12 min-w-[110px] text-slate-600 dark:text-slate-300">
                                  {rx.doctorName}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {(metrics1.patientRecentPrescriptions?.length || 0) > 10 && (
                    <Pagination
                      currentPage={patientRxPage}
                      totalItems={metrics1.patientRecentPrescriptions?.length || 0}
                      pageSize={10}
                      onPageChange={setPatientRxPage}
                    />
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DAILY SUMMARY                                           */}
      {/* ============================================================== */}
      {activeTab === 'daily_summary' && (
        <div className="space-y-6">
          {/* Daily Summary Toolbar: DatePicker, Print Button, Export CSV Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl no-print">
            <div className="flex items-center gap-3">
              <label htmlFor="daily-summary-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Summary Date:
              </label>
              <div className="w-44">
                <DatePicker
                  value={dailySummaryDate}
                  onChange={(val) => setDailySummaryDate(val)}
                  maxDate={toLocalDateKey(new Date())}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Printable Container */}
          <div id="daily-summary-print-area" className="space-y-6">
            {/* Header for print / screen */}
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Beacon Health Clinic - Daily Summary
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {dailySummaryData.formattedDate} ({dailySummaryData.date})
              </p>
            </div>

            {!dailySummaryData.hasActivity ? (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
                No activity on this date.
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Section 1: Patients (administrativeAccess or any patient access) */}
                {dailySummaryData.patients && (
                  <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                      Patients
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Registrations</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.patients.registrations}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Check-ins</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.patients.checkIns}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Visits Completed</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.patients.completedVisits}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cancellations</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.patients.cancellations}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">No-shows</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.patients.noShows}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Online Bookings</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.patients.onlineBookings}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Section 2: By Doctor */}
                {dailySummaryData.byDoctor && dailySummaryData.byDoctor.length > 0 && (
                  <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        By Doctor
                      </h3>
                    </div>
                    <div className="p-3 sm:p-0">
                      <Table stackBelow="md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-4/12 min-w-[140px]">Doctor</TableHead>
                            <TableHead className="w-2/12 min-w-[90px]">Booked</TableHead>
                            <TableHead className="w-2/12 min-w-[90px]">Checked In</TableHead>
                            <TableHead className="w-2/12 min-w-[90px]">Completed</TableHead>
                            <TableHead className="w-2/12 min-w-[100px] text-right">Prescriptions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailySummaryData.byDoctor.map((d) => (
                            <TableRow key={d.doctorId}>
                              <TableCell label="Doctor" className="w-4/12 min-w-[140px] font-medium text-slate-900 dark:text-slate-100">
                                {d.doctorName}
                              </TableCell>
                              <TableCell label="Booked" className="w-2/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {d.booked}
                              </TableCell>
                              <TableCell label="Checked In" className="w-2/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {d.checkedIn}
                              </TableCell>
                              <TableCell label="Completed" className="w-2/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {d.completed}
                              </TableCell>
                              <TableCell label="Prescriptions" className="w-2/12 min-w-[100px] text-right text-slate-600 dark:text-slate-300">
                                {d.prescriptions}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}

                {/* Section 3: By Receptionist */}
                {dailySummaryData.byReceptionist && dailySummaryData.byReceptionist.length > 0 && (
                  <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        By Receptionist
                      </h3>
                    </div>
                    <div className="p-3 sm:p-0">
                      <Table stackBelow="md">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-4/12 min-w-[140px]">Name</TableHead>
                            <TableHead className="w-2/12 min-w-[90px]">Registrations</TableHead>
                            <TableHead className="w-2/12 min-w-[90px]">Check-ins</TableHead>
                            <TableHead className="w-2/12 min-w-[90px]">Bookings</TableHead>
                            <TableHead className="w-2/12 min-w-[120px] text-right">Payments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailySummaryData.byReceptionist.map((r) => (
                            <TableRow key={r.receptionistId}>
                              <TableCell label="Name" className="w-4/12 min-w-[140px] font-medium text-slate-900 dark:text-slate-100">
                                {r.receptionistName}
                              </TableCell>
                              <TableCell label="Registrations" className="w-2/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {r.registrations}
                              </TableCell>
                              <TableCell label="Check-ins" className="w-2/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {r.checkIns}
                              </TableCell>
                              <TableCell label="Bookings" className="w-2/12 min-w-[90px] text-slate-600 dark:text-slate-300">
                                {r.bookings}
                              </TableCell>
                              <TableCell label="Payments" className="w-2/12 min-w-[120px] text-right text-slate-600 dark:text-slate-300">
                                {r.paymentsCount} ({r.formattedPaymentsTotal})
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}

                {/* Section 4: Collections */}
                {dailySummaryData.collections && (
                  <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                      {dailySummaryData.collections.isMyCollections ? 'My Collections' : 'Collections'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Cash</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.collections.formattedCash}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Card</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.collections.formattedCard}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">UPI</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.collections.formattedUpi}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Portal</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.collections.formattedPortal}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Reversals</span>
                        <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                          {dailySummaryData.collections.formattedReversals}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Net Collected</span>
                        <span className="text-base font-bold text-teal-700 dark:text-teal-400">
                          {dailySummaryData.collections.formattedNetTotal}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Billed Today</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.collections.formattedDailyBilled}
                        </span>
                      </div>
                    </div>
                    {dailySummaryData.collections.isMyCollections && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Cash to hand over: {dailySummaryData.collections.formattedCashToHandOver}
                        </span>
                      </div>
                    )}
                  </Card>
                )}

                {/* Section 5: Attendance */}
                {dailySummaryData.attendance && (
                  <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                      Attendance
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs mb-4">
                      <div>
                        <span className="text-slate-500 block">Present</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.attendance.presentCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Late</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.attendance.lateCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">On Leave</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.attendance.onLeaveCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Absent</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.attendance.absentCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Hours</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {dailySummaryData.attendance.totalHoursWorked}
                        </span>
                      </div>
                    </div>

                    {(dailySummaryData.attendance.lateStaffNames.length > 0 ||
                      dailySummaryData.attendance.absentStaffNames.length > 0) && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                        {dailySummaryData.attendance.lateStaffNames.length > 0 && (
                          <p className="text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Late:</span>{' '}
                            {dailySummaryData.attendance.lateStaffNames.join(', ')}
                          </p>
                        )}
                        {dailySummaryData.attendance.absentStaffNames.length > 0 && (
                          <p className="text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Absent:</span>{' '}
                            {dailySummaryData.attendance.absentStaffNames.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clock Out Confirmation Modal */}
      <Modal
        isOpen={isClockOutModalOpen}
        onClose={() => setIsClockOutModalOpen(false)}
        title="Confirm Clock Out"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to clock out for today? You will not be able to clock in again until tomorrow.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClockOutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmClockOut}
            >
              Confirm Clock Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
