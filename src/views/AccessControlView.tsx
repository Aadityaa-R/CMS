import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  Search,
  Filter,
} from 'lucide-react';
import { UserRole, StaffAccessRecord } from '@/types';

type RoleFilterKey = '' | 'doc' | 'receptionist' | 'patient';

interface RoleSectionMeta {
  key: 'doc' | 'receptionist' | 'patient';
  role: UserRole;
  title: string;
  badgeLabel: string;
  shortLabel: string;
  description: string;
}

const ROLE_SECTIONS: RoleSectionMeta[] = [
  {
    key: 'doc',
    role: 'doctor',
    title: 'Doctor / Physician Access',
    badgeLabel: 'Staff Physicians',
    shortLabel: 'Doctors',
    description: 'Staff consulting physicians operating outpatient desks under Managing Director clinical governance.',
  },
  {
    key: 'receptionist',
    role: 'receptionist',
    title: 'Receptionist Workstation',
    badgeLabel: 'Front Desk',
    shortLabel: 'Receptionists',
    description: 'Front desk admissions, patient check-in, token dispatch, and consultation scheduling clearance.',
  },
  {
    key: 'patient',
    role: 'patient',
    title: 'Patient Portal Access',
    badgeLabel: 'Outpatient Accounts',
    shortLabel: 'Patients',
    description: 'Verified outpatient self-service accounts, personal EMR access clearance, and digital self-service authorities.',
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

  // Active role filter: '' (unselected) | 'doc' | 'receptionist' | 'patient'
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleFilterKey>('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // State to track which person has their control panel open
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

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

  // Filter staff by search query
  const filteredStaff = staffAccessList.filter((staff) => {
    const query = searchTerm.toLowerCase().trim();
    return (
      query === '' ||
      staff.staffName.toLowerCase().includes(query) ||
      staff.department.toLowerCase().includes(query) ||
      staff.badgeNumber.toLowerCase().includes(query) ||
      staff.role.toLowerCase().includes(query)
    );
  });

  // Helper to get staff for a specific role
  const getStaffForRole = (role: UserRole) => {
    return filteredStaff.filter((s) => s.role === role);
  };

  // Base candidate sections: empty if no role selected, otherwise strictly the selected role
  const candidateSections = selectedRoleFilter
    ? ROLE_SECTIONS.filter((s) => s.key === selectedRoleFilter)
    : [];

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
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-[10px] font-bold text-teal-300 tracking-wider uppercase">
              Managing Director Console
            </span>
            <span>•</span>
            <span className="text-slate-300 font-medium">Supreme Administrative Authority</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-slate-100 tracking-tight">
            Staff Access Control & Security Governance
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Authorized by <strong>Dr. Marcus Vance, MD</strong> (Managing Director). Manage workstation clearances, revoke access, and configure granular permissions across Doctors, Receptionists, and Patients.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-xs text-slate-200">
            <span>MD Non-Revocable Authority</span>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards (Decorative icons removed per design directive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Personnel & Roles"
          value={totalPersonnel.toString()}
          subtitle="Total accounts in directory"
          colorScheme="teal"
        />
        <StatCard
          title="Active Clearances"
          value={activeGranted.toString()}
          subtitle="Workstations operational"
          colorScheme="teal"
        />
        <StatCard
          title="Suspended Clearances"
          value={suspendedRevoked.toString()}
          subtitle="Workstation access revoked"
          colorScheme={suspendedRevoked > 0 ? 'rose' : 'teal'}
        />
        <StatCard
          title="Audit Trail State"
          value="Enforced"
          subtitle="Managing Director ledger active"
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
              Select role to view access controls:
            </span>
          </div>

          {/* Role Filter Dropdown using custom Design-System Select (Filter icon inside the box) */}
          <div className="w-full sm:w-64">
            <Select
              icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
              value={selectedRoleFilter}
              placeholder="Select Role"
              onChange={(e) => {
                const newRole = e.target.value as RoleFilterKey;
                setSelectedRoleFilter(newRole);
                setSelectedStaffId(null);
              }}
              options={[
                { value: '', label: 'Select Role' },
                { value: 'doc', label: `Doctors (${docCount})` },
                { value: 'receptionist', label: `Receptionists (${receptionistCount})` },
                { value: 'patient', label: `Patients (${patientCount})` },
              ]}
            />
          </div>
        </div>

        {/* Toolbar: Search input (secondary status filter removed per directive) */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search personnel by name, department, badge #, or role..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Main Role Sections Layout (Only displays role data when a role is selected) */}
      <div className="space-y-6">
        {!selectedRoleFilter ? (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Please Select a Role
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose a role from the clearance governance dropdown above (Doctors, Receptionists, or Patients) to inspect credentials, access logs, and configure workstation permissions.
              </p>
            </div>
          </div>
        ) : displayedSections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
            {searchTerm.trim() !== '' ? (
              <span>
                No personnel found matching &ldquo;<strong>{searchTerm}</strong>&rdquo; within the selected role. Try refining your search query.
              </span>
            ) : (
              <span>No personnel found matching the selected role.</span>
            )}
          </div>
        ) : (
          displayedSections.map((sectionMeta) => {
            const staffInSection = getStaffForRole(sectionMeta.role);

            return (
              <Card key={sectionMeta.key} className="border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader
                  action={
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {staffInSection.length} {staffInSection.length === 1 ? 'Person' : 'Personnel'}
                    </span>
                  }
                >
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {sectionMeta.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {sectionMeta.description}
                    </CardDescription>
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
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                      ({isRevoked ? 'Suspended' : 'Active'})
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {staff.staffTitle} • {staff.department} • Badge: <span className="font-mono">{staff.badgeNumber}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {isSelected ? 'Collapse' : 'Configure Controls'}
                                </span>
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
                                      Clearance Status:
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                      {isRevoked ? 'Suspended by Managing Director' : 'Active & Authorized'}
                                    </span>
                                  </div>

                                  {/* Action Buttons (Icons removed per design directive) */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isRevoked ? (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleGrant(staff.id, staff.staffName)}
                                      >
                                        Grant Access
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRevoke(staff.id, staff.staffName)}
                                      >
                                        Revoke Access
                                      </Button>
                                    )}

                                    {/* Delete Account Option next to Revoke */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                                      onClick={() => handlePromptDelete(staff)}
                                    >
                                      Delete Account
                                    </Button>
                                  </div>
                                </div>

                                {/* Authorized Capabilities Switchboard */}
                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                                    <span>Authorized Capabilities & Authorities</span>
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
            <span className="text-xs text-slate-400 font-mono">
              Immutable Ledger
            </span>
          }
        >
          <div>
            <CardTitle>Managing Director Security Audit Ledger</CardTitle>
            <CardDescription className="mt-0.5">
              Chronological record of access grants, workstation suspensions, account deletions, and permission updates.
            </CardDescription>
          </div>
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
