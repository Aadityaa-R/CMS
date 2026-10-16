import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectOption } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { INITIAL_PENDING_APPROVALS, DEMO_USERS } from '@/data/mockData';
import {
  calculateDashboardMetrics,
  DateRangePreset,
  ChartBucketType,
  formatCurrency,
  PatientsAndVisitsBucket,
  FeesAndPaymentsBucket,
  VisitsTrendBucket,
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
                <rect width="6" height="6" fill="#64748b" fillOpacity="0.35" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="1.5" />
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
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
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
                    stroke="#475569"
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
                      className={`text-[10px] fill-slate-500 dark:fill-slate-400 font-mono ${
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
            className="w-3 h-3 border border-slate-500 dark:border-slate-400 inline-block"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #64748b, #64748b 2px, transparent 2px, transparent 4px)',
            }}
          />
          <span>Visits</span>
        </div>
      </div>
    </Card>
  );
};

// Line chart component for Fees and Payments (MD only)
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
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
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
                stroke="#0d9488"
                strokeWidth="2"
              />
            )}

            {/* Collected line (dashed slate) */}
            {n > 1 && (
              <polyline
                points={collectedPoints}
                fill="none"
                stroke="#64748b"
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
                  {/* Billed point (circle) */}
                  <circle cx={x} cy={yBilled} r="3" fill="#0d9488">
                    <title>{`${b.label} - Billed: ${formatCurrency(b.billed)}`}</title>
                  </circle>
                  {/* Collected point (square) */}
                  <rect x={x - 3} y={yCollected - 3} width="6" height="6" fill="#64748b">
                    <title>{`${b.label} - Collected: ${formatCurrency(b.collected)}`}</title>
                  </rect>
                  {/* X-axis label */}
                  {showLabel && (
                    <text
                      x={x}
                      y={215}
                      textAnchor="middle"
                      className={`text-[10px] fill-slate-500 dark:fill-slate-400 font-mono ${
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
                    <td>{formatCurrency(b.billed)}</td>
                    <td>{formatCurrency(b.collected)}</td>
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

// Trend line chart component for Staff Doctor visits
interface VisitsTrendChartProps {
  buckets: VisitsTrendBucket[];
  activeBucket: ChartBucketType;
  onBucketChange: (bucket: ChartBucketType) => void;
}

const VisitsTrendChart: React.FC<VisitsTrendChartProps> = ({
  buckets,
  activeBucket,
  onBucketChange,
}) => {
  const maxVal = Math.max(1, ...buckets.map((b) => b.visits));
  const yCeiling = maxVal <= 4 ? 4 : maxVal <= 8 ? 8 : maxVal <= 12 ? 12 : Math.ceil(maxVal / 5) * 5;
  const gridTicks = [0, yCeiling * 0.25, yCeiling * 0.5, yCeiling * 0.75, yCeiling];

  const n = buckets.length;
  const plotWidth = 525;
  const calcX = (i: number) => 45 + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const calcY = (val: number) => 20 + 175 - Math.min(175, (val / yCeiling) * 175);

  const points = buckets.map((b, i) => `${calcX(i)},${calcY(b.visits)}`).join(' ');

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Visits by {activeBucket.charAt(0).toUpperCase() + activeBucket.slice(1)}
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
            aria-label="Line chart showing doctor visit volume"
            viewBox="0 0 600 240"
            className="w-full h-56 sm:h-64"
          >
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
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Visit trend line (solid teal) */}
            {n > 1 && (
              <polyline
                points={points}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2"
              />
            )}

            {/* Points */}
            {buckets.map((b, i) => {
              const x = calcX(i);
              const y = calcY(b.visits);
              const showLabel =
                n <= 10 ||
                (n <= 20 && i % 2 === 0) ||
                (n > 20 && (i % 5 === 0 || i === n - 1));

              return (
                <g key={b.dateKey}>
                  <circle cx={x} cy={y} r="3" fill="#0d9488">
                    <title>{`${b.label} - Visits: ${b.visits}`}</title>
                  </circle>
                  {showLabel && (
                    <text
                      x={x}
                      y={215}
                      textAnchor="middle"
                      className={`text-[10px] fill-slate-500 dark:fill-slate-400 font-mono ${
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
                No visit records for this range
              </text>
            )}
          </svg>

          {/* Visually hidden screen reader table */}
          <div className="sr-only">
            <table>
              <caption>Doctor visits data</caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Visits</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.dateKey}>
                    <td>{b.label}</td>
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
          <span className="w-4 h-0.5 bg-teal-600 dark:bg-teal-500 inline-block" />
          <span>Completed Visits</span>
        </div>
      </div>
    </Card>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser, currentRole } = useAuth();
  const {
    patients,
    appointments,
    invoices,
    prescriptions,
    doctors,
    patientAssignments = [],
    updateAppointmentStatus,
  } = useClinic();

  const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');
  const [chartBucket1, setChartBucket1] = useState<ChartBucketType>('day');
  const [chartBucket2, setChartBucket2] = useState<ChartBucketType>('day');

  // Pagination states for lists (10 records per page)
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [followUpsPage, setFollowUpsPage] = useState(1);
  const [clearancesPage, setClearancesPage] = useState(1);
  const [prescriptionsPage, setPrescriptionsPage] = useState(1);

  // Compute metrics for chart 1
  const metrics1 = useMemo(() => {
    return calculateDashboardMetrics({
      patients,
      appointments,
      invoices,
      prescriptions,
      doctors,
      users: Object.values(DEMO_USERS),
      pendingClearances: INITIAL_PENDING_APPROVALS,
      role: currentRole,
      userId: currentUser.id,
      currentUser,
      patientAssignments,
      dateRange,
      chartBucket: chartBucket1,
    });
  }, [
    patients,
    appointments,
    invoices,
    prescriptions,
    doctors,
    currentRole,
    currentUser,
    patientAssignments,
    dateRange,
    chartBucket1,
  ]);

  // Compute metrics for chart 2 (when bucket differs)
  const metrics2 = useMemo(() => {
    if (chartBucket1 === chartBucket2) {
      return metrics1;
    }
    return calculateDashboardMetrics({
      patients,
      appointments,
      invoices,
      prescriptions,
      doctors,
      users: Object.values(DEMO_USERS),
      pendingClearances: INITIAL_PENDING_APPROVALS,
      role: currentRole,
      userId: currentUser.id,
      currentUser,
      patientAssignments,
      dateRange,
      chartBucket: chartBucket2,
    });
  }, [
    chartBucket1,
    chartBucket2,
    metrics1,
    patients,
    appointments,
    invoices,
    prescriptions,
    doctors,
    currentRole,
    currentUser,
    patientAssignments,
  ]);

  const greeting = getGreeting(currentUser.name);

  // Quick Action Buttons based on role
  const renderQuickActions = () => {
    switch (currentRole) {
      case 'md':
      case 'admin':
        return (
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('doctor', 'overview')}
            >
              Consultation Desk
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('role_patient', 'overview')}
            >
              Patient Directory
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('access_control', 'add_users')}
            >
              Add Staff
            </Button>
          </div>
        );

      case 'doctor':
        return (
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('doctor', 'overview')}
            >
              Start Consultation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('role_patient', 'overview')}
            >
              View Directory
            </Button>
          </div>
        );

      case 'receptionist':
        return (
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('booking')}
            >
              New Appointment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('checkin')}
            >
              Check-in Walk-in
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('registration')}
            >
              Register Patient
            </Button>
          </div>
        );

      case 'patient':
        return (
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('appointments')}
            >
              My Appointments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('prescriptions')}
            >
              View Prescriptions
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Slice paginated appointment records
  const paginatedAppointments = useMemo(() => {
    const list = metrics1.todayAppointments;
    const start = (appointmentsPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.todayAppointments, appointmentsPage]);

  // Slice paginated follow-up records
  const paginatedFollowUps = useMemo(() => {
    const list = metrics1.followUpsDue;
    const start = (followUpsPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.followUpsDue, followUpsPage]);

  // Slice paginated pending clearances (MD)
  const paginatedClearances = useMemo(() => {
    const list = metrics1.pendingClearances;
    const start = (clearancesPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.pendingClearances, clearancesPage]);

  // Slice paginated patient upcoming appointments (Patient)
  const paginatedPatientAppointments = useMemo(() => {
    const list = metrics1.patientUpcomingAppointments || [];
    const start = (appointmentsPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.patientUpcomingAppointments, appointmentsPage]);

  // Slice paginated patient prescriptions (Patient)
  const paginatedPatientPrescriptions = useMemo(() => {
    const list = metrics1.patientRecentPrescriptions || [];
    const start = (prescriptionsPage - 1) * 10;
    return list.slice(start, start + 10);
  }, [metrics1.patientRecentPrescriptions, prescriptionsPage]);

  // Column count for summary figure grid: 4 columns on desktop, 2 on tablet, 2 on phones
  const figureCount = metrics1.summaryFigures.length;
  const gridColsClass =
    figureCount === 5
      ? 'grid-cols-2 lg:grid-cols-5'
      : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className="space-y-6 pb-8">
      {/* Header: Greeting, Date Range Selector & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {greeting}
          </h2>
          {renderQuickActions()}
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <Select
            value={dateRange}
            options={DATE_RANGE_OPTIONS}
            onChange={(e) => {
              setDateRange(e.target.value as DateRangePreset);
              setAppointmentsPage(1);
              setFollowUpsPage(1);
            }}
          />
        </div>
      </div>

      {/* Exactly ONE Outlined Summary Figures Card */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className={`grid ${gridColsClass} gap-6`}>
          {metrics1.summaryFigures.map((fig) => (
            <div key={fig.label} className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                {fig.formattedValue ?? fig.value}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {fig.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Row: Stack below 1024px (lg:grid-cols-2) */}
      {(currentRole === 'md' || currentRole === 'admin' || currentRole === 'doctor') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PatientsAndVisitsChart
            buckets={metrics1.patientsAndVisits}
            activeBucket={chartBucket1}
            onBucketChange={setChartBucket1}
          />

          {currentRole === 'md' || currentRole === 'admin' ? (
            <FeesAndPaymentsChart
              buckets={metrics2.feesAndPayments || []}
              activeBucket={chartBucket2}
              onBucketChange={setChartBucket2}
            />
          ) : (
            <VisitsTrendChart
              buckets={metrics2.visitsTrend || []}
              activeBucket={chartBucket2}
              onBucketChange={setChartBucket2}
            />
          )}
        </div>
      )}

      {/* Lists Row: Scoped per Role (stacked lists with Table stackBelow="md") */}
      {/* 1. Managing Director (3 Lists) */}
      {(currentRole === 'md' || currentRole === 'admin') && (
        <div className="grid grid-cols-1 gap-6">
          {/* List 1: Today's Appointments */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Today&apos;s Appointments
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.todayAppointments.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                          No appointments scheduled today
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell label="Time" className="font-mono text-slate-600 dark:text-slate-300">
                            {apt.time}
                          </TableCell>
                          <TableCell label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {apt.patientName}
                          </TableCell>
                          <TableCell label="Doctor" className="text-slate-600 dark:text-slate-300">
                            {apt.doctorName}
                          </TableCell>
                          <TableCell label="Status" className="text-slate-600 dark:text-slate-300">
                            {formatStatusText(apt.status)}
                          </TableCell>
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

          {/* List 2: Follow-ups Due */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Follow-ups Due
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.followUpsDue.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFollowUps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                          No follow-ups due
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFollowUps.map((fu) => (
                        <TableRow key={fu.id}>
                          <TableCell label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {fu.patientName}
                          </TableCell>
                          <TableCell label="Doctor" className="text-slate-600 dark:text-slate-300">
                            {fu.doctorName}
                          </TableCell>
                          <TableCell label="Due Date" className="font-mono text-slate-600 dark:text-slate-300">
                            {fu.dueDate}
                          </TableCell>
                          <TableCell label="Reason" className="text-slate-600 dark:text-slate-300">
                            {fu.reason || 'Routine follow-up'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {metrics1.followUpsDue.length > 10 && (
              <Pagination
                currentPage={followUpsPage}
                totalItems={metrics1.followUpsDue.length}
                pageSize={10}
                onPageChange={setFollowUpsPage}
              />
            )}
          </Card>

          {/* List 3: Pending Clearances */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pending Clearances
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.pendingClearances.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClearances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                          No pending staff approvals
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedClearances.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell label="Name" className="font-medium text-slate-900 dark:text-slate-100">
                            {c.name}
                          </TableCell>
                          <TableCell label="Role" className="capitalize text-slate-600 dark:text-slate-300">
                            {c.role}
                          </TableCell>
                          <TableCell label="Applied" className="font-mono text-slate-600 dark:text-slate-300">
                            {c.applied}
                          </TableCell>
                          <TableCell label="Action" fullWidthOnStack>
                            <button
                              type="button"
                              onClick={() => onNavigate?.('access_control', 'add_users')}
                              className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 cursor-pointer"
                            >
                              Review Clearance
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {metrics1.pendingClearances.length > 10 && (
              <Pagination
                currentPage={clearancesPage}
                totalItems={metrics1.pendingClearances.length}
                pageSize={10}
                onPageChange={setClearancesPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* 2. Staff Doctor (2 Lists) */}
      {currentRole === 'doctor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List 1: Doctor's Own Today Appointments */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Today&apos;s Appointments
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.todayAppointments.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                          No appointments scheduled today
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell label="Time" className="font-mono text-slate-600 dark:text-slate-300">
                            {apt.time}
                          </TableCell>
                          <TableCell label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {apt.patientName}
                          </TableCell>
                          <TableCell label="Status" className="text-slate-600 dark:text-slate-300">
                            {formatStatusText(apt.status)}
                          </TableCell>
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

          {/* List 2: Doctor's Own Follow-ups */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Follow-ups Due
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.followUpsDue.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFollowUps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-slate-500">
                          No follow-ups pending
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFollowUps.map((fu) => (
                        <TableRow key={fu.id}>
                          <TableCell label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {fu.patientName}
                          </TableCell>
                          <TableCell label="Due Date" className="font-mono text-slate-600 dark:text-slate-300">
                            {fu.dueDate}
                          </TableCell>
                          <TableCell label="Reason" className="text-slate-600 dark:text-slate-300">
                            {fu.reason || 'Routine follow-up'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {metrics1.followUpsDue.length > 10 && (
              <Pagination
                currentPage={followUpsPage}
                totalItems={metrics1.followUpsDue.length}
                pageSize={10}
                onPageChange={setFollowUpsPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* 3. Receptionist (2 Lists) */}
      {currentRole === 'receptionist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List 1: Today's Appointments with Quick Check-In */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Today&apos;s Appointments
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.todayAppointments.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                          No appointments scheduled today
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell label="Time" className="font-mono text-slate-600 dark:text-slate-300">
                            {apt.time}
                          </TableCell>
                          <TableCell label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {apt.patientName}
                          </TableCell>
                          <TableCell label="Doctor" className="text-slate-600 dark:text-slate-300">
                            {apt.doctorName}
                          </TableCell>
                          <TableCell label="Status" className="text-slate-600 dark:text-slate-300">
                            {formatStatusText(apt.status)}
                          </TableCell>
                          <TableCell label="Action" fullWidthOnStack>
                            {apt.status === 'scheduled' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAppointmentStatus(apt.id, 'checked_in')}
                              >
                                Check In
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500">
                                {formatStatusText(apt.status)}
                              </span>
                            )}
                          </TableCell>
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

          {/* List 2: Follow-ups Due */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Follow-ups Due
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.followUpsDue.length}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFollowUps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                          No follow-ups due
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedFollowUps.map((fu) => (
                        <TableRow key={fu.id}>
                          <TableCell label="Patient" className="font-medium text-slate-900 dark:text-slate-100">
                            {fu.patientName}
                          </TableCell>
                          <TableCell label="Doctor" className="text-slate-600 dark:text-slate-300">
                            {fu.doctorName}
                          </TableCell>
                          <TableCell label="Due Date" className="font-mono text-slate-600 dark:text-slate-300">
                            {fu.dueDate}
                          </TableCell>
                          <TableCell label="Reason" className="text-slate-600 dark:text-slate-300">
                            {fu.reason || 'Routine follow-up'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {metrics1.followUpsDue.length > 10 && (
              <Pagination
                currentPage={followUpsPage}
                totalItems={metrics1.followUpsDue.length}
                pageSize={10}
                onPageChange={setFollowUpsPage}
              />
            )}
          </Card>
        </div>
      )}

      {/* 4. Patient (2 Lists) */}
      {currentRole === 'patient' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List 1: Upcoming Appointments */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Appointments
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.patientUpcomingAppointments?.length || 0}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatientAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                          No upcoming appointments
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPatientAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell label="Date" className="font-mono text-slate-600 dark:text-slate-300">
                            {apt.date}
                          </TableCell>
                          <TableCell label="Time" className="font-mono text-slate-600 dark:text-slate-300">
                            {apt.time}
                          </TableCell>
                          <TableCell label="Doctor" className="font-medium text-slate-900 dark:text-slate-100">
                            {apt.doctorName}
                          </TableCell>
                          <TableCell label="Reason" className="text-slate-600 dark:text-slate-300">
                            {apt.reason}
                          </TableCell>
                          <TableCell label="Status" className="text-slate-600 dark:text-slate-300">
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
                currentPage={appointmentsPage}
                totalItems={metrics1.patientUpcomingAppointments?.length || 0}
                pageSize={10}
                onPageChange={setAppointmentsPage}
              />
            )}
          </Card>

          {/* List 2: Recent Prescriptions */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recent Prescriptions
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                  {metrics1.patientRecentPrescriptions?.length || 0}
                </span>
              </div>
              <div className="p-3 sm:p-0">
                <Table stackBelow="md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatientPrescriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                          No prescriptions on record
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPatientPrescriptions.map((rx) => (
                        <TableRow key={rx.id}>
                          <TableCell label="Date" className="font-mono text-slate-600 dark:text-slate-300">
                            {rx.date}
                          </TableCell>
                          <TableCell label="Medication" className="font-medium text-slate-900 dark:text-slate-100">
                            {rx.medications}
                          </TableCell>
                          <TableCell label="Doctor" className="text-slate-600 dark:text-slate-300">
                            {rx.doctorName}
                          </TableCell>
                          <TableCell label="Status" className="capitalize text-slate-600 dark:text-slate-300">
                            {rx.status}
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
                currentPage={prescriptionsPage}
                totalItems={metrics1.patientRecentPrescriptions?.length || 0}
                pageSize={10}
                onPageChange={setPrescriptionsPage}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
