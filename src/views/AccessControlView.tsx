import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
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
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { UserRole, StaffAccessRecord } from '@/types';

type RoleFilterKey = 'all' | 'doc' | 'receptionist' | 'patient';

interface RoleSectionMeta {
  key: 'doc' | 'receptionist' | 'patient';
  role: UserRole;
  title: string;
  badgeLabel: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
}

const ROLE_SECTIONS: RoleSectionMeta[] = [
  {
    key: 'doc',
    role: 'doctor',
    title: 'Doctor / Physician Access',
    badgeLabel: 'Staff Physicians',
    shortLabel: 'Doctors',
    description: 'Staff consulting physicians operating outpatient desks under Managing Director clinical governance.',
    icon: <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
  },
  {
    key: 'receptionist',
    role: 'receptionist',
    title: 'Receptionist Workstation',
    badgeLabel: 'Front Desk',
    shortLabel: 'Receptionists',
    description: 'Front desk admissions, patient check-in, token dispatch, and consultation scheduling clearance.',
    icon: <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
  },
  {
    key: 'patient',
    role: 'patient',
    title: 'Patient Portal Access',
    badgeLabel: 'Outpatient Accounts',
    shortLabel: 'Patients',
    description: 'Verified outpatient self-service accounts, personal EMR access, and online consultation booking.',
    icon: <UserIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
  },
];

export const AccessControlView: React.FC = () => {
  const {
    staffAccessList,
    accessAuditLog,
    grantStaffAccess,
    revokeStaffAccess,
    deleteStaffAccount,
    toggleStaffPermission,
  } = useAuth();

  // Active role filter: 'all' | 'doc' | 'receptionist' | 'patient'
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleFilterKey>('all');

  // Search & Status filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'granted' | 'revoked'>('all');

  // State to track which person has their control panel open
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(() => {
    return staffAccessList[0]?.id || null;
  });

  // State for permanent deletion confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<StaffAccessRecord | null>(null);

  // Real-time notification banner
  const [feedbackNotification, setFeedbackNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackNotification(msg);
    setTimeout(() => {
      setFeedbackNotification(null);
    }, 4500);
  };

  const handleGrant = (id: string, name: string) => {
    grantStaffAccess(id, 'Access clearance authorized by Managing Director');
    showNotification(`Access granted for ${name}. Workstation credentials restored.`);
  };

  const handleRevoke = (id: string, name: string) => {
    revokeStaffAccess(id, 'Station credentials suspended by Managing Director executive order');
    showNotification(`Access revoked for ${name}. Workstation credentials suspended.`);
  };

  const handlePromptDelete = (staff: StaffAccessRecord) => {
    setDeleteTarget(staff);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetName = deleteTarget.staffName;
    const targetId = deleteTarget.id;

    deleteStaffAccount(targetId, `Account permanently deleted and purged from clinic directory by Managing Director`);

    if (selectedStaffId === targetId) {
      setSelectedStaffId(null);
    }
    setDeleteTarget(null);
    showNotification(`Account for ${targetName} has been permanently deleted and purged from the clinic directory.`);
  };

  const handleTogglePermission = (recordId: string, permId: string, permName: string) => {
    toggleStaffPermission(recordId, permId);
    showNotification(`Updated permission: ${permName}`);
  };

  const togglePersonSelection = (staffId: string) => {
    setSelectedStaffId((prev) => (prev === staffId ? null : staffId));
  };

  // Counts for role options
  const totalPersonnel = staffAccessList.length;
  const docCount = staffAccessList.filter((s) => s.role === 'doctor').length;
  const receptionistCount = staffAccessList.filter((s) => s.role === 'receptionist').length;
  const patientCount = staffAccessList.filter((s) => s.role === 'patient').length;

  // KPI Calculations
  const activeGranted = staffAccessList.filter((s) => s.status === 'granted').length;
  const suspendedRevoked = staffAccessList.filter((s) => s.status === 'revoked').length;

  // Filter staff by search and status
  const filteredStaff = staffAccessList.filter((staff) => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      staff.staffName.toLowerCase().includes(query) ||
      staff.department.toLowerCase().includes(query) ||
      staff.badgeNumber.toLowerCase().includes(query) ||
      staff.role.toLowerCase().includes(query);

    const matchesStatus =
      filterStatus === 'all' ? true : staff.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Helper to get staff for a specific role
  const getStaffForRole = (role: UserRole) => {
    return filteredStaff.filter((s) => s.role === role);
  };

  // Base candidate sections based on dropdown role filter
  const candidateSections =
    selectedRoleFilter === 'all'
      ? ROLE_SECTIONS
      : ROLE_SECTIONS.filter((s) => s.key === selectedRoleFilter);

  // Search isolation: When searching, display ONLY sections that contain matching personnel!
  const displayedSections = candidateSections.filter((section) => {
    const staffInRole = getStaffForRole(section.role);
    if (searchTerm.trim() !== '') {
      return staffInRole.length > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Real-time Directive Notification Banner */}
      {feedbackNotification && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-800 dark:text-slate-100 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Managing Director Directive:
            </span>
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
            Authorized by <strong>Dr. Marcus Vance, MD</strong> (Managing Director). Manage workstation clearances, revoke access, and configure granular permissions across Doctors, Receptionists, and Patients.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-xs flex items-center gap-2 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>MD Non-Revocable Authority</span>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Personnel & Roles"
          value={totalPersonnel.toString()}
          subtitle="Total accounts in directory"
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
          subtitle="Workstation access revoked"
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

      {/* Clearance Governance & Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Clearance Governance
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Select role filter to view access controls:
            </span>
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label
              htmlFor="role-filter-select"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0"
            >
              <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Role Filter:</span>
            </label>
            <div className="relative min-w-[210px]">
              <select
                id="role-filter-select"
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value as RoleFilterKey)}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-xs"
              >
                <option value="all">All Roles ({totalPersonnel})</option>
                <option value="doc">Doctors ({docCount})</option>
                <option value="receptionist">Receptionists ({receptionistCount})</option>
                <option value="patient">Patients ({patientCount})</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Toolbar: Search and Status Filter */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search personnel by name, department, badge #, or role..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('granted')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'granted'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('revoked')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'revoked'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Main Role Sections Layout with Search Result Isolation */}
      <div className="space-y-6">
        {displayedSections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            {searchTerm.trim() !== '' ? (
              <span>
                No personnel found matching &ldquo;<strong>{searchTerm}</strong>&rdquo;. Try refining your search query or selecting &ldquo;All Roles&rdquo;.
              </span>
            ) : (
              <span>No personnel found matching the selected filter criteria.</span>
            )}
          </div>
        ) : (
          displayedSections.map((sectionMeta) => {
            const staffInSection = getStaffForRole(sectionMeta.role);

            return (
              <Card key={sectionMeta.key} className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader
                  action={
                    <Badge variant="teal">
                      {staffInSection.length} {staffInSection.length === 1 ? 'Person' : 'Personnel'}
                    </Badge>
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {sectionMeta.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {sectionMeta.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {sectionMeta.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                  {staffInSection.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No personnel found matching the current search criteria.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {staffInSection.map((staff) => {
                        const isRevoked = staff.status === 'revoked';
                        const isSelected = selectedStaffId === staff.id;

                        return (
                          <div
                            key={staff.id}
                            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                              isSelected
                                ? 'border-teal-500 bg-slate-50/60 dark:bg-slate-800/40 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {/* Person Header - Name is clickable to open/expand access controls */}
                            <div
                              onClick={() => togglePersonSelection(staff.id)}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {/* Status indicator dot */}
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    isRevoked ? 'bg-rose-500' : 'bg-teal-500'
                                  }`}
                                />

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Person Name Clickable */}
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                                      {staff.staffName}
                                    </h4>
                                    <Badge size="sm" variant={isRevoked ? 'neutral' : 'teal'}>
                                      {isRevoked ? 'Access Revoked' : 'Access Granted'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {staff.staffTitle} • {staff.department} • Badge: <span className="font-mono">{staff.badgeNumber}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                                  {isSelected ? 'Click name to collapse controls' : 'Click name to configure controls'}
                                </span>
                                <div
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isSelected
                                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {isSelected ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded Access Control Console for this Person */}
                            {isSelected && (
                              <div className="px-4 pb-4 pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-4 animate-fadeIn">
                                {/* Master Station Clearance Actions Bar */}
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        isRevoked ? 'bg-rose-500' : 'bg-teal-500'
                                      }`}
                                    />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      Current Workstation Access Status:
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                      {isRevoked ? 'Suspended by Managing Director' : 'Active & Authorized'}
                                    </span>
                                  </div>

                                  {/* Action Buttons: Revoke Option AND next to it: Delete Account Option */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isRevoked ? (
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
                                        icon={<Lock className="w-3.5 h-3.5" />}
                                        onClick={() => handleRevoke(staff.id, staff.staffName)}
                                      >
                                        Revoke Access
                                      </Button>
                                    )}

                                    {/* Delete Account Option next to Revoke */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                                      className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                                      onClick={() => handlePromptDelete(staff)}
                                    >
                                      Delete Account
                                    </Button>
                                  </div>
                                </div>

                                {/* Authorized Workstation Capabilities (Sub-Permissions Switchboard) */}
                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Sliders className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                      <span>Authorized Capabilities</span>
                                    </span>
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
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <span>Last Authorized: <strong>{staff.updatedBy}</strong> ({staff.lastUpdated})</span>
                                  <span className="italic">{staff.reason || 'Operational clearance in good standing'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
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
            Chronological record of access grants, workstation suspensions, account deletions, and permission updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Timestamp</th>
                  <th className="px-3.5 py-2.5">Target Personnel & Role</th>
                  <th className="px-3.5 py-2.5">Directive Action</th>
                  <th className="px-3.5 py-2.5">Operational Details</th>
                  <th className="px-3.5 py-2.5">Authorizing Executive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {accessAuditLog.map((log) => {
                  const isRevokeOrDelete =
                    log.action === 'access_revoked' || log.action === 'account_deleted';

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
                              isRevokeOrDelete ? 'bg-rose-500' : 'bg-teal-500'
                            }`}
                          />
                          <span
                            className={`font-medium ${
                              isRevokeOrDelete
                                ? 'text-slate-900 dark:text-slate-100 font-semibold'
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

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Permanent Account Deletion"
        description="Permanently delete user credentials and purge access clearance from the clinic database."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDelete}
            >
              Confirm Account Deletion
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-4">
            {/* Warning container with neutral background and single red dot */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  Irreversible Administrative Directive
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  All workstation clearance, digital credentials, and capabilities will be permanently erased.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Personnel Name:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{deleteTarget.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Assigned Role:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                  {deleteTarget.role === 'doctor' ? 'Staff Doctor' : deleteTarget.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Badge / MRN:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{deleteTarget.badgeNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Department:</span>
                <span className="text-slate-800 dark:text-slate-200">{deleteTarget.department}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete <strong>{deleteTarget.staffName}</strong>? This action will be logged in the Managing Director Security Audit Ledger.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
