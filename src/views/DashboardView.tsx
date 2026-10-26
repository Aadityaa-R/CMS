import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/context/BillingContext';
import { useAttendance } from '@/context/AttendanceContext';
import { Card, KpiCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectOption } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
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
import { CURRENCY_SYMBOL } from '@/lib/money';
import { handlePrint as triggerPrint } from '@/lib/print';

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



// Grouped bar chart component for Patients and Visits
interface PatientsAndVisitsChartProps {
  buckets: PatientsAndVisitsBucket[];
  activeBucket?: ChartBucketType;
  onBucketChange?: (bucket: ChartBucketType) => void;
}

const PatientsAndVisitsChart: React.FC<PatientsAndVisitsChartProps> = ({
  buckets,
  activeBucket,
  onBucketChange,
}) => {
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);

  useEffect(() => {
    if (!chartWrapperRef.current || typeof ResizeObserver === 'undefined') return;
    const update = (w: number) => {
      if (w > 0) setChartWidth(w);
    };
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });
    ro.observe(chartWrapperRef.current);
    update(chartWrapperRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.newPatients, b.visits)));
  const yCeiling = maxVal <= 4 ? 4 : maxVal <= 8 ? 8 : maxVal <= 12 ? 12 : Math.ceil(maxVal / 5) * 5;
  const gridTicks = [0, Math.round(yCeiling / 3), Math.round((yCeiling * 2) / 3), yCeiling];

  const n = buckets.length;
  const slotWidth = n > 0 ? 520 / n : 520;
  const barWidth = Math.max(3, Math.min(16, (slotWidth - 6) / 2));

  const visibleLabelIndices = useMemo(() => {
    if (n === 0) return new Set<number>();
    const remPx = typeof window !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
    const minSpacingPx = 5 * remPx; // about one label per 5rem (~80px)

    const visible = new Set<number>();
    let lastXPx = -Infinity;

    for (let i = 0; i < n; i++) {
      const slotCenterX = 45 + (i + 0.5) * slotWidth;
      const xPx = (slotCenterX / 600) * chartWidth;
      if (xPx - lastXPx >= minSpacingPx) {
        visible.add(i);
        lastXPx = xPx;
      }
    }
    return visible;
  }, [n, slotWidth, chartWidth]);

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100">
            Patients and Visits
          </h3>
          {onBucketChange && activeBucket && (
            <div className="w-32">
              <Select
                size="sm"
                searchable={false}
                icon={<Filter className="w-3.5 h-3.5" />}
                value={activeBucket}
                onChange={(e) => onBucketChange(e.target.value as ChartBucketType)}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </div>
          )}
        </div>

        <div ref={chartWrapperRef} className="pt-4 overflow-hidden relative">
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
                    x2={565}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray={tick === 0 ? undefined : "3,3"}
                  />
                  <text
                    x={38}
                    y={y + 3}
                    textAnchor="end"
                    className="text-fs-axis font-normal fill-slate-500 dark:fill-slate-400"
                    style={{ fontSize: 'var(--fs-axis)' }}
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

              const showLabel = visibleLabelIndices.has(i);

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
                      className="text-fs-axis fill-slate-500 dark:fill-slate-400"
                      style={{ fontSize: 'var(--fs-axis)' }}
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
        </div>

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

      {/* Static Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-fs-axis text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800" style={{ fontSize: 'var(--fs-axis)' }}>
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
  activeBucket?: ChartBucketType;
  onBucketChange?: (bucket: ChartBucketType) => void;
}

const FeesAndPaymentsChart: React.FC<FeesAndPaymentsChartProps> = ({
  buckets,
  activeBucket,
  onBucketChange,
}) => {
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);

  useEffect(() => {
    if (!chartWrapperRef.current || typeof ResizeObserver === 'undefined') return;
    const update = (w: number) => {
      if (w > 0) setChartWidth(w);
    };
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });
    ro.observe(chartWrapperRef.current);
    update(chartWrapperRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

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
  const gridTicks = [0, Math.round(yCeiling / 3), Math.round((yCeiling * 2) / 3), yCeiling];

  const n = buckets.length;
  const plotWidth = 515;
  const calcX = (i: number) => 55 + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const calcY = (val: number) => 20 + 175 - Math.min(175, (val / yCeiling) * 175);

  const visibleLabelIndices = useMemo(() => {
    if (n === 0) return new Set<number>();
    const remPx = typeof window !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
    const minSpacingPx = 5 * remPx; // about one label per 5rem (~80px)

    const visible = new Set<number>();
    let lastXPx = -Infinity;

    for (let i = 0; i < n; i++) {
      const xSvg = calcX(i);
      const xPx = (xSvg / 600) * chartWidth;
      if (xPx - lastXPx >= minSpacingPx) {
        visible.add(i);
        lastXPx = xPx;
      }
    }
    return visible;
  }, [n, chartWidth]);

  const billedPoints = buckets.map((b, i) => `${calcX(i)},${calcY(b.billed)}`).join(' ');
  const collectedPoints = buckets.map((b, i) => `${calcX(i)},${calcY(b.collected)}`).join(' ');

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100">
            Fees and Payments
          </h3>
          {onBucketChange && activeBucket && (
            <div className="w-32">
              <Select
                size="sm"
                searchable={false}
                icon={<Filter className="w-3.5 h-3.5" />}
                value={activeBucket}
                onChange={(e) => onBucketChange(e.target.value as ChartBucketType)}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </div>
          )}
        </div>

        <div ref={chartWrapperRef} className="pt-4 overflow-hidden relative">
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
                        x2={570}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray={tick === 0 ? undefined : "3,3"}
                      />
                      <text
                        x={48}
                        y={y + 3}
                        textAnchor="end"
                        className="text-fs-axis font-normal fill-slate-500 dark:fill-slate-400"
                        style={{ fontSize: 'var(--fs-axis)' }}
                      >
                        {CURRENCY_SYMBOL}{tick}
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

                  const showLabel = visibleLabelIndices.has(i);

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
                          className="text-fs-axis fill-slate-500 dark:fill-slate-400"
                          style={{ fontSize: 'var(--fs-axis)' }}
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
        </div>
      </div>

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

      {/* Static Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-fs-axis text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800" style={{ fontSize: 'var(--fs-axis)' }}>
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


  // View presentation mode for Graphs and Tables slide animation
  const [dashboardViewMode, setDashboardViewMode] = useState<'graphs' | 'tables'>(() => {
    try {
      const saved = localStorage.getItem('beacon_dashboard_view_mode');
      if (saved === 'graphs' || saved === 'tables') return saved;
    } catch {}
    return 'graphs';
  });

  const handleViewModeChange = (mode: 'graphs' | 'tables') => {
    setDashboardViewMode(mode);
    try {
      localStorage.setItem('beacon_dashboard_view_mode', mode);
    } catch {}
  };

  // User accesses
  const userIsAdmin = isAdmin(currentUser, modules);
  const hasConsult = hasCapability(currentUser, 'consultationWorkstation', modules);
  const hasCheckIn = hasCapability(currentUser, 'patientCheckIn', modules);
  const hasBilling = hasCapability(currentUser, 'paymentRecording', modules) || userIsAdmin;
  const isPatient = currentUser?.role === 'patient';
  const hasCharts = !isPatient && (userIsAdmin || hasConsult || hasBilling);

  // Keyboard arrow navigation between Graphs and Tables
  useEffect(() => {
    if (!hasCharts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handleViewModeChange('graphs');
      } else if (e.key === 'ArrowRight') {
        handleViewModeChange('tables');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasCharts]);

  const handleCarouselKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleViewModeChange('graphs');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleViewModeChange('tables');
    }
  };

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
    triggerPrint();
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


  const chartsCards = (
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
  );

  const operationalCards = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* List 1: Today's Appointments */}
        {canViewWidget('today_appointments', currentUser, modules) && (
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100">
                  Today&apos;s Appointments
                </h3>
                <span className="text-fs-label text-slate-500 dark:text-slate-400 font-normal">
                  {metrics1.todayAppointments.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead kind="short" priority={4}>Time</TableHead>
                      <TableHead kind="short" priority={1}>Patient</TableHead>
                      <TableHead kind="short" priority={5}>Doctor</TableHead>
                      <TableHead kind="short" priority={2}>Status</TableHead>
                      {hasCheckIn && (
                        <TableHead kind="short" priority={3} isActions className="text-right">Action</TableHead>
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
                          <TableCell label="Time" kind="short" priority={4} className="text-slate-600 dark:text-slate-300">
                            {apt.time}
                          </TableCell>
                          <TableCell label="Patient" kind="short" priority={1} className="font-medium text-slate-900 dark:text-slate-100">
                            {apt.patientName}
                          </TableCell>
                          <TableCell label="Doctor" kind="short" priority={5} className="text-slate-600 dark:text-slate-300">
                            {apt.doctorName}
                          </TableCell>
                          <TableCell label="Status" kind="short" priority={2} className="text-slate-600 dark:text-slate-300">
                            {formatStatusText(apt.status)}
                          </TableCell>
                          {hasCheckIn && (
                            <TableCell label="Action" fullWidthOnStack kind="short" priority={3} isActions className="text-right">
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
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100">
                  Needs Attention
                </h3>
                <span className="text-fs-label text-slate-500 font-normal">Action Items</span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead kind="short" priority={1}>Item</TableHead>
                      <TableHead kind="short" priority={2}>Count</TableHead>
                      <TableHead kind="short" priority={3} isActions className="text-right">Action</TableHead>
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
                          <TableCell label="Item" kind="short" priority={1} className="font-medium text-slate-900 dark:text-slate-100">
                            {item.label}
                          </TableCell>
                          <TableCell label="Count" kind="short" priority={2} className="text-slate-600 dark:text-slate-300 font-semibold">
                            {item.count}
                          </TableCell>
                          <TableCell label="Action" fullWidthOnStack kind="short" priority={3} isActions className="text-right">
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

    </div>
  );

  const patientCards = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col justify-between">
        <div>
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100">
              Upcoming Consultations
            </h3>
            <span className="text-fs-label text-slate-500 font-normal">
              {metrics1.patientUpcomingAppointments?.length || 0}
            </span>
          </div>
          <div className="p-3 sm:p-0">
            <Table stackBelow="md">
              <TableHeader>
                <TableRow>
                  <TableHead kind="short" priority={1}>Date</TableHead>
                  <TableHead kind="short" priority={4}>Time</TableHead>
                  <TableHead kind="short" priority={3}>Doctor</TableHead>
                  <TableHead kind="short" priority={2}>Status</TableHead>
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
                      <TableCell label="Date" kind="short" priority={1} className="text-slate-600 dark:text-slate-300">
                        {apt.date}
                      </TableCell>
                      <TableCell label="Time" kind="short" priority={4} className="text-slate-600 dark:text-slate-300">
                        {apt.time}
                      </TableCell>
                      <TableCell label="Doctor" kind="short" priority={3} className="font-medium text-slate-900 dark:text-slate-100">
                        {apt.doctorName}
                      </TableCell>
                      <TableCell label="Status" kind="short" priority={2} className="text-slate-600 dark:text-slate-300">
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

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col justify-between">
        <div>
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100">
              Recent Prescriptions
            </h3>
            <span className="text-fs-label text-slate-500 font-normal">
              {metrics1.patientRecentPrescriptions?.length || 0}
            </span>
          </div>
          <div className="p-3 sm:p-0">
            <Table stackBelow="md">
              <TableHeader>
                <TableRow>
                  <TableHead kind="short" priority={1}>Date</TableHead>
                  <TableHead kind="text" priority={2}>Medication</TableHead>
                  <TableHead kind="short" priority={3}>Doctor</TableHead>
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
                      <TableCell label="Date" kind="short" priority={1} className="text-slate-600 dark:text-slate-300">
                        {rx.date}
                      </TableCell>
                      <TableCell label="Medication" kind="text" priority={2} className="font-medium text-slate-900 dark:text-slate-100">
                        {rx.medications}
                      </TableCell>
                      <TableCell label="Doctor" kind="short" priority={3} className="text-slate-600 dark:text-slate-300">
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
    </div>
  );

  return (
    <div className="space-y-3.5 pb-4">
      <h1 id="dashboard-heading" tabIndex={-1} className="sr-only">
        Dashboard
      </h1>
      {/* Controls: Navigation Tabs & Date Range */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between no-print">
        {qualifiesForDailySummary ? (
          <Tabs
            ariaLabel="Dashboard Tabs"
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'daily_summary', label: 'Daily Summary' },
            ]}
            activeTab={activeTab}
            onChange={(id) => {
              setActiveTab(id as 'overview' | 'daily_summary');
              document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : <div />}

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

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW                                                */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Figures: Individual Card blocks in responsive grid */}
          {metrics1.summaryFigures.length === 0 ? (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
              <p className="text-xs text-slate-500 py-4 text-center">
                No summary metrics configured for this account.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics1.summaryFigures.map((fig) => (
                <KpiCard
                  key={fig.label}
                  label={fig.label}
                  value={fig.formattedValue ?? fig.value}
                />
              ))}
            </div>
          )}

          {/* Front Desk Today Operational Widget */}
          {canViewWidget('front_desk_today', currentUser, modules) && metrics1.frontDeskToday && (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-h-0 h-auto">
              <div className="pb-3 mb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-fs-title font-bold text-slate-900 dark:text-slate-100">
                  Front Desk Today
                </h3>
                <span className="text-fs-label text-slate-500 font-normal">Operational Status</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col min-h-0 h-auto" style={{ gap: '0.25rem' }}>
                  <p
                    className="font-semibold text-fs-kpi-label leading-tight text-slate-900 dark:text-slate-100"
                    style={{ fontSize: 'var(--fs-kpi-label)', fontWeight: 600 }}
                  >
                    Waiting
                  </p>
                  <span
                    className="font-bold text-slate-900 dark:text-slate-100 text-fs-kpi leading-none"
                    style={{ fontSize: 'var(--fs-kpi)', fontWeight: 700 }}
                  >
                    {metrics1.frontDeskToday.waiting}
                  </span>
                </div>
                <div className="flex flex-col min-h-0 h-auto" style={{ gap: '0.25rem' }}>
                  <p
                    className="font-semibold text-fs-kpi-label leading-tight text-slate-900 dark:text-slate-100"
                    style={{ fontSize: 'var(--fs-kpi-label)', fontWeight: 600 }}
                  >
                    In Consultation
                  </p>
                  <span
                    className="font-bold text-slate-900 dark:text-slate-100 text-fs-kpi leading-none"
                    style={{ fontSize: 'var(--fs-kpi)', fontWeight: 700 }}
                  >
                    {metrics1.frontDeskToday.inConsultation}
                  </span>
                </div>
                <div className="flex flex-col min-h-0 h-auto" style={{ gap: '0.25rem' }}>
                  <p
                    className="font-semibold text-fs-kpi-label leading-tight text-slate-900 dark:text-slate-100"
                    style={{ fontSize: 'var(--fs-kpi-label)', fontWeight: 600 }}
                  >
                    Booked Today
                  </p>
                  <span
                    className="font-bold text-slate-900 dark:text-slate-100 text-fs-kpi leading-none"
                    style={{ fontSize: 'var(--fs-kpi)', fontWeight: 700 }}
                  >
                    {metrics1.frontDeskToday.bookedToday}
                  </span>
                </div>
                <div className="flex flex-col min-h-0 h-auto" style={{ gap: '0.25rem' }}>
                  <p
                    className="font-semibold text-fs-kpi-label leading-tight text-slate-900 dark:text-slate-100"
                    style={{ fontSize: 'var(--fs-kpi-label)', fontWeight: 600 }}
                  >
                    Checked In Today
                  </p>
                  <span
                    className="font-bold text-slate-900 dark:text-slate-100 text-fs-kpi leading-none"
                    style={{ fontSize: 'var(--fs-kpi)', fontWeight: 700 }}
                  >
                    {metrics1.frontDeskToday.checkedInToday}
                  </span>
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

          {/* Main content display: Staff (with sliding carousel and side arrows) vs Receptionist vs Patient */}
          {!isPatient ? (
            hasCharts ? (
              <div className="relative w-full">
                {/* Left Navigation Arrow */}
                <button
                  type="button"
                  onClick={() => handleViewModeChange('graphs')}
                  disabled={dashboardViewMode === 'graphs'}
                  aria-label="Navigate to Graphs (Left Arrow)"
                  title="Visual Graphs (Press Left Arrow)"
                  className={`absolute -left-2.5 sm:-left-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border shadow-sm transition-all ${
                    dashboardViewMode === 'graphs'
                      ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 bg-slate-50/90 dark:bg-slate-900/90'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>

                {/* Carousel Viewport: full width, aligned with KPI cards */}
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Dashboard content carousel. Use Left and Right arrow keys to switch between visual graphs and operational tables."
                  onKeyDown={handleCarouselKeyDown}
                  className="w-full min-w-0 overflow-hidden relative focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-xl"
                >
                  <div
                    className="flex w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
                    style={{
                      transform: dashboardViewMode === 'tables' ? 'translateX(-100%)' : 'translateX(0%)',
                    }}
                  >
                    {/* Slide 1: Visual Analytics Graphs */}
                    <div
                      className={`w-full shrink-0 ${dashboardViewMode === 'tables' ? 'h-0 overflow-hidden' : ''}`}
                      aria-hidden={dashboardViewMode !== 'graphs'}
                    >
                      {chartsCards}
                    </div>

                    {/* Slide 2: Operational Data Tables */}
                    <div
                      className={`w-full shrink-0 ${dashboardViewMode === 'graphs' ? 'h-0 overflow-hidden' : ''}`}
                      aria-hidden={dashboardViewMode !== 'tables'}
                    >
                      {operationalCards}
                    </div>
                  </div>
                </div>

                {/* Right Navigation Arrow */}
                <button
                  type="button"
                  onClick={() => handleViewModeChange('tables')}
                  disabled={dashboardViewMode === 'tables'}
                  aria-label="Navigate to Tables (Right Arrow)"
                  title="Operational Tables (Press Right Arrow)"
                  className={`absolute -right-2.5 sm:-right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border shadow-sm transition-all ${
                    dashboardViewMode === 'tables'
                      ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 bg-slate-50/90 dark:bg-slate-900/90'
                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600'
                  }`}
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              operationalCards
            )
          ) : (
            patientCards
          )}
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
                className="no-print"
                onClick={handlePrint}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="no-print"
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Printable Container */}
          <div id="daily-summary-print-area" className="space-y-6 daily-summary-content printable-content">
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
                    <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
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
                            <TableHead kind="short" priority={1}>Doctor</TableHead>
                            <TableHead kind="short" priority={5}>Booked</TableHead>
                            <TableHead kind="short" priority={4}>Checked In</TableHead>
                            <TableHead kind="short" priority={2}>Completed</TableHead>
                            <TableHead kind="short" priority={3} className="text-right">Prescriptions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailySummaryData.byDoctor.map((d) => (
                            <TableRow key={d.doctorId}>
                              <TableCell label="Doctor" kind="short" priority={1} className="font-medium text-slate-900 dark:text-slate-100">
                                {d.doctorName}
                              </TableCell>
                              <TableCell label="Booked" kind="short" priority={5} className="text-slate-600 dark:text-slate-300">
                                {d.booked}
                              </TableCell>
                              <TableCell label="Checked In" kind="short" priority={4} className="text-slate-600 dark:text-slate-300">
                                {d.checkedIn}
                              </TableCell>
                              <TableCell label="Completed" kind="short" priority={2} className="text-slate-600 dark:text-slate-300">
                                {d.completed}
                              </TableCell>
                              <TableCell label="Prescriptions" kind="short" priority={3} className="text-right text-slate-600 dark:text-slate-300">
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
                            <TableHead kind="short" priority={1}>Name</TableHead>
                            <TableHead kind="short" priority={5}>Registrations</TableHead>
                            <TableHead kind="short" priority={3}>Check-ins</TableHead>
                            <TableHead kind="short" priority={4}>Bookings</TableHead>
                            <TableHead kind="short" priority={2} className="text-right">Payments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailySummaryData.byReceptionist.map((r) => (
                            <TableRow key={r.receptionistId}>
                              <TableCell label="Name" kind="short" priority={1} className="font-medium text-slate-900 dark:text-slate-100">
                                {r.receptionistName}
                              </TableCell>
                              <TableCell label="Registrations" kind="short" priority={5} className="text-slate-600 dark:text-slate-300">
                                {r.registrations}
                              </TableCell>
                              <TableCell label="Check-ins" kind="short" priority={3} className="text-slate-600 dark:text-slate-300">
                                {r.checkIns}
                              </TableCell>
                              <TableCell label="Bookings" kind="short" priority={4} className="text-slate-600 dark:text-slate-300">
                                {r.bookings}
                              </TableCell>
                              <TableCell label="Payments" kind="short" priority={2} className="text-right text-slate-600 dark:text-slate-300">
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
                    <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
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
                    <h3 className="text-fs-title font-semibold text-slate-900 dark:text-slate-100 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
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

    </div>
  );
};
