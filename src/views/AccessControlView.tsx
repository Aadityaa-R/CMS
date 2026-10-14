import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import {
  ShieldCheck,
  Search,
  Filter,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Clock,
  KeyRound,
  Stethoscope,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { UserRole } from '@/types';

export const AccessControlView: React.FC = () => {
  const {
    staffAccessList,
    accessAuditLog,
    grantStaffAccess,
    revokeStaffAccess,
    toggleStaffPermission,
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'granted' | 'revoked'>('all');
  const [feedbackNotification, setFeedbackNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackNotification(msg);
    setTimeout(() => {
      setFeedbackNotification(null);
    }, 4500);
  };

  const handleGrant = (id: string, name: string) => {
    grantStaffAccess(id, 'Access clearance authorized by Managing Director');
    showNotification(`Access granted for ${name}. Station credentials restored.`);
  };

  const handleRevoke = (id: string, name: string) => {
    revokeStaffAccess(id, 'Station credentials suspended by Managing Director executive order');
    showNotification(`Access revoked for ${name}. Station credentials suspended.`);
  };

  const handleTogglePermission = (recordId: string, permId: string, permName: string) => {
    toggleStaffPermission(recordId, permId);
    showNotification(`Updated permission: ${permName}`);
  };

  const filteredStaff = staffAccessList.filter((staff) => {
    const matchesSearch =
      staff.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ? true : staff.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const totalPersonnel = staffAccessList.length;
  const activeGranted = staffAccessList.filter((s) => s.status === 'granted').length;
  const suspendedRevoked = staffAccessList.filter((s) => s.status === 'revoked').length;

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'receptionist':
        return <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'patient':
        return <UserIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Feedback Banner */}
      {feedbackNotification && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-800 dark:text-slate-100 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Managing Director Directive:</span>
            <span>{feedbackNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Executive Workstation Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 tracking-wider uppercase">
              Managing Director Console
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300 font-medium">Supreme Administrative Authority</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-slate-100 tracking-tight">
            Staff Access Control & Security Governance
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Authorized by <strong>Dr. Marcus Vance, MD</strong> (Managing Director). Authorize, suspend, or revoke operational workstation access and permissions for clinic staff physicians, receptionists, and outpatient portals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-xs flex items-center gap-2 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>MD Immunity Active</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Roles & Staff"
          value={totalPersonnel.toString()}
          subtitle="Staff physicians, reception & portal"
          icon={<KeyRound className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Active Clearances"
          value={activeGranted.toString()}
          subtitle="Workstations operational"
          icon={<UserCheck className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Suspended Clearances"
          value={suspendedRevoked.toString()}
          subtitle="Access temporarily locked"
          icon={<UserX className="w-5 h-5" />}
          colorScheme={suspendedRevoked > 0 ? 'rose' : 'teal'}
        />
        <StatCard
          title="Audit Trail State"
          value="Enforced"
          subtitle="Managing Director ledger active"
          icon={<ShieldCheck className="w-5 h-5" />}
          colorScheme="teal"
        />
      </div>

      {/* Control Toolbar: Search & Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search personnel by name, role, department, badge..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </span>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Roles ({totalPersonnel})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('granted')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'granted'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Active ({activeGranted})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('revoked')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'revoked'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Suspended ({suspendedRevoked})
          </button>
        </div>
      </div>

      {/* Staff Access Governance Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredStaff.map((staff) => {
          const isRevoked = staff.status === 'revoked';

          return (
            <Card
              key={staff.id}
              className={`transition-all duration-200 ${
                isRevoked
                  ? 'border-slate-300 dark:border-slate-700 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <CardHeader
                action={
                  isRevoked ? (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Unlock className="w-3.5 h-3.5" />}
                      onClick={() => handleGrant(staff.id, staff.staffName)}
                    >
                      Grant Access
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:text-rose-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      icon={<Lock className="w-3.5 h-3.5" />}
                      onClick={() => handleRevoke(staff.id, staff.staffName)}
                    >
                      Revoke Access
                    </Button>
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getRoleIcon(staff.role)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {staff.staffName}
                      </CardTitle>
                      <Badge size="sm" variant={staff.role === 'doctor' ? 'teal' : 'neutral'}>
                        {staff.role === 'doctor' ? 'Staff Doctor' : staff.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {staff.staffTitle} • {staff.department} • Badge: {staff.badgeNumber}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {/* Station Access Status Indicator: Neutral container with indicator dot */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isRevoked ? 'bg-rose-500' : 'bg-teal-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Station Access Status:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {isRevoked ? 'Suspended by Managing Director' : 'Active & Authorized'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {staff.lastUpdated}
                  </span>
                </div>

                {/* Granular Sub-permissions Switchboard */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>Authorized Workstation Capabilities</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Managing Director Controls
                    </span>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {staff.permissions.map((perm) => (
                      <div
                        key={perm.id}
                        className="pt-2 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                            {perm.name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {perm.description}
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perm.enabled && !isRevoked}
                            disabled={isRevoked}
                            onChange={() =>
                              handleTogglePermission(staff.id, perm.id, perm.name)
                            }
                            className="sr-only peer"
                          />
                          <div
                            className={`w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                              isRevoked
                                ? 'opacity-40 cursor-not-allowed'
                                : 'peer-checked:bg-teal-600'
                            }`}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Directive Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Last Authorized: <strong>{staff.updatedBy}</strong></span>
                  <span className="italic">{staff.reason || 'Routine operational clearance'}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Managing Director Security Audit Ledger */}
      <Card>
        <CardHeader
          action={
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Immutable Ledger</span>
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <CardTitle>Managing Director Security Audit Ledger</CardTitle>
            <Badge size="sm" variant="teal">Official Directives</Badge>
          </div>
          <CardDescription>
            Chronological log of staff clearance grants, station suspensions, and permission modifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Timestamp</th>
                  <th className="px-3.5 py-2.5">Target Staff & Role</th>
                  <th className="px-3.5 py-2.5">Directive Action</th>
                  <th className="px-3.5 py-2.5">Operational Details</th>
                  <th className="px-3.5 py-2.5">Authorizing Executive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {accessAuditLog.map((log) => {
                  const isRevokeAction = log.action === 'access_revoked';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        {log.targetStaffName}
                        <span className="text-[10px] text-slate-400 block font-normal capitalize">
                          {log.targetRole}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isRevokeAction ? 'bg-rose-500' : 'bg-teal-500'
                            }`}
                          />
                          <span
                            className={`font-medium ${
                              isRevokeAction
                                ? 'text-rose-700 dark:text-rose-400 font-semibold'
                                : 'text-teal-700 dark:text-teal-300'
                            }`}
                          >
                            {log.action.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 max-w-sm">
                        {log.description}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.authorizedBy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
