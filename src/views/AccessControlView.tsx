import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableTruncate } from '@/components/ui/Table';
import { Filter, ArrowLeft, X } from 'lucide-react';
import { User, UserRole, StaffAccessRecord, StaffPermission, AccessModule, StandardCapability } from '@/types';
import { PendingStaffApproval, INITIAL_PENDING_APPROVALS } from '@/data/mockData';
import { getAccessItem } from '@/data/accessCatalog';
import {
  isAdmin,
  hasCapability,
  canRevokeAdmin,
  canDeleteStaff,
  canDeleteModule,
  canIncludeAccess,
  canRemoveAccess,
  canRemoveMember,
  getEffectiveAccesses,
} from '@/lib/permissions';
import { getRepository } from '@/data/storage';
import { Account } from '@/types/storage';
import { DataManagementTab } from './DataManagementTab';

interface AccessControlViewProps {
  activeTab?: 'add_users' | 'edit_users' | 'modules' | 'ledger' | 'data' | string;
}

type RoleFilterKey = '' | 'doc' | 'receptionist' | 'patient';

const getInitials = (name: string): string => {
  const clean = name.replace(/^Dr\.\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (clean.slice(0, 2) || 'ST').toUpperCase();
};

const getRoleAvatarStyles = (role: UserRole) => {
  switch (role) {
    case 'doctor':
      return 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800';
    case 'receptionist':
      return 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  }
};

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

const DEFAULT_DOCTOR_PERMISSIONS: StaffPermission[] = [
  { id: 'perm-admin', name: 'Administrative Access', description: 'Promote to clinic administrator with staff management and security ledger authority', enabled: false },
  { id: 'perm-consult', name: 'Consultation Workstation', description: 'Conduct patient visits and clinical assessments', enabled: true },
  { id: 'perm-emr', name: 'EMR Records Access', description: 'Review medical records, chronic history, and vitals', enabled: true },
  { id: 'perm-presc', name: 'Prescription Authoring', description: 'Generate and sign electronic outpatient prescriptions', enabled: true },
  { id: 'perm-schedule', name: 'Consulting Calendar', description: 'Manage personal schedule and view patient queue', enabled: true },
];

const DEFAULT_RECEPTIONIST_PERMISSIONS: StaffPermission[] = [
  { id: 'perm-register', name: 'Patient Registration', description: 'Enroll new outpatients and generate medical record numbers', enabled: true },
  { id: 'perm-checkin', name: 'Patient Check-in', description: 'Check in waiting patients and issue queue tokens', enabled: true },
  { id: 'perm-payment', name: 'Payment Recording', description: 'Record patient billing payments and issue settlement receipts', enabled: true },
];

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0
  );
};

export const AccessControlView: React.FC<AccessControlViewProps> = ({ activeTab = 'modules' }) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'add_users' | 'edit_users' | 'modules' | 'ledger' | 'data'>(() => {
    if (activeTab === 'edit_users' || activeTab === 'add_users' || activeTab === 'ledger' || activeTab === 'data') return activeTab;
    return 'modules';
  });

  useEffect(() => {
    if (
      activeTab === 'add_users' ||
      activeTab === 'edit_users' ||
      activeTab === 'modules' ||
      activeTab === 'roles' ||
      activeTab === 'ledger' ||
      activeTab === 'data'
    ) {
      setSelectedSubTab(activeTab === 'roles' ? 'modules' : (activeTab as any));
    }
  }, [activeTab]);
  const {
    currentUser,
    staffAccessList,
    accessAuditLog,
    grantStaffAccess,
    revokeStaffAccess,
    deleteStaffAccount,
    addStaffAccount,
    addAuditLogEntry,
  } = useAuth();

  const {
    modules = [],
    accessCatalog = [],
    createAccess,
    createModule,
    renameModule,
    deleteModule,
    includeAccess,
    removeAccess,
    addMember,
    removeMember,
    addDoctor,
    doctors = [],
  } = useClinic();

  // Module / Role management state
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);
  const [createModuleName, setCreateModuleName] = useState('');
  const [createModuleDesc, setCreateModuleDesc] = useState('');
  const [createModuleSelectedAccesses, setCreateModuleSelectedAccesses] = useState<StandardCapability[]>([]);
  const [createModuleError, setCreateModuleError] = useState('');

  const [isCreateAccessModalOpen, setIsCreateAccessModalOpen] = useState(false);
  const [newAccessName, setNewAccessName] = useState('');
  const [newAccessDesc, setNewAccessDesc] = useState('');
  const [newAccessError, setNewAccessError] = useState('');

  const [isEditModuleModalOpen, setIsEditModuleModalOpen] = useState(false);
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');
  const [editModuleError, setEditModuleError] = useState('');

  const [isDeleteModuleModalOpen, setIsDeleteModuleModalOpen] = useState(false);
  const [deleteModuleInput, setDeleteModuleInput] = useState('');

  const [modulesPage, setModulesPage] = useState(1);
  const [moduleMembersPage, setModuleMembersPage] = useState(1);

  const [includeAccessTarget, setIncludeAccessTarget] = useState<{
    module: AccessModule;
    accessId: StandardCapability;
    label: string;
  } | null>(null);

  const [removeAccessTarget, setRemoveAccessTarget] = useState<{
    module: AccessModule;
    accessId: StandardCapability;
    label: string;
  } | null>(null);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberSelectedStaffId, setAddMemberSelectedStaffId] = useState('');
  const [addMemberAdminConfirmName, setAddMemberAdminConfirmName] = useState('');
  const [addMemberAdminReason, setAddMemberAdminReason] = useState('');

  const [removeMemberTarget, setRemoveMemberTarget] = useState<{
    module: AccessModule;
    staff: StaffAccessRecord;
  } | null>(null);

  // Access Console (person view) module state
  const [isConsoleAddModuleOpen, setIsConsoleAddModuleOpen] = useState(false);
  const [consoleAddModuleSelectedId, setConsoleAddModuleSelectedId] = useState('');
  const [consoleAddModuleAdminConfirmName, setConsoleAddModuleAdminConfirmName] = useState('');
  const [consoleAddModuleAdminReason, setConsoleAddModuleAdminReason] = useState('');
  const [consoleConfirmRemoveModule, setConsoleConfirmRemoveModule] = useState<{
    moduleId: string;
    moduleName: string;
  } | null>(null);

  const getStaffModules = (staff: StaffAccessRecord | User): AccessModule[] => {
    const ids = [
      staff.id,
      'badgeNumber' in staff ? staff.badgeNumber : undefined,
      'staffName' in staff ? staff.staffName : undefined,
      'name' in staff ? staff.name : undefined,
    ].filter(Boolean) as string[];

    return modules.filter(
      (m) =>
        m.memberIds.some((mid) => ids.includes(mid)) ||
        ('moduleIds' in staff && staff.moduleIds?.includes(m.id))
    );
  };

  const getStaffEffectiveAccessesWithSources = (staff: StaffAccessRecord | User) => {
    const staffMods = getStaffModules(staff);
    const effectiveAccessIds = getEffectiveAccesses(staff, modules);

    return effectiveAccessIds.map((accessId) => {
      const item = getAccessItem(accessId);
      const sourceMods = staffMods
        .filter((m) => m.accessIds.includes(accessId))
        .map((m) => m.name);
      return {
        accessId,
        label: item?.label || accessId,
        description: item?.description || '',
        sourceModuleNames: sourceMods,
      };
    });
  };

  // Role Governance Selection & Search State (Roles tab)
  const [roleSearchTerm, setRoleSearchTerm] = useState('');

  const roleSearchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();

    modules.forEach((mod) => {
      if (!seen.has(mod.name.toLowerCase())) {
        seen.add(mod.name.toLowerCase());
        list.push({
          label: mod.name,
          category: 'Role',
          sublabel: `${mod.accessIds.length} accesses • ${mod.memberIds.length} members`,
        });
      }
    });

    accessCatalog.forEach((item) => {
      if (!seen.has(item.label.toLowerCase())) {
        seen.add(item.label.toLowerCase());
        list.push({
          label: item.label,
          category: 'Access',
          sublabel: item.description,
        });
      }
    });

    staffAccessList.forEach((staff) => {
      if (staff.staffName && !seen.has(staff.staffName.toLowerCase())) {
        seen.add(staff.staffName.toLowerCase());
        list.push({
          label: staff.staffName,
          category: 'Member',
          sublabel: `${staff.badgeNumber} • ${staff.staffTitle}`,
        });
      }
    });

    return list;
  }, [modules, staffAccessList]);

  const filteredRolesList = React.useMemo(() => {
    const query = roleSearchTerm.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((mod) => {
      const nameMatch = mod.name.toLowerCase().includes(query);
      const descMatch = mod.description?.toLowerCase().includes(query);
      const accessMatch = mod.accessIds.some((aid) => {
        const item = getAccessItem(aid);
        return aid.toLowerCase().includes(query) || (item && item.label.toLowerCase().includes(query));
      });
      const memberMatch = mod.memberIds.some((mid) => {
        const staff = staffAccessList.find(
          (s) => s.id === mid || s.badgeNumber === mid || s.staffName === mid
        );
        return staff?.staffName.toLowerCase().includes(query) || mid.toLowerCase().includes(query);
      });
      return Boolean(nameMatch || descMatch || accessMatch || memberMatch);
    });
  }, [modules, roleSearchTerm, staffAccessList]);

  // Active role filter: '' (unselected) | 'doc' | 'receptionist' | 'patient'
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleFilterKey>('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Pending Onboarding Clearance Approvals
  const [pendingApprovals, setPendingApprovals] = useState<PendingStaffApproval[]>(() => {
    try {
      const saved = sessionStorage.getItem('cms_pending_approvals_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_PENDING_APPROVALS;
  });

  useEffect(() => {
    try {
      const repo = getRepository<PendingStaffApproval>('approvals');
      repo.list().then((list) => {
        if (list && list.length > 0) {
          setPendingApprovals(list);
        }
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem('cms_pending_approvals_v2', JSON.stringify(pendingApprovals));
    } catch {
      // Fallback
    }
    try {
      const repo = getRepository<PendingStaffApproval>('approvals');
      repo.replaceAll(pendingApprovals).catch(() => {});
    } catch {
      // Ignore
    }
  }, [pendingApprovals]);

  // Directly Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormRole, setAddFormRole] = useState<'doctor' | 'receptionist'>('doctor');
  const [addFormName, setAddFormName] = useState('');
  const [addFormTitle, setAddFormTitle] = useState('');
  const [addFormDepartment, setAddFormDepartment] = useState('');
  const [addFormBadge, setAddFormBadge] = useState('');
  const [addFormSpecialization, setAddFormSpecialization] = useState('');
  const [addFormFee, setAddFormFee] = useState('120');
  const [addFormError, setAddFormError] = useState('');
  const [addFormTouched, setAddFormTouched] = useState<{ [key: string]: boolean }>({});

  const resetAddForm = () => {
    setAddFormRole('doctor');
    setAddFormName('');
    setAddFormTitle('');
    setAddFormDepartment('');
    setAddFormBadge('');
    setAddFormSpecialization('');
    setAddFormFee('120');
    setAddFormError('');
    setAddFormTouched({});
  };

  // State to track which person has their control panel open
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const prevSelectedStaffIdRef = useRef<string | null>(null);

  // Unsaved changes state (Requirement 3)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState<boolean>(false);

  // State for permanent deletion confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<StaffAccessRecord | null>(null);

  // Modals & pagination for Add New Users tab (Direct Provision & Approvals)
  const [isProvisionConfirmOpen, setIsProvisionConfirmOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PendingStaffApproval | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingStaffApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalsPage, setApprovalsPage] = useState(1);

  // Real-time notification banner
  interface NotificationState {
    message: string;
    type: 'success' | 'error' | 'info';
  }
  const [feedbackNotification, setFeedbackNotification] = useState<NotificationState | null>(null);

  const showNotification = (msg: string | NotificationState) => {
    if (typeof msg === 'string') {
      setFeedbackNotification({ message: msg, type: 'info' });
    } else {
      setFeedbackNotification(msg);
    }
    setTimeout(() => {
      setFeedbackNotification(null);
    }, 4500);
  };

  // Personnel clearance handlers

  const handleGrant = (id: string, name: string) => {
    grantStaffAccess(id, 'Access clearance authorized by Managing Director');
    showNotification(`Access granted for ${name}. Workstation credentials restored.`);
  };

  const handleRevoke = (id: string, name: string) => {
    const target = staffAccessList.find((s) => s.id === id);
    if (target && isAdmin(target)) {
      const check = canRevokeAdmin(currentUser, target, staffAccessList);
      if (!check.allowed) {
        showNotification({
          type: 'error',
          message: check.reason || 'Administrative access cannot be revoked.',
        });
        return;
      }
    }
    revokeStaffAccess(id, 'Station credentials suspended by Managing Director executive order');
    showNotification(`Access revoked for ${name}. Workstation credentials suspended.`);
  };

  const handlePromptDelete = (staff: StaffAccessRecord) => {
    const check = canDeleteStaff(currentUser, staff, staffAccessList);
    if (!check.allowed) {
      showNotification({
        type: 'error',
        message: check.reason || 'Account cannot be deleted.',
      });
      return;
    }
    setDeleteTarget(staff);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const check = canDeleteStaff(currentUser, deleteTarget, staffAccessList);
    if (!check.allowed) {
      showNotification({
        type: 'error',
        message: check.reason || 'Account cannot be deleted.',
      });
      setDeleteTarget(null);
      return;
    }
    const targetName = deleteTarget.staffName;
    const targetId = deleteTarget.id;

    deleteStaffAccount(targetId, `Account permanently deleted and purged from clinic directory by Managing Director`);

    if (selectedStaffId === targetId) {
      performCloseConsole();
    }
    setDeleteTarget(null);
    showNotification(`Account for ${targetName} has been permanently deleted and purged from the clinic directory.`);
  };

  const performCloseConsole = () => {
    setHasUnsavedChanges(false);
    setIsDiscardModalOpen(false);
    setSelectedStaffId(null);
    setTimeout(() => {
      if (openerRef.current && typeof openerRef.current.focus === 'function') {
        openerRef.current.focus();
      }
    }, 50);
  };

  const handleCloseConsole = () => {
    if (hasUnsavedChanges) {
      setIsDiscardModalOpen(true);
    } else {
      performCloseConsole();
    }
  };

  const togglePersonSelection = (staffId: string, openerEl?: HTMLElement | null) => {
    if (selectedStaffId !== staffId) {
      openerRef.current = openerEl || (document.activeElement as HTMLElement) || null;
      setSelectedStaffId(staffId);
    } else {
      handleCloseConsole();
    }
  };

  // Focus return tracking when console closes (Requirement 4)
  useEffect(() => {
    if (prevSelectedStaffIdRef.current && !selectedStaffId) {
      setTimeout(() => {
        if (openerRef.current && typeof openerRef.current.focus === 'function') {
          openerRef.current.focus();
        }
      }, 50);
    }
    prevSelectedStaffIdRef.current = selectedStaffId;
  }, [selectedStaffId]);

  // Initial focus inside console when opened (Requirement 4)
  useEffect(() => {
    if (selectedStaffId && consoleRef.current) {
      const timer = setTimeout(() => {
        if (consoleRef.current) {
          const focusables = getFocusableElements(consoleRef.current);
          if (focusables.length > 0) {
            focusables[0].focus();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedStaffId]);

  // Escape key and focus trap while Access Console is open (Requirements 2, 3, 4)
  useEffect(() => {
    if (!selectedStaffId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any modal dialog is currently open on top of the console
      const isAnyModalOpen =
        isDiscardModalOpen ||
        deleteTarget !== null ||
        isAddModalOpen ||
        isProvisionConfirmOpen ||
        approveTarget !== null ||
        rejectTarget !== null ||
        isCreateModuleModalOpen ||
        isEditModuleModalOpen ||
        isDeleteModuleModalOpen ||
        includeAccessTarget !== null ||
        removeAccessTarget !== null ||
        isAddMemberModalOpen ||
        removeMemberTarget !== null ||
        isConsoleAddModuleOpen ||
        consoleConfirmRemoveModule !== null;

      if (e.key === 'Escape') {
        if (isAnyModalOpen) {
          // If another dialog is open on top of the console, Esc closes only that dialog first, not the console.
          return;
        }
        e.preventDefault();
        handleCloseConsole();
        return;
      }

      // Focus trap inside the console
      if (e.key === 'Tab' && consoleRef.current && !isAnyModalOpen) {
        const focusables = getFocusableElements(consoleRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !consoleRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !consoleRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const isAnyModalOpen =
        isDiscardModalOpen ||
        deleteTarget !== null ||
        isAddModalOpen ||
        isProvisionConfirmOpen ||
        approveTarget !== null ||
        rejectTarget !== null ||
        isCreateModuleModalOpen ||
        isEditModuleModalOpen ||
        isDeleteModuleModalOpen ||
        includeAccessTarget !== null ||
        removeAccessTarget !== null ||
        isAddMemberModalOpen ||
        removeMemberTarget !== null ||
        isConsoleAddModuleOpen ||
        consoleConfirmRemoveModule !== null;

      if (isAnyModalOpen) return;

      if (consoleRef.current && !consoleRef.current.contains(e.target as Node)) {
        const focusables = getFocusableElements(consoleRef.current);
        if (focusables.length > 0) {
          focusables[0].focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [
    selectedStaffId,
    isDiscardModalOpen,
    deleteTarget,
    isAddModalOpen,
    hasUnsavedChanges,
    isProvisionConfirmOpen,
    approveTarget,
    rejectTarget,
    isCreateModuleModalOpen,
    isEditModuleModalOpen,
    isDeleteModuleModalOpen,
    includeAccessTarget,
    removeAccessTarget,
    isAddMemberModalOpen,
    removeMemberTarget,
    isConsoleAddModuleOpen,
    consoleConfirmRemoveModule,
  ]);

  // Handlers for Onboarding Approvals
  const handleApprovePending = (req: PendingStaffApproval) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const defaultModuleId = req.role === 'doctor' ? 'mod-clinical' : 'mod-frontdesk';
    const defaultModuleName = req.role === 'doctor' ? 'Clinical' : 'Front Desk';

    const newRecord: StaffAccessRecord = {
      id: `acc-${req.role}-${Date.now()}`,
      role: req.role,
      staffName: req.staffName,
      staffTitle: req.staffTitle,
      department: req.department,
      badgeNumber: req.badgeNumber,
      status: 'granted',
      lastUpdated: timestamp,
      updatedBy: currentUser?.name || 'Dr. Marcus Vance (Managing Director)',
      reason: 'Onboarding application authorized by Managing Director',
      moduleIds: [defaultModuleId],
      permissions:
        req.role === 'doctor'
          ? DEFAULT_DOCTOR_PERMISSIONS
          : DEFAULT_RECEPTIONIST_PERMISSIONS,
    };

    addStaffAccount(
      newRecord,
      `Approved onboarding request for ${req.staffName} as ${req.role === 'doctor' ? 'Staff Physician' : 'Receptionist'}. Added to default module: ${defaultModuleName}.`
    );

    addMember(
      defaultModuleId,
      newRecord.id,
      'Default module assignment on onboarding approval'
    );

    if (req.role === 'doctor' && addDoctor) {
      addDoctor({
        name: req.staffName,
        specialization: req.specialization || 'General Medicine',
        qualification: 'MD / MBBS',
        department: req.department,
        phone: '+1 (555) 019-8472',
        email: `${req.staffName.toLowerCase().replace(/[^a-z]/g, '')}@metropolitanclinic.com`,
        consultationFee: req.consultationFee || 110,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        consultationHours: '09:00 - 17:00',
        status: 'active',
        roomNumber: 'Suite 204',
      });
    }

    setPendingApprovals((prev) => prev.filter((p) => p.id !== req.id));

    // Activate account in repository if online sign-up
    try {
      const repoAccounts = getRepository<Account>('accounts');
      repoAccounts.list().then(async (accounts) => {
        const matched = accounts.find(
          (a) => a.fullName.toLowerCase() === req.staffName.toLowerCase() && a.status === 'pending'
        );
        if (matched) {
          await repoAccounts.update(matched.id, {
            status: 'active',
            updatedAt: new Date().toISOString(),
          });
        }
      }).catch(() => {});

      const repoApprovals = getRepository<PendingStaffApproval>('approvals');
      repoApprovals.remove(req.id).catch(() => {});
    } catch {
      // Ignore
    }

    showNotification({
      type: 'success',
      message: `Approved and granted clearance for ${req.staffName} (${req.role === 'doctor' ? 'Doctor' : 'Receptionist'}). Added to default module: ${defaultModuleName}.`,
    });
  };

  const isBadgeDuplicate = Boolean(
    addFormBadge.trim() &&
      staffAccessList.some(
        (s) => s.badgeNumber.toLowerCase() === addFormBadge.trim().toLowerCase()
      )
  );

  const isProvisionDisabled =
    !addFormName.trim() ||
    !addFormDepartment.trim() ||
    isBadgeDuplicate ||
    (addFormRole === 'doctor' &&
      (!addFormFee.trim() || isNaN(Number(addFormFee)) || Number(addFormFee) < 0));

  const handleRejectPending = (req: PendingStaffApproval, reason?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    addAuditLogEntry({
      timestamp,
      targetRole: req.role,
      targetStaffName: req.staffName,
      targetUserId: req.badgeNumber,
      action: 'clearance_rejected',
      description:
        reason && reason.trim()
          ? `Onboarding clearance rejected by Managing Director: ${reason.trim()}`
          : 'Onboarding clearance rejected by Managing Director',
      authorizedBy: 'Dr. Marcus Vance (Managing Director)',
    });
    setPendingApprovals((prev) => prev.filter((p) => p.id !== req.id));

    // Update rejection in accounts repository if online sign-up
    try {
      const repoAccounts = getRepository<Account>('accounts');
      repoAccounts.list().then(async (accounts) => {
        const matched = accounts.find(
          (a) => a.fullName.toLowerCase() === req.staffName.toLowerCase() && a.status === 'pending'
        );
        if (matched) {
          await repoAccounts.update(matched.id, {
            status: 'rejected',
            rejectionReason: reason && reason.trim() ? reason.trim() : 'Clearance rejected by Administrator',
            updatedAt: new Date().toISOString(),
          });
        }
      }).catch(() => {});

      const repoApprovals = getRepository<PendingStaffApproval>('approvals');
      repoApprovals.remove(req.id).catch(() => {});
    } catch {
      // Ignore
    }

    showNotification({
      type: 'info',
      message: `Rejected onboarding application for ${req.staffName}${reason && reason.trim() ? `: ${reason.trim()}` : ''}.`,
    });
  };

  const handleDirectAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addFormName.trim()) {
      setAddFormError('Please enter the staff member full name.');
      return;
    }
    if (!addFormDepartment.trim()) {
      setAddFormError('Please enter the department.');
      return;
    }
    if (isBadgeDuplicate) {
      return;
    }

    const assignedBadge =
      addFormBadge.trim() ||
      (addFormRole === 'doctor'
        ? `DOC-${100 + staffAccessList.filter((s) => s.role === 'doctor').length + 1}`
        : `REC-${300 + staffAccessList.filter((s) => s.role === 'receptionist').length + 1}`);

    const assignedTitle =
      addFormTitle.trim() ||
      (addFormRole === 'doctor' ? 'Staff Consulting Physician' : 'Front Desk Workstation Coordinator');

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const savedName = addFormName.trim();
    const savedRole = addFormRole;

    const defaultModuleId = addFormRole === 'doctor' ? 'mod-clinical' : 'mod-frontdesk';
    const defaultModuleName = addFormRole === 'doctor' ? 'Clinical' : 'Front Desk';

    const newRecord: StaffAccessRecord = {
      id: `acc-${addFormRole}-${Date.now()}`,
      role: addFormRole,
      staffName: savedName,
      staffTitle: assignedTitle,
      department: addFormDepartment.trim(),
      badgeNumber: assignedBadge,
      status: 'granted',
      lastUpdated: timestamp,
      updatedBy: currentUser?.name || 'Dr. Marcus Vance (Managing Director)',
      reason: 'Directly provisioned and authorized by Managing Director',
      moduleIds: [defaultModuleId],
      permissions:
        addFormRole === 'doctor'
          ? DEFAULT_DOCTOR_PERMISSIONS
          : DEFAULT_RECEPTIONIST_PERMISSIONS,
    };

    addStaffAccount(
      newRecord,
      `Directly provisioned new ${addFormRole === 'doctor' ? 'Doctor' : 'Receptionist'} account for ${savedName}. Added to default module: ${defaultModuleName}.`
    );

    addMember(
      defaultModuleId,
      newRecord.id,
      'Default module assignment on account provisioning'
    );

    if (addFormRole === 'doctor' && addDoctor) {
      addDoctor({
        name: savedName,
        specialization: addFormSpecialization.trim() || 'General Medicine',
        qualification: 'MD / MBBS',
        department: addFormDepartment.trim(),
        phone: '+1 (555) 018-9922',
        email: `${savedName.toLowerCase().replace(/[^a-z]/g, '')}@metropolitanclinic.com`,
        consultationFee: Number(addFormFee) || 120,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        consultationHours: '09:00 - 17:00',
        status: 'active',
        roomNumber: `Suite ${200 + staffAccessList.filter((s) => s.role === 'doctor').length + 1}`,
      });
    }

    setIsAddModalOpen(false);
    resetAddForm();
    showNotification({
      type: 'success',
      message: `Directly provisioned and granted clearance for ${savedName} (${savedRole === 'doctor' ? 'Doctor' : 'Receptionist'}). Added to default module: ${defaultModuleName}.`,
    });
  };

  // Counts for role options
  const docCount = staffAccessList.filter((s) => s.role === 'doctor').length;
  const receptionistCount = staffAccessList.filter((s) => s.role === 'receptionist').length;
  const patientCount = staffAccessList.filter((s) => s.role === 'patient').length;

  // Filter staff by search query (name, ID and MRN)
  const filteredStaff = staffAccessList.filter((staff) => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      staff.staffName.toLowerCase().includes(query) ||
      staff.badgeNumber.toLowerCase().includes(query) ||
      staff.id.toLowerCase().includes(query)
    );
  });

  // Helper to get staff for a specific role
  const getStaffForRole = (role: UserRole) => {
    return filteredStaff.filter((s) => s.role === role);
  };

  // Candidate sections: filter strictly if role chosen, otherwise display all role sections
  const candidateSections = selectedRoleFilter
    ? ROLE_SECTIONS.filter((s) => s.key === selectedRoleFilter)
    : ROLE_SECTIONS;

  // Hide a section that has no matches
  const displayedSections = candidateSections.filter((section) => {
    const staffInRole = getStaffForRole(section.role);
    return staffInRole.length > 0;
  });

  const isRoleOrSearchActive = true;

  // Security Ledger Filter & Search State
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('');

  const formatActionLabel = (action: string): string => {
    switch (action) {
      case 'access_granted':
        return 'Access Granted';
      case 'access_revoked':
        return 'Access Revoked';
      case 'permission_updated':
        return 'Permission Updated';
      case 'clearance_rejected':
        return 'Clearance Rejected';
      case 'account_deleted':
        return 'Account Deleted';
      case 'security_override':
        return 'Security Override';
      default:
        return action
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
    }
  };

  const actionFilterOptions = [
    { value: '', label: 'All actions' },
    { value: 'access_granted', label: 'Access Granted' },
    { value: 'access_revoked', label: 'Access Revoked' },
    { value: 'permission_updated', label: 'Permission Updated' },
    { value: 'module_created', label: 'Module Created' },
    { value: 'module_renamed', label: 'Module Renamed' },
    { value: 'module_deleted', label: 'Module Deleted' },
    { value: 'module_access_included', label: 'Access Included' },
    { value: 'module_access_removed', label: 'Access Removed' },
    { value: 'module_member_added', label: 'Member Added' },
    { value: 'module_member_removed', label: 'Member Removed' },
    { value: 'clearance_rejected', label: 'Clearance Rejected' },
    { value: 'account_deleted', label: 'Account Deleted' },
    { value: 'security_override', label: 'Security Override' },
  ];

  const sortedAuditLog = React.useMemo(() => {
    return [...accessAuditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [accessAuditLog]);

  const filteredAuditLog = React.useMemo(() => {
    const query = ledgerSearchTerm.trim().toLowerCase();
    return sortedAuditLog.filter((log) => {
      if (selectedActionFilter && log.action !== selectedActionFilter) {
        return false;
      }
      if (!query) return true;
      const subjectMatch = log.targetStaffName?.toLowerCase().includes(query);
      const actionMatch =
        log.action.toLowerCase().includes(query) ||
        formatActionLabel(log.action).toLowerCase().includes(query);
      const detailsMatch = log.description?.toLowerCase().includes(query);
      return Boolean(subjectMatch || actionMatch || detailsMatch);
    });
  }, [sortedAuditLog, ledgerSearchTerm, selectedActionFilter]);

  const ledgerSearchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const seen = new Set<string>();
    const list: SearchSuggestion[] = [];
    accessAuditLog.forEach((log) => {
      if (log.targetStaffName && !seen.has(log.targetStaffName.toLowerCase())) {
        seen.add(log.targetStaffName.toLowerCase());
        list.push({
          label: log.targetStaffName,
          category: 'Subject',
          sublabel: `${log.targetRole} • ${formatActionLabel(log.action)}`,
        });
      }
    });
    return list;
  }, [accessAuditLog]);

  // Pagination State (10 records per page)
  const [auditPage, setAuditPage] = useState(1);
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const getSectionPage = (key: string, total: number = 0) => {
    const page = sectionPages[key] || 1;
    if (total > 0) {
      const maxPage = Math.max(1, Math.ceil(total / 10));
      return Math.min(page, maxPage);
    }
    return page;
  };
  const setSectionPage = (key: string, page: number) => setSectionPages((prev) => ({ ...prev, [key]: page }));

  useEffect(() => {
    setAuditPage(1);
    setSectionPages({});
  }, [searchTerm, selectedRoleFilter, ledgerSearchTerm, selectedActionFilter]);

  const auditPageSize = 10;
  const paginatedAuditLog = filteredAuditLog.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);

  useEffect(() => {
    if (approvalsPage > 1 && (approvalsPage - 1) * 10 >= pendingApprovals.length) {
      setApprovalsPage(Math.max(1, Math.ceil(pendingApprovals.length / 10)));
    }
  }, [pendingApprovals.length, approvalsPage]);

  const paginatedApprovals = pendingApprovals.slice((approvalsPage - 1) * 10, approvalsPage * 10);

  const searchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seen = new Set<string>();
    staffAccessList.forEach((staff) => {
      if (staff.staffName && !seen.has(staff.staffName.toLowerCase())) {
        seen.add(staff.staffName.toLowerCase());
        list.push({
          label: staff.staffName,
          category: staff.role === 'patient' ? 'Patient' : staff.role === 'doctor' ? 'Doctor' : 'Receptionist',
          sublabel: `${staff.badgeNumber} • ${staff.department}`,
        });
      }
      if (staff.badgeNumber && !seen.has(staff.badgeNumber.toLowerCase())) {
        seen.add(staff.badgeNumber.toLowerCase());
        list.push({
          label: staff.badgeNumber,
          category: staff.role === 'patient' ? 'MRN' : 'ID',
          sublabel: `${staff.staffName} • ${staff.role === 'patient' ? 'Patient' : staff.role === 'doctor' ? 'Doctor' : 'Receptionist'}`,
        });
      }
    });
    return list;
  }, [staffAccessList]);

  return (
    <div className="space-y-6">
      {/* Real-time Directive Notification Banner */}
      {feedbackNotification && (
        <div
          className={`p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-xl border flex items-center justify-between text-xs text-slate-800 dark:text-slate-100 shadow-sm animate-fadeIn ${
            feedbackNotification.type === 'error'
              ? 'border-rose-200 dark:border-rose-800'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                feedbackNotification.type === 'error'
                  ? 'bg-rose-500'
                  : 'bg-teal-500'
              }`}
            />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {feedbackNotification.type === 'error'
                ? 'System Alert:'
                : feedbackNotification.type === 'success'
                ? 'Update Confirmed:'
                : 'Managing Director Directive:'}
            </span>
            <span>{feedbackNotification.message}</span>
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

      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Administrative & Security Governance
          </h2>
        </div>
      </div>

      {/* Sub-Workstation Navigation Tabs (scrollable on mobile) */}
      <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto overflow-y-hidden no-scrollbar scrollbar-none flex-nowrap shrink-0">
        {[
          {
            id: 'modules' as const,
            label: `Roles (${modules.length})`,
          },
          {
            id: 'edit_users' as const,
            label: `Edit Users (${staffAccessList.length})`,
          },
          {
            id: 'add_users' as const,
            label: `Add New Users (${pendingApprovals.length} pending)`,
          },
          {
            id: 'ledger' as const,
            label: `Security Ledger (${accessAuditLog.length})`,
          },
          ...(hasCapability(currentUser, 'administrativeAccess')
            ? [
                {
                  id: 'data' as const,
                  label: 'Data',
                },
              ]
            : []),
        ].map((tab) => {
          const isActive = selectedSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedSubTab(tab.id);
                setSelectedStaffId(null);
                setSelectedModuleId(null);
              }}
              className={`pb-2.5 pt-1 text-xs cursor-pointer whitespace-nowrap focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 ${
                isActive
                  ? 'font-bold text-slate-900 dark:text-slate-100 border-b-2 border-teal-600 -mb-px'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUB-MODULE 1: ROLES */}
      {selectedSubTab === 'modules' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Role Governance & Selection Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Role Clearance Governance
                </span>
              </div>

              {/* Selection Menu container */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
                {/* Search Option */}
                <div className="relative w-full sm:w-80">
                  <InteractiveSearchBar
                    value={roleSearchTerm}
                    onChange={(val) => {
                      setRoleSearchTerm(val);
                      const matchingMod = modules.find(
                        (m) => m.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matchingMod) {
                        setSelectedModuleId(matchingMod.id);
                        setModuleMembersPage(1);
                      }
                    }}
                    suggestions={roleSearchSuggestions}
                    placeholder="Search roles, accesses, or personnel"
                  />
                </div>

                {/* Drop Down Selection Option */}
                <div className="w-full sm:w-64 shrink-0">
                  <Select
                    icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                    searchable={true}
                    searchPlaceholder="Search roles..."
                    value={selectedModuleId || ''}
                    placeholder="All Roles (Directory)"
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedModuleId(newId ? newId : null);
                      setModuleMembersPage(1);
                    }}
                    options={[
                      { value: '', label: `All Roles (${modules.length})` },
                      ...modules.map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.memberIds.length} members)`,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedModuleId ? (
            (() => {
              const currentModule = modules.find((m) => m.id === selectedModuleId);
              if (!currentModule) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                    <p>Selected role could not be found.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-2"
                      onClick={() => setSelectedModuleId(null)}
                    >
                      <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Back to Roles
                    </Button>
                  </div>
                );
              }

              const deleteCheck = canDeleteModule(currentUser, currentModule, modules);
              const membersCount = currentModule.memberIds.length;
              const paginatedMemberIds = currentModule.memberIds.slice(
                (moduleMembersPage - 1) * 10,
                moduleMembersPage * 10
              );

              return (
                <div className="space-y-6">
                  {/* Top Bar with Back Button */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs w-fit"
                      onClick={() => setSelectedModuleId(null)}
                    >
                      <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Back to Roles
                    </Button>
                  </div>

                  {/* Role Header Card */}
                  <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader
                      action={
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditModuleName(currentModule.name);
                              setEditModuleDesc(currentModule.description || '');
                              setEditModuleError('');
                              setIsEditModuleModalOpen(true);
                            }}
                          >
                            Edit Role
                          </Button>
                          <div className="inline-block" title={!deleteCheck.allowed ? deleteCheck.reason : undefined}>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!deleteCheck.allowed}
                              onClick={() => {
                                setDeleteModuleInput('');
                                setIsDeleteModuleModalOpen(true);
                              }}
                            >
                              Delete Role
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {currentModule.name}
                        </CardTitle>
                        {currentModule.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {currentModule.description}
                          </div>
                        )}
                        {!deleteCheck.allowed && deleteCheck.reason && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {deleteCheck.reason}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Accesses Table Card */}
                  <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader
                      action={
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setNewAccessName('');
                            setNewAccessDesc('');
                            setNewAccessError('');
                            setIsCreateAccessModalOpen(true);
                          }}
                        >
                          Add New Access
                        </Button>
                      }
                    >
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Role Accesses ({currentModule.accessIds.length} included)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-3 sm:p-0">
                        <Table stackBelow="md">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-7/12 min-w-[280px]">Access</TableHead>
                              <TableHead className="w-3/12 min-w-[140px]">Status</TableHead>
                              <TableHead className="w-2/12 min-w-[120px] text-right whitespace-nowrap">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accessCatalog.map((item) => {
                              const isIncluded = currentModule.accessIds.includes(item.id);
                              const includeCheck = !isIncluded
                                ? canIncludeAccess(currentUser, currentModule, item.id, modules)
                                : { allowed: true };
                              const removeCheck = isIncluded
                                ? canRemoveAccess(currentUser, currentModule, item.id, modules)
                                : { allowed: true };

                              const isActionDisabled = isIncluded ? !removeCheck.allowed : !includeCheck.allowed;
                              const helperText = isIncluded ? removeCheck.reason : includeCheck.reason;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell label="Access" className="w-7/12 min-w-[280px]">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                      {item.label}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                                      {item.description}
                                    </div>
                                    {helperText && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic break-words">
                                        {helperText}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell label="Status" className="w-3/12 min-w-[140px] text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {isIncluded ? 'Included' : 'Not included'}
                                  </TableCell>
                                  <TableCell label="Action" fullWidthOnStack className="w-2/12 min-w-[120px] text-right whitespace-nowrap">
                                    {isIncluded ? (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={isActionDisabled}
                                        title={helperText}
                                        onClick={() =>
                                          setRemoveAccessTarget({
                                            module: currentModule,
                                            accessId: item.id,
                                            label: item.label,
                                          })
                                        }
                                      >
                                        Remove
                                      </Button>
                                    ) : (
                                      <Button
                                        size="xs"
                                        variant="primary"
                                        disabled={isActionDisabled}
                                        title={helperText}
                                        onClick={() =>
                                          setIncludeAccessTarget({
                                            module: currentModule,
                                            accessId: item.id,
                                            label: item.label,
                                          })
                                        }
                                      >
                                        Include
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Members Table Card */}
                  <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAddMemberSelectedStaffId('');
                            setAddMemberAdminConfirmName('');
                            setAddMemberAdminReason('');
                            setIsAddMemberModalOpen(true);
                          }}
                        >
                          Add Person
                        </Button>
                      }
                    >
                      <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Role Members ({membersCount})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="p-3 sm:p-0">
                        <Table stackBelow="md">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-4/12 min-w-[220px]">Name</TableHead>
                              <TableHead className="w-2/12 min-w-[120px]">Staff Type</TableHead>
                              <TableHead className="w-2/12 min-w-[100px]">ID</TableHead>
                              <TableHead className="w-2/12 min-w-[100px]">Status</TableHead>
                              <TableHead className="w-2/12 min-w-[120px] text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {membersCount === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="py-6 text-center text-xs text-slate-500">
                                  No members assigned to this role.
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedMemberIds.map((mid) => {
                                const staff = staffAccessList.find(
                                  (s) => s.id === mid || s.badgeNumber === mid || s.staffName === mid
                                );
                                const staffName = staff?.staffName || mid;
                                const staffTitle = staff?.staffTitle || 'Staff Member';
                                const staffType =
                                  staff?.role === 'doctor'
                                    ? 'Doctor'
                                    : staff?.role === 'receptionist'
                                    ? 'Receptionist'
                                    : staff?.role === 'patient'
                                    ? 'Patient'
                                    : 'Staff';
                                const badgeNumber = staff?.badgeNumber || mid;
                                const isRevokedStatus = staff?.status === 'revoked';
                                const removeCheck = staff
                                  ? canRemoveMember(currentUser, currentModule, staff, modules, staffAccessList)
                                  : { allowed: true };

                                return (
                                  <TableRow key={mid}>
                                    <TableCell label="Name" className="w-4/12 min-w-[220px]">
                                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                        {staffName}
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {staffTitle}
                                      </div>
                                    </TableCell>
                                    <TableCell label="Staff Type" className="w-2/12 min-w-[120px] text-xs text-slate-700 dark:text-slate-300">
                                      {staffType}
                                    </TableCell>
                                    <TableCell label="ID" className="w-2/12 min-w-[100px] text-xs text-slate-700 dark:text-slate-300 font-mono">
                                      {badgeNumber}
                                    </TableCell>
                                    <TableCell label="Status" className="w-2/12 min-w-[100px] text-xs text-slate-700 dark:text-slate-300">
                                      {isRevokedStatus ? 'Revoked' : 'Active'}
                                    </TableCell>
                                    <TableCell label="Actions" fullWidthOnStack className="w-2/12 min-w-[120px] text-right whitespace-nowrap">
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={!removeCheck.allowed}
                                        title={!removeCheck.allowed ? removeCheck.reason : undefined}
                                        onClick={() => {
                                          if (staff) {
                                            setRemoveMemberTarget({
                                              module: currentModule,
                                              staff,
                                            });
                                          }
                                        }}
                                      >
                                        Remove
                                      </Button>
                                      {!removeCheck.allowed && removeCheck.reason && (
                                        <div className="text-[10px] text-slate-500 mt-1">
                                          {removeCheck.reason}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {membersCount > 10 && (
                        <Pagination
                          currentPage={moduleMembersPage}
                          totalItems={membersCount}
                          pageSize={10}
                          onPageChange={setModuleMembersPage}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()
          ) : (
            /* Roles Directory Table View */
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewAccessName('');
                        setNewAccessDesc('');
                        setNewAccessError('');
                        setIsCreateAccessModalOpen(true);
                      }}
                    >
                      Add New Access
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setCreateModuleName('');
                        setCreateModuleDesc('');
                        setCreateModuleSelectedAccesses([]);
                        setCreateModuleError('');
                        setIsCreateModuleModalOpen(true);
                      }}
                    >
                      Create Role
                    </Button>
                  </div>
                }
              >
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Roles ({filteredRolesList.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-hidden max-w-full">
                  <Table stackBelow="lg">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-5/12 min-w-[260px]">Role</TableHead>
                        <TableHead className="w-2/12 min-w-[130px]">Accesses</TableHead>
                        <TableHead className="w-2/12 min-w-[130px]">Members</TableHead>
                        <TableHead className="w-3/12 min-w-[160px] text-right whitespace-nowrap sticky right-0 bg-slate-50/90 dark:bg-slate-800/90 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRolesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-xs text-slate-500">
                            No roles found matching query.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRolesList.slice((modulesPage - 1) * 10, modulesPage * 10).map((mod) => (
                          <TableRow key={mod.id}>
                            <TableCell label="Role" isPrimary className="w-5/12 min-w-[260px]">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                {mod.name}
                              </div>
                              {mod.description && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {mod.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell label="Accesses" className="w-2/12 min-w-[130px] text-xs text-slate-700 dark:text-slate-300">
                              {mod.accessIds.length} {mod.accessIds.length === 1 ? 'access' : 'accesses'}
                            </TableCell>
                            <TableCell label="Members" className="w-2/12 min-w-[130px] text-xs text-slate-700 dark:text-slate-300">
                              {mod.memberIds.length} {mod.memberIds.length === 1 ? 'member' : 'members'}
                            </TableCell>
                            <TableCell label="Actions" isActions fullWidthOnStack className="w-3/12 min-w-[160px] text-right whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  setSelectedModuleId(mod.id);
                                  setModuleMembersPage(1);
                                }}
                              >
                                Configure Role
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredRolesList.length > 10 && (
                  <Pagination
                    currentPage={modulesPage}
                    totalItems={filteredRolesList.length}
                    pageSize={10}
                    onPageChange={setModulesPage}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SUB-MODULE 2: EDIT USERS */}
      {selectedSubTab === 'edit_users' && (
        <div className="space-y-6 animate-fadeIn">
          {selectedStaffId ? (
            (() => {
              const activeStaff = staffAccessList.find((s) => s.id === selectedStaffId);
              if (!activeStaff) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                    <p>Selected personnel could not be located in directory.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-2"
                      onClick={handleCloseConsole}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Staff Directory
                    </Button>
                  </div>
                );
              }

              const isRevoked = activeStaff.status === 'revoked';
              const avatarStyle = getRoleAvatarStyles(activeStaff.role);

              return (
                <div ref={consoleRef} tabIndex={-1} className="space-y-4 animate-fadeIn focus:outline-none">
                  {/* Top Navigation & Context Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs w-fit"
                      onClick={handleCloseConsole}
                    >
                      <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Back to Staff Directory
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Administrative Personnel Control</span>
                      <span>•</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                        {activeStaff.badgeNumber}
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Access Console Card */}
                  <Card className="border border-teal-500/60 dark:border-teal-500/40 shadow-sm">
                    <CardHeader
                      action={
                        <button
                          type="button"
                          onClick={handleCloseConsole}
                          aria-label="Close console"
                          title="Close"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-0 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarStyle}`}
                        >
                          {getInitials(activeStaff.staffName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                              Access Console: {activeStaff.staffName}
                            </CardTitle>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              ({activeStaff.badgeNumber})
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                isRevoked
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-teal-600 dark:text-teal-400'
                              }`}
                            >
                              • {isRevoked ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {activeStaff.staffTitle} • {activeStaff.department}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5 pt-3">
                      {/* Master Station Clearance Actions Bar */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
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

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRevoked ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleGrant(activeStaff.id, activeStaff.staffName)}
                            >
                              Grant Access
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isAdmin(activeStaff) && !canRevokeAdmin(currentUser, activeStaff, staffAccessList).allowed}
                              title={
                                isAdmin(activeStaff) && !canRevokeAdmin(currentUser, activeStaff, staffAccessList).allowed
                                  ? canRevokeAdmin(currentUser, activeStaff, staffAccessList).reason
                                  : undefined
                              }
                              onClick={() => handleRevoke(activeStaff.id, activeStaff.staffName)}
                            >
                              Revoke Access
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                            disabled={!canDeleteStaff(currentUser, activeStaff, staffAccessList).allowed}
                            title={
                              !canDeleteStaff(currentUser, activeStaff, staffAccessList).allowed
                                ? canDeleteStaff(currentUser, activeStaff, staffAccessList).reason
                                : undefined
                            }
                            onClick={() => handlePromptDelete(activeStaff)}
                          >
                            Delete Account
                          </Button>
                        </div>
                      </div>

                      {/* Person's Roles Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              Assigned Roles
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setConsoleAddModuleSelectedId('');
                              setConsoleAddModuleAdminConfirmName('');
                              setConsoleAddModuleAdminReason('');
                              setIsConsoleAddModuleOpen(true);
                            }}
                          >
                            Add to Role
                          </Button>
                        </div>

                        {/* Suspended Account Notice */}
                        {isRevoked && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                            Access revoked. Restore access to activate effective permissions.
                          </div>
                        )}

                        {/* Table of Person's Assigned Roles */}
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                          <Table stackBelow="md">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-6/12 min-w-[200px]">Role</TableHead>
                                <TableHead className="w-3/12 min-w-[120px]">Accesses</TableHead>
                                <TableHead className="w-3/12 min-w-[120px] text-right whitespace-nowrap">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                const staffMods = getStaffModules(activeStaff);
                                if (staffMods.length === 0) {
                                  return (
                                    <TableRow>
                                      <TableCell colSpan={3} className="py-4 text-center text-xs text-slate-500">
                                        Not assigned to any roles.
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                                return staffMods.map((mod) => {
                                  const removeCheck = canRemoveMember(
                                    currentUser,
                                    mod,
                                    activeStaff,
                                    modules,
                                    staffAccessList
                                  );

                                  return (
                                    <TableRow key={mod.id}>
                                      <TableCell label="Role" className="w-6/12 min-w-[200px]">
                                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                          {mod.name}
                                        </div>
                                        {mod.description && (
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {mod.description}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell label="Accesses" className="w-3/12 min-w-[120px] text-xs text-slate-700 dark:text-slate-300">
                                        {mod.accessIds.length} {mod.accessIds.length === 1 ? 'access' : 'accesses'}
                                      </TableCell>
                                      <TableCell label="Actions" fullWidthOnStack className="w-3/12 min-w-[120px] text-right whitespace-nowrap">
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          disabled={!removeCheck.allowed}
                                          title={!removeCheck.allowed ? removeCheck.reason : undefined}
                                          onClick={() =>
                                            setConsoleConfirmRemoveModule({
                                              moduleId: mod.id,
                                              moduleName: mod.name,
                                            })
                                          }
                                        >
                                          Remove
                                        </Button>
                                        {!removeCheck.allowed && removeCheck.reason && (
                                          <div className="text-[10px] text-slate-500 mt-1">
                                            {removeCheck.reason}
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                });
                              })()}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Read-only Effective Accesses Section */}
                        <div className="pt-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                            Effective Accesses
                          </div>
                          {isRevoked ? (
                            <div className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                              Account access is suspended. Effective accesses are inactive until restored.
                            </div>
                          ) : (
                            (() => {
                              const effectiveAccesses = getStaffEffectiveAccessesWithSources(activeStaff);
                              if (effectiveAccesses.length === 0) {
                                return (
                                  <div className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                                    No effective accesses (person belongs to no active roles).
                                  </div>
                                );
                              }
                              return (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                  {effectiveAccesses.map((ea) => (
                                    <div
                                      key={ea.accessId}
                                      className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                                          {ea.label}
                                        </div>
                                        {ea.description && (
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {ea.description}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                                        via {ea.sourceModuleNames.join(', ')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>

                      {/* Audit Directive Footer */}
                      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span>
                          Last Authorized: <strong>{activeStaff.updatedBy}</strong> ({activeStaff.lastUpdated})
                        </span>
                        <span className="italic">{activeStaff.reason || 'Operational clearance in good standing'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()
          ) : (
            <>
              {/* Clearance Governance Bar: Side-by-Side Search & Role Filter with Equal Authority */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Clearance Governance
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
                    {/* Search Input with Interactive Dropdown and Autofill */}
                    <div className="relative w-full sm:w-80">
                      <InteractiveSearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        suggestions={searchSuggestions}
                        placeholder="Search by name or ID"
                      />
                    </div>

                    {/* Role Filter Dropdown with Filter icon inside */}
                    <div className="w-full sm:w-64 shrink-0">
                      <Select
                        icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                        searchable={true}
                        searchPlaceholder="Search staff types..."
                        value={selectedRoleFilter}
                        placeholder="All staff types"
                        onChange={(e) => {
                          const newRole = e.target.value as RoleFilterKey;
                          setSelectedRoleFilter(newRole);
                          setSelectedStaffId(null);
                        }}
                        options={[
                          { value: '', label: 'All staff types' },
                          { value: 'doc', label: `Doctors (${docCount})` },
                          { value: 'receptionist', label: `Receptionists (${receptionistCount})` },
                          { value: 'patient', label: `Patients (${patientCount})` },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Role Sections Layout (Shows data first when role is chosen or search is active) */}
              {isRoleOrSearchActive && (
                <div className="space-y-6">
                  {displayedSections.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No personnel found
                    </div>
                  ) : (
                    displayedSections.map((sectionMeta) => {
                      const staffInSection = getStaffForRole(sectionMeta.role);
                      const sectionPage = getSectionPage(sectionMeta.key, staffInSection.length);
                      const paginatedStaff = staffInSection.slice((sectionPage - 1) * 10, sectionPage * 10);
                      const isPatientSection = sectionMeta.key === 'patient';

                      return (
                        <Card key={sectionMeta.key} className="border border-slate-200 dark:border-slate-800 shadow-sm">
                          <CardHeader
                            action={
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  {staffInSection.length} {staffInSection.length === 1 ? 'Person' : 'Personnel'}
                                </span>
                                {(sectionMeta.key === 'doc' || sectionMeta.key === 'receptionist') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      resetAddForm();
                                      setAddFormRole(sectionMeta.key === 'doc' ? 'doctor' : 'receptionist');
                                      setIsAddModalOpen(true);
                                    }}
                                  >
                                    Directly Add {sectionMeta.key === 'doc' ? 'Doctor' : 'Receptionist'}
                                  </Button>
                                )}
                              </div>
                            }
                          >
                            <div>
                              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {sectionMeta.title}
                              </CardTitle>
                            </div>
                          </CardHeader>

                          <CardContent className="p-0">
                            <div className="overflow-x-auto overflow-y-hidden max-w-full">
                              <Table stackBelow="lg">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className={isPatientSection ? 'w-4/12 min-w-[200px]' : 'w-3/12 min-w-[180px]'}>Name</TableHead>
                                    {!isPatientSection ? (
                                      <>
                                        <TableHead hideBelow="sm" className="w-2/12 min-w-[140px]">Department</TableHead>
                                        <TableHead hideBelow="sm" className="w-1/12 min-w-[80px]">ID</TableHead>
                                      </>
                                    ) : (
                                      <TableHead hideBelow="sm" className="w-2/12 min-w-[100px]">MRN</TableHead>
                                    )}
                                    <TableHead className="w-1/12 min-w-[80px]">Status</TableHead>
                                    <TableHead className="w-3/12 min-w-[160px]">Roles</TableHead>
                                    <TableHead className="w-2/12 min-w-[130px] text-right whitespace-nowrap sticky right-0 bg-slate-50/90 dark:bg-slate-800/90 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedStaff.map((staff) => {
                                    const specialization =
                                      (staff as { specialization?: string }).specialization ||
                                      doctors.find((d) => d.name.toLowerCase() === staff.staffName.toLowerCase())
                                        ?.specialization;
                                    const staffMods = getStaffModules(staff);
                                    const moduleNames = staffMods.map((m) => m.name).join(', ') || 'No roles';

                                    return (
                                      <TableRow key={staff.id}>
                                        <TableCell label="Name" isPrimary className={isPatientSection ? 'w-4/12 min-w-[200px]' : 'w-3/12 min-w-[180px]'}>
                                          <div className="font-bold text-slate-900 dark:text-slate-100">
                                            {staff.staffName}
                                          </div>
                                          {!isPatientSection && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                              {staff.staffTitle}
                                            </div>
                                          )}
                                        </TableCell>
                                        {!isPatientSection && (
                                          <TableCell label="Department" hideBelow="sm" className="w-2/12 min-w-[140px]">
                                            <div className="text-slate-700 dark:text-slate-300">
                                              {staff.department}
                                            </div>
                                            {specialization && specialization.trim().toLowerCase() !== staff.department?.trim().toLowerCase() && (
                                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {specialization}
                                              </div>
                                            )}
                                          </TableCell>
                                        )}
                                        <TableCell label={isPatientSection ? 'MRN' : 'ID'} hideBelow="sm" className={`text-slate-700 dark:text-slate-300 ${isPatientSection ? 'w-2/12 min-w-[100px]' : 'w-1/12 min-w-[80px]'}`}>
                                          <TableTruncate>{staff.badgeNumber}</TableTruncate>
                                        </TableCell>
                                        <TableCell label="Status" className="w-1/12 min-w-[80px] text-slate-700 dark:text-slate-300">
                                          {staff.status === 'revoked' ? 'Revoked' : 'Active'}
                                        </TableCell>
                                        <TableCell label="Roles" className="w-3/12 min-w-[160px] text-slate-700 dark:text-slate-300">
                                          {moduleNames}
                                        </TableCell>
                                        <TableCell label="Actions" isActions fullWidthOnStack className="w-2/12 min-w-[130px] text-right whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                                          <Button
                                            size="xs"
                                            variant="outline"
                                            aria-label={`Manage access for ${staff.staffName}`}
                                            onClick={(e) => togglePersonSelection(staff.id, e.currentTarget)}
                                          >
                                            Manage Access
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            {staffInSection.length > 10 && (
                              <Pagination
                                currentPage={sectionPage}
                                totalItems={staffInSection.length}
                                pageSize={10}
                                onPageChange={(p) => setSectionPage(sectionMeta.key, p)}
                              />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUB-MODULE 3: ADD NEW USERS */}
      {selectedSubTab === 'add_users' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Direct Staff Member Provisioning Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Directly Provision Staff Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isProvisionDisabled) return;
                  setIsProvisionConfirmOpen(true);
                }}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Role
                  </label>
                  <Select
                    size="lg"
                    searchable={true}
                    searchPlaceholder="Search target role..."
                    value={addFormRole}
                    onChange={(e) => setAddFormRole(e.target.value as 'doctor' | 'receptionist')}
                    options={[
                      { value: 'doctor', label: 'Doctor / Consulting Physician' },
                      { value: 'receptionist', label: 'Receptionist / Front Desk Workstation' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label={<>Full Name <span className="text-rose-500">*</span></>}
                    placeholder={addFormRole === 'doctor' ? 'e.g. Dr. Julian Bashir' : 'e.g. Sarah Jenkins'}
                    value={addFormName}
                    onChange={(e) => {
                      setAddFormName(e.target.value);
                      if (addFormError) setAddFormError('');
                    }}
                    onBlur={() => setAddFormTouched((prev) => ({ ...prev, name: true }))}
                    error={
                      (addFormTouched.name && !addFormName.trim()) || (addFormError && !addFormName.trim())
                        ? 'Please enter the staff member full name.'
                        : undefined
                    }
                  />
                  <Input
                    label="Professional Title"
                    placeholder={addFormRole === 'doctor' ? 'e.g. Staff Consulting Physician' : 'e.g. Front Desk Workstation Coordinator'}
                    value={addFormTitle}
                    onChange={(e) => setAddFormTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label={<>Department <span className="text-rose-500">*</span></>}
                    placeholder={addFormRole === 'doctor' ? 'e.g. Cardiology & Triage' : 'e.g. Front Desk & Admissions'}
                    value={addFormDepartment}
                    onChange={(e) => {
                      setAddFormDepartment(e.target.value);
                      if (addFormError) setAddFormError('');
                    }}
                    onBlur={() => setAddFormTouched((prev) => ({ ...prev, department: true }))}
                    error={
                      (addFormTouched.department && !addFormDepartment.trim()) || (addFormError && !addFormDepartment.trim())
                        ? 'Please enter the department.'
                        : undefined
                    }
                  />
                  <Input
                    label="Badge / Staff ID Number"
                    placeholder={addFormRole === 'doctor' ? 'e.g. DOC-105' : 'e.g. REC-304'}
                    value={addFormBadge}
                    onChange={(e) => setAddFormBadge(e.target.value)}
                    error={isBadgeDuplicate ? 'Badge ID already in use' : undefined}
                  />
                </div>

                {addFormRole === 'doctor' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Clinical Specialization"
                      placeholder="e.g. Internal Medicine"
                      value={addFormSpecialization}
                      onChange={(e) => setAddFormSpecialization(e.target.value)}
                    />
                    <Input
                      label="Consultation Fee ($)"
                      type="number"
                      placeholder="120"
                      value={addFormFee}
                      onChange={(e) => setAddFormFee(e.target.value)}
                      onBlur={() => setAddFormTouched((prev) => ({ ...prev, fee: true }))}
                      error={
                        (addFormTouched.fee || addFormFee.trim()) &&
                        (!addFormFee.trim() || isNaN(Number(addFormFee)) || Number(addFormFee) < 0)
                          ? 'Please enter a valid consultation fee'
                          : undefined
                      }
                    />
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isProvisionDisabled}
                  >
                    Provision & Grant Clearance
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Onboarding & Role Clearance Approvals */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader
              action={
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {pendingApprovals.length} {pendingApprovals.length === 1 ? 'Pending Clearance' : 'Pending Clearances'}
                </span>
              }
            >
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Onboarding & Role Clearance Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table stackBelow="lg">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-3/12 min-w-[180px]">Applicant</TableHead>
                      <TableHead className="w-1/12 min-w-[90px]">Role</TableHead>
                      <TableHead hideBelow="sm" className="w-2/12 min-w-[130px]">Department</TableHead>
                      <TableHead hideBelow="sm" className="w-1/12 min-w-[80px]">Badge ID</TableHead>
                      <TableHead hideBelow="md" className="w-1/12 min-w-[90px]">Applied</TableHead>
                      <TableHead hideBelow="lg" className="w-2/12 min-w-[140px]">Notes</TableHead>
                      <TableHead className="w-2/12 min-w-[150px] text-right whitespace-nowrap sticky right-0 bg-slate-50/90 dark:bg-slate-800/90 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApprovals.length > 0 ? (
                      paginatedApprovals.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell label="Applicant" isPrimary className="w-3/12 min-w-[180px]">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{req.staffName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{req.staffTitle}</div>
                          </TableCell>
                          <TableCell label="Role" className="w-1/12 min-w-[90px] text-slate-700 dark:text-slate-300">
                            {req.role === 'doctor' ? 'Doctor' : 'Receptionist'}
                          </TableCell>
                          <TableCell label="Department" hideBelow="sm" className="w-2/12 min-w-[130px]">
                            <div className="text-slate-700 dark:text-slate-300">{req.department}</div>
                            {req.specialization && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">{req.specialization}</div>
                            )}
                          </TableCell>
                          <TableCell label="Badge ID" hideBelow="sm" className="w-1/12 min-w-[80px] text-slate-700 dark:text-slate-300">
                            <TableTruncate>{req.badgeNumber}</TableTruncate>
                          </TableCell>
                          <TableCell label="Applied" hideBelow="md" className="w-1/12 min-w-[90px] text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                            {req.requestedAt}
                          </TableCell>
                          <TableCell label="Notes" hideBelow="lg" className="w-2/12 min-w-[140px]">
                            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={req.notes}>
                              {req.notes}
                            </div>
                          </TableCell>
                          <TableCell label="Actions" isActions fullWidthOnStack className="w-2/12 min-w-[150px] text-right whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-wrap items-center justify-end gap-2 [&_button]:min-h-[44px]">
                              <Button
                                size="xs"
                                variant="outline"
                                className="min-w-[64px]"
                                aria-label={`Approve ${req.staffName}`}
                                onClick={() => setApproveTarget(req)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                className="min-w-[64px]"
                                aria-label={`Reject ${req.staffName}`}
                                onClick={() => {
                                  setRejectTarget(req);
                                  setRejectReason('');
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          No pending clearances
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pendingApprovals.length > 10 && (
                <Pagination
                  currentPage={approvalsPage}
                  totalItems={pendingApprovals.length}
                  pageSize={10}
                  onPageChange={setApprovalsPage}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-MODULE 3: SECURITY LEDGER */}
      {selectedSubTab === 'ledger' && (
        <div className="animate-fadeIn">
          {/* Managing Director Security Audit Ledger */}
          <Card>
            <CardHeader
              action={
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {filteredAuditLog.length} {filteredAuditLog.length === 1 ? 'Entry' : 'Entries'}
                </span>
              }
            >
              <CardTitle>Managing Director Security Audit Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3.5">
              <div className="mb-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative w-full sm:w-80">
                  <InteractiveSearchBar
                    value={ledgerSearchTerm}
                    onChange={setLedgerSearchTerm}
                    suggestions={ledgerSearchSuggestions}
                    placeholder="Search ledger"
                  />
                </div>
                <div className="w-full sm:w-56 shrink-0">
                  <Select
                    value={selectedActionFilter}
                    placeholder="All actions"
                    onChange={(e) => {
                      setSelectedActionFilter(e.target.value);
                    }}
                    options={actionFilterOptions}
                  />
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-hidden max-w-full">
                <Table stackBelow="lg">
                  <TableHeader>
                    <TableRow>
                      <TableHead hideBelow="sm" className="w-2/12 min-w-[130px]">Timestamp</TableHead>
                      <TableHead className="w-2/12 min-w-[130px]">Action</TableHead>
                      <TableHead className="w-2/12 min-w-[130px]">Subject</TableHead>
                      <TableHead hideBelow="sm" className="w-1/12 min-w-[80px]">Role</TableHead>
                      <TableHead className="w-3/12 min-w-[180px]">Details</TableHead>
                      <TableHead hideBelow="md" className="w-2/12 min-w-[140px]">Authorized By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLog.length > 0 ? (
                      paginatedAuditLog.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell label="Timestamp" hideBelow="sm" className="w-2/12 min-w-[130px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {log.timestamp}
                          </TableCell>
                          <TableCell label="Action" className="w-2/12 min-w-[130px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatActionLabel(log.action)}
                          </TableCell>
                          <TableCell label="Subject" isPrimary className="w-2/12 min-w-[130px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {log.targetStaffName}
                          </TableCell>
                          <TableCell label="Role" hideBelow="sm" className="w-1/12 min-w-[80px] text-slate-700 dark:text-slate-300 capitalize whitespace-nowrap">
                            {log.targetRole}
                          </TableCell>
                          <TableCell label="Details" className="w-3/12 min-w-[180px] text-slate-700 dark:text-slate-300">
                            <div className="line-clamp-2" title={log.description}>
                              {log.description}
                            </div>
                          </TableCell>
                          <TableCell label="Authorized By" hideBelow="md" className="w-2/12 min-w-[140px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {log.authorizedBy || 'Dr. Marcus Vance (Managing Director)'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          No ledger entries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredAuditLog.length > auditPageSize && (
                <Pagination
                  currentPage={auditPage}
                  totalItems={filteredAuditLog.length}
                  pageSize={auditPageSize}
                  onPageChange={setAuditPage}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedSubTab === 'data' && currentUser && hasCapability(currentUser, 'administrativeAccess') && (
        <DataManagementTab currentUser={currentUser} />
      )}

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

      {/* Unsaved Changes Confirmation Modal (Requirement 3) */}
      <Modal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        title="Unsaved Changes"
        description="Confirm closing the Access Console"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiscardModalOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={performCloseConsole}
            >
              Discard
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-400">
          You have unsaved changes. Discard and close?
        </p>
      </Modal>

      {/* Directly Add Staff Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Directly Provision Staff Member into Role"
        description="Directly register and authorize a new physician or receptionist into the clinic access directory."
        maxWidth="xl"
        overflowVisible={true}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDirectAddSubmit}
            >
              Provision & Grant Clearance
            </Button>
          </>
        }
      >
        <form onSubmit={handleDirectAddSubmit} className="space-y-4" noValidate>
          {addFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{addFormError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Target Role <span className="text-rose-500">*</span>
            </label>
            <Select
              size="lg"
              searchable={true}
              searchPlaceholder="Search target role..."
              value={addFormRole}
              onChange={(e) => setAddFormRole(e.target.value as 'doctor' | 'receptionist')}
              options={[
                { value: 'doctor', label: 'Doctor / Consulting Physician' },
                { value: 'receptionist', label: 'Receptionist / Front Desk Workstation' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name"
              placeholder={addFormRole === 'doctor' ? 'e.g. Dr. Julian Bashir' : 'e.g. Sarah Jenkins'}
              value={addFormName}
              onChange={(e) => {
                setAddFormName(e.target.value);
                if (addFormError) setAddFormError('');
              }}
              error={!addFormName.trim() && addFormError ? 'Full name is required' : undefined}
            />
            <Input
              label="Professional Title"
              placeholder={addFormRole === 'doctor' ? 'e.g. Staff Consulting Physician' : 'e.g. Front Desk Workstation Coordinator'}
              value={addFormTitle}
              onChange={(e) => setAddFormTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Department"
              placeholder={addFormRole === 'doctor' ? 'e.g. Cardiology & Triage' : 'e.g. Front Desk & Admissions'}
              value={addFormDepartment}
              onChange={(e) => {
                setAddFormDepartment(e.target.value);
                if (addFormError) setAddFormError('');
              }}
              error={!addFormDepartment.trim() && addFormError ? 'Department is required' : undefined}
            />
            <Input
              label="Badge / Staff ID Number"
              placeholder={addFormRole === 'doctor' ? 'e.g. DOC-105' : 'e.g. REC-304'}
              value={addFormBadge}
              onChange={(e) => setAddFormBadge(e.target.value)}
            />
          </div>

          {addFormRole === 'doctor' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Clinical Specialization"
                placeholder="e.g. Internal Medicine"
                value={addFormSpecialization}
                onChange={(e) => setAddFormSpecialization(e.target.value)}
              />
              <Input
                label="Consultation Fee ($)"
                type="number"
                placeholder="120"
                value={addFormFee}
                onChange={(e) => setAddFormFee(e.target.value)}
              />
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              This account will be instantly initialized with active clearance status and standard workstation permissions.
            </span>
          </div>
        </form>
      </Modal>

      {/* Confirm Provision Dialog */}
      <Modal
        isOpen={isProvisionConfirmOpen}
        onClose={() => setIsProvisionConfirmOpen(false)}
        title="Confirm Provisioning"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProvisionConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                handleDirectAddSubmit();
                setIsProvisionConfirmOpen(false);
              }}
            >
              Provision
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Provision {addFormName.trim()} as {addFormRole === 'doctor' ? 'Doctor' : 'Receptionist'}? The account becomes active immediately with standard workstation permissions.
        </p>
      </Modal>

      {/* Approve Clearance Confirmation Modal */}
      <Modal
        isOpen={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        title="Confirm Clearance Approval"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!approveTarget) return;
                handleApprovePending(approveTarget);
                setApproveTarget(null);
              }}
            >
              Approve
            </Button>
          </>
        }
      >
        {approveTarget && (
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Approve onboarding clearance for <strong>{approveTarget.staffName}</strong> as {approveTarget.role === 'doctor' ? 'Doctor' : 'Receptionist'}? The account becomes active immediately with standard workstation permissions.
          </p>
        )}
      </Modal>

      {/* Reject Clearance Confirmation Modal */}
      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        title="Confirm Clearance Rejection"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!rejectTarget) return;
                handleRejectPending(rejectTarget, rejectReason);
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Reject
            </Button>
          </>
        }
      >
        {rejectTarget && (
          <div className="space-y-3">
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Reject onboarding application for <strong>{rejectTarget.staffName}</strong>?
            </p>
            <Input
              label="Reason (optional)"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Create Role Modal */}
      <Modal
        isOpen={isCreateModuleModalOpen}
        onClose={() => {
          setIsCreateModuleModalOpen(false);
          setCreateModuleName('');
          setCreateModuleDesc('');
          setCreateModuleSelectedAccesses([]);
          setCreateModuleError('');
        }}
        title="Create Role"
        maxWidth="xl"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModuleModalOpen(false);
                setCreateModuleName('');
                setCreateModuleDesc('');
                setCreateModuleSelectedAccesses([]);
                setCreateModuleError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const name = createModuleName.trim();
                if (!name) {
                  setCreateModuleError('Role name is required.');
                  return;
                }
                if (modules.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
                  setCreateModuleError('A role with this name already exists.');
                  return;
                }
                const res = createModule(name, createModuleDesc.trim(), createModuleSelectedAccesses);
                if (res.success) {
                  setIsCreateModuleModalOpen(false);
                  setCreateModuleName('');
                  setCreateModuleDesc('');
                  setCreateModuleSelectedAccesses([]);
                  const created = res.module || modules.find((m) => m.name.toLowerCase() === name.toLowerCase());
                  if (created) setSelectedModuleId(created.id);
                  showNotification({
                    type: 'success',
                    message: `Role "${name}" created with ${createModuleSelectedAccesses.length} access(es).`,
                  });
                } else {
                  setCreateModuleError(res.error || 'Failed to create role.');
                }
              }}
            >
              Create Role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={<>Role Name <span className="text-rose-500">*</span></>}
            placeholder="e.g. Clinical Research"
            value={createModuleName}
            onChange={(e) => {
              setCreateModuleName(e.target.value);
              if (createModuleError) setCreateModuleError('');
            }}
            error={createModuleError}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 resize-none h-16"
              placeholder="Operational scope and privileges granted by this role..."
              value={createModuleDesc}
              onChange={(e) => setCreateModuleDesc(e.target.value)}
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assign Access Privileges
                <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                  ({createModuleSelectedAccesses.length} of {accessCatalog.length} selected)
                </span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNewAccessName('');
                    setNewAccessDesc('');
                    setNewAccessError('');
                    setIsCreateAccessModalOpen(true);
                  }}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                >
                  + Add New Access
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setCreateModuleSelectedAccesses(accessCatalog.map((a) => a.id))}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setCreateModuleSelectedAccesses([])}
                  className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 p-1">
              {accessCatalog.map((item) => {
                const isSelected = createModuleSelectedAccesses.includes(item.id);
                const isDocOnly = item.id === 'prescriptionAuthoring';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCreateModuleSelectedAccesses((prev) => {
                        const exists = prev.includes(item.id);
                        if (exists) {
                          if (item.id === 'emrRecordsAccess') {
                            return prev.filter((id) => id !== 'emrRecordsAccess' && id !== 'prescriptionAuthoring');
                          }
                          return prev.filter((id) => id !== item.id);
                        } else {
                          if (item.id === 'prescriptionAuthoring') {
                            return Array.from(new Set([...prev, 'prescriptionAuthoring', 'emrRecordsAccess']));
                          }
                          return [...prev, item.id];
                        }
                      });
                    }}
                    className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60'
                        : 'hover:bg-white dark:hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${
                          isSelected ? 'text-teal-900 dark:text-teal-200 font-semibold' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {item.label}
                        </span>
                        {isDocOnly && (
                          <span className="text-[10px] px-1 py-0.2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
                            Doctors only
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                      {isDocOnly && isSelected && (
                        <p className="text-[10px] text-teal-700 dark:text-teal-400 mt-1 italic">
                          Includes required EMR Records Access dependency.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Access privileges can be modified at any time via the Configure Role panel.
            </p>
          </div>
        </div>
      </Modal>

      {/* Create New Access Privilege Modal */}
      <Modal
        isOpen={isCreateAccessModalOpen}
        onClose={() => {
          setIsCreateAccessModalOpen(false);
          setNewAccessName('');
          setNewAccessDesc('');
          setNewAccessError('');
        }}
        title="Create New Access Privilege"
        description="Define a new operational capability or security privilege to grant across clinic roles."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateAccessModalOpen(false);
                setNewAccessName('');
                setNewAccessDesc('');
                setNewAccessError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const name = newAccessName.trim();
                if (!name) {
                  setNewAccessError('Access privilege name is required.');
                  return;
                }
                const res = createAccess(name, newAccessDesc.trim(), currentUser);
                if (res.success && res.accessItem) {
                  const newItem = res.accessItem;
                  showNotification({
                    type: 'success',
                    message: `Access privilege "${name}" created successfully.`,
                  });
                  if (isCreateModuleModalOpen) {
                    setCreateModuleSelectedAccesses((prev) => [...prev, newItem.id]);
                  }
                  if (selectedModuleId) {
                    includeAccess(selectedModuleId, newItem.id);
                  }
                  setIsCreateAccessModalOpen(false);
                  setNewAccessName('');
                  setNewAccessDesc('');
                  setNewAccessError('');
                } else {
                  setNewAccessError(res.error || 'Failed to create access privilege.');
                }
              }}
            >
              Create Access
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={<>Access Privilege Name <span className="text-rose-500">*</span></>}
            placeholder="e.g. Pharmacy Dispensing, Telehealth Consultations"
            value={newAccessName}
            onChange={(e) => {
              setNewAccessName(e.target.value);
              if (newAccessError) setNewAccessError('');
            }}
            error={newAccessError}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 resize-none h-20"
              placeholder="Operational permissions, clinical scope, or workstation actions granted by this privilege..."
              value={newAccessDesc}
              onChange={(e) => setNewAccessDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditModuleModalOpen}
        onClose={() => {
          setIsEditModuleModalOpen(false);
          setEditModuleError('');
        }}
        title="Edit Role"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditModuleModalOpen(false);
                setEditModuleError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!selectedModuleId) return;
                const name = editModuleName.trim();
                if (!name) {
                  setEditModuleError('Role name is required.');
                  return;
                }
                if (
                  modules.some(
                    (m) => m.id !== selectedModuleId && m.name.toLowerCase() === name.toLowerCase()
                  )
                ) {
                  setEditModuleError('Another role with this name already exists.');
                  return;
                }
                const res = renameModule(selectedModuleId, name, editModuleDesc.trim());
                if (res.success) {
                  setIsEditModuleModalOpen(false);
                  showNotification({
                    type: 'success',
                    message: `Role updated successfully.`,
                  });
                } else {
                  setEditModuleError(res.error || 'Failed to update role.');
                }
              }}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={<>Role Name <span className="text-rose-500">*</span></>}
            value={editModuleName}
            onChange={(e) => {
              setEditModuleName(e.target.value);
              if (editModuleError) setEditModuleError('');
            }}
            error={editModuleError}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 resize-none h-20"
              value={editModuleDesc}
              onChange={(e) => setEditModuleDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Role Modal */}
      {selectedModuleId && (() => {
        const currentMod = modules.find((m) => m.id === selectedModuleId);
        if (!currentMod) return null;
        const isMatched = deleteModuleInput.trim() === currentMod.name.trim();

        return (
          <Modal
            isOpen={isDeleteModuleModalOpen}
            onClose={() => {
              setIsDeleteModuleModalOpen(false);
              setDeleteModuleInput('');
            }}
            title="Delete Role"
            maxWidth="md"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDeleteModuleModalOpen(false);
                    setDeleteModuleInput('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!isMatched}
                  onClick={() => {
                    const res = deleteModule(currentMod.id);
                    if (res.success) {
                      setIsDeleteModuleModalOpen(false);
                      setSelectedModuleId(null);
                      setDeleteModuleInput('');
                      showNotification({
                        type: 'success',
                        message: `Role "${currentMod.name}" deleted successfully.`,
                      });
                    } else {
                      showNotification({
                        type: 'error',
                        message: res.error || 'Failed to delete role.',
                      });
                    }
                  }}
                >
                  Confirm Delete
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Are you sure you want to permanently delete role <strong>{currentMod.name}</strong>? This action cannot be undone.
              </p>
              <Input
                label={<>Type <strong>{currentMod.name}</strong> to confirm deletion</>}
                placeholder={currentMod.name}
                value={deleteModuleInput}
                onChange={(e) => setDeleteModuleInput(e.target.value)}
              />
            </div>
          </Modal>
        );
      })()}

      {/* Include Access Modal */}
      {includeAccessTarget && (
        <Modal
          isOpen={true}
          onClose={() => setIncludeAccessTarget(null)}
          title="Include Access"
          maxWidth="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncludeAccessTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const res = includeAccess(
                    includeAccessTarget.module.id,
                    includeAccessTarget.accessId
                  );
                  if (res.success) {
                    showNotification({
                      type: 'success',
                      message: `Included access "${includeAccessTarget.label}" in role "${includeAccessTarget.module.name}".`,
                    });
                  } else {
                    showNotification({
                      type: 'error',
                      message: res.error || 'Failed to include access.',
                    });
                  }
                  setIncludeAccessTarget(null);
                }}
              >
                Include Access
              </Button>
            </>
          }
        >
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Include <strong>{includeAccessTarget.label}</strong> in role <strong>{includeAccessTarget.module.name}</strong>?
          </p>
        </Modal>
      )}

      {/* Remove Access Modal */}
      {removeAccessTarget && (
        <Modal
          isOpen={true}
          onClose={() => setRemoveAccessTarget(null)}
          title="Remove Access"
          maxWidth="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRemoveAccessTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const res = removeAccess(
                    removeAccessTarget.module.id,
                    removeAccessTarget.accessId
                  );
                  if (res.success) {
                    showNotification({
                      type: 'success',
                      message: `Removed access "${removeAccessTarget.label}" from role "${removeAccessTarget.module.name}".`,
                    });
                  } else {
                    showNotification({
                      type: 'error',
                      message: res.error || 'Failed to remove access.',
                    });
                  }
                  setRemoveAccessTarget(null);
                }}
              >
                Remove Access
              </Button>
            </>
          }
        >
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Remove <strong>{removeAccessTarget.label}</strong> from role <strong>{removeAccessTarget.module.name}</strong>?
          </p>
        </Modal>
      )}

      {/* Add Member to Role Modal */}
      {selectedModuleId && (() => {
        const currentMod = modules.find((m) => m.id === selectedModuleId);
        if (!currentMod) return null;
        const isAdministration = currentMod.id === 'mod-admin' || currentMod.accessIds.includes('administrativeAccess');
        const availableStaff = staffAccessList.filter(
          (s) => !currentMod.memberIds.includes(s.id) && s.status !== 'revoked'
        );
        const selectedStaff = staffAccessList.find((s) => s.id === addMemberSelectedStaffId);
        const isDocOnlyIgnored =
          selectedStaff &&
          currentMod.accessIds.includes('prescriptionAuthoring') &&
          selectedStaff.role !== 'doctor';

        const isAdminNameMatched =
          selectedStaff &&
          addMemberAdminConfirmName.trim().toLowerCase() === selectedStaff.staffName.trim().toLowerCase();
        const isAdminReasonValid = Boolean(addMemberAdminReason.trim());

        const isSubmitDisabled =
          !addMemberSelectedStaffId ||
          (isAdministration && (!isAdminNameMatched || !isAdminReasonValid));

        return (
          <Modal
            isOpen={isAddMemberModalOpen}
            onClose={() => {
              setIsAddMemberModalOpen(false);
              setAddMemberSelectedStaffId('');
              setAddMemberAdminConfirmName('');
              setAddMemberAdminReason('');
            }}
            title={`Add Person to Role: ${currentMod.name}`}
            maxWidth="lg"
            overflowVisible={true}
            bodyClassName="min-h-[280px]"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddMemberModalOpen(false);
                    setAddMemberSelectedStaffId('');
                    setAddMemberAdminConfirmName('');
                    setAddMemberAdminReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitDisabled}
                  onClick={() => {
                    if (!selectedStaff) return;
                    const res = addMember(
                      currentMod.id,
                      selectedStaff.id,
                      isAdministration ? addMemberAdminReason.trim() : undefined
                    );
                    if (res.success) {
                      showNotification({
                        type: 'success',
                        message: `Added ${selectedStaff.staffName} to ${currentMod.name}.`,
                      });
                      setIsAddMemberModalOpen(false);
                      setAddMemberSelectedStaffId('');
                      setAddMemberAdminConfirmName('');
                      setAddMemberAdminReason('');
                    } else {
                      showNotification({
                        type: 'error',
                        message: res.error || 'Failed to add member.',
                      });
                    }
                  }}
                >
                  Add Person
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Staff Member
                </label>
                <Select
                  size="lg"
                  searchable={true}
                  placeholder="Select a staff member..."
                  searchPlaceholder="Search staff member by name, title, or badge ID..."
                  value={addMemberSelectedStaffId}
                  onChange={(e) => setAddMemberSelectedStaffId(e.target.value)}
                  options={availableStaff.map((s) => ({
                    value: s.id,
                    label: `${s.staffName} (${s.staffTitle} - ${s.badgeNumber})`,
                  }))}
                />
              </div>

              {isDocOnlyIgnored && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Prescription Authoring applies to doctors only.
                </p>
              )}

              {isAdministration && selectedStaff && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Adding an administrator grants executive clearance and full security governance.
                  </p>
                  <Input
                    label={<>Type full name <strong>{selectedStaff.staffName}</strong> to confirm</>}
                    placeholder={selectedStaff.staffName}
                    value={addMemberAdminConfirmName}
                    onChange={(e) => setAddMemberAdminConfirmName(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Operational Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 resize-none h-16"
                      placeholder="Operational justification for granting administrative access..."
                      value={addMemberAdminReason}
                      onChange={(e) => setAddMemberAdminReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Remove Member Modal */}
      {removeMemberTarget && (
        <Modal
          isOpen={true}
          onClose={() => setRemoveMemberTarget(null)}
          title="Remove Member from Role"
          maxWidth="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRemoveMemberTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const res = removeMember(
                    removeMemberTarget.module.id,
                    removeMemberTarget.staff.id
                  );
                  if (res.success) {
                    showNotification({
                      type: 'success',
                      message: `Removed ${removeMemberTarget.staff.staffName} from ${removeMemberTarget.module.name}.`,
                    });
                  } else {
                    showNotification({
                      type: 'error',
                      message: res.error || 'Failed to remove member.',
                    });
                  }
                  setRemoveMemberTarget(null);
                }}
              >
                Remove Member
              </Button>
            </>
          }
        >
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Remove <strong>{removeMemberTarget.staff.staffName}</strong> from role <strong>{removeMemberTarget.module.name}</strong>?
          </p>
        </Modal>
      )}

      {/* Console Assign Role Modal */}
      {selectedStaffId && (() => {
        const activeStaff = staffAccessList.find((s) => s.id === selectedStaffId);
        if (!activeStaff) return null;
        const staffMods = getStaffModules(activeStaff);
        const unassignedMods = modules.filter((m) => !staffMods.some((sm) => sm.id === m.id));
        const selectedMod = modules.find((m) => m.id === consoleAddModuleSelectedId);
        const isAdministration = selectedMod && (selectedMod.id === 'mod-admin' || selectedMod.accessIds.includes('administrativeAccess'));
        const isDocOnlyIgnored =
          selectedMod &&
          selectedMod.accessIds.includes('prescriptionAuthoring') &&
          activeStaff.role !== 'doctor';

        const isAdminNameMatched =
          consoleAddModuleAdminConfirmName.trim().toLowerCase() === activeStaff.staffName.trim().toLowerCase();
        const isAdminReasonValid = Boolean(consoleAddModuleAdminReason.trim());

        const isSubmitDisabled =
          !consoleAddModuleSelectedId ||
          (isAdministration && (!isAdminNameMatched || !isAdminReasonValid));

        return (
          <Modal
            isOpen={isConsoleAddModuleOpen}
            onClose={() => {
              setIsConsoleAddModuleOpen(false);
              setConsoleAddModuleSelectedId('');
              setConsoleAddModuleAdminConfirmName('');
              setConsoleAddModuleAdminReason('');
            }}
            title={`Assign Role to ${activeStaff.staffName}`}
            maxWidth="lg"
            overflowVisible={true}
            bodyClassName="min-h-[280px]"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsConsoleAddModuleOpen(false);
                    setConsoleAddModuleSelectedId('');
                    setConsoleAddModuleAdminConfirmName('');
                    setConsoleAddModuleAdminReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitDisabled}
                  onClick={() => {
                    if (!selectedMod) return;
                    const res = addMember(
                      selectedMod.id,
                      activeStaff.id,
                      isAdministration ? consoleAddModuleAdminReason.trim() : undefined
                    );
                    if (res.success) {
                      showNotification({
                        type: 'success',
                        message: `Assigned ${activeStaff.staffName} to ${selectedMod.name}.`,
                      });
                      setIsConsoleAddModuleOpen(false);
                      setConsoleAddModuleSelectedId('');
                      setConsoleAddModuleAdminConfirmName('');
                      setConsoleAddModuleAdminReason('');
                    } else {
                      showNotification({
                        type: 'error',
                        message: res.error || 'Failed to assign role.',
                      });
                    }
                  }}
                >
                  Add to Role
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Role
                </label>
                <Select
                  size="lg"
                  searchable={true}
                  placeholder="Select a role..."
                  searchPlaceholder="Search role by name or description..."
                  value={consoleAddModuleSelectedId}
                  onChange={(e) => setConsoleAddModuleSelectedId(e.target.value)}
                  options={unassignedMods.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.accessIds.length} accesses)`,
                  }))}
                />
              </div>

              {isDocOnlyIgnored && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Prescription Authoring applies to doctors only.
                </p>
              )}

              {isAdministration && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Adding an administrator grants executive clearance and full security governance.
                  </p>
                  <Input
                    label={<>Type full name <strong>{activeStaff.staffName}</strong> to confirm</>}
                    placeholder={activeStaff.staffName}
                    value={consoleAddModuleAdminConfirmName}
                    onChange={(e) => setConsoleAddModuleAdminConfirmName(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Operational Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 resize-none h-16"
                      placeholder="Operational justification for granting administrative access..."
                      value={consoleAddModuleAdminReason}
                      onChange={(e) => setConsoleAddModuleAdminReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Console Remove Role Modal */}
      {selectedStaffId && consoleConfirmRemoveModule && (() => {
        const activeStaff = staffAccessList.find((s) => s.id === selectedStaffId);
        if (!activeStaff) return null;

        return (
          <Modal
            isOpen={true}
            onClose={() => setConsoleConfirmRemoveModule(null)}
            title="Remove Role"
            maxWidth="md"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConsoleConfirmRemoveModule(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const res = removeMember(
                      consoleConfirmRemoveModule.moduleId,
                      activeStaff.id
                    );
                    if (res.success) {
                      showNotification({
                        type: 'success',
                        message: `Removed ${activeStaff.staffName} from ${consoleConfirmRemoveModule.moduleName}.`,
                      });
                    } else {
                      showNotification({
                        type: 'error',
                        message: res.error || 'Failed to remove role.',
                      });
                    }
                    setConsoleConfirmRemoveModule(null);
                  }}
                >
                  Remove Role
                </Button>
              </>
            }
          >
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Remove <strong>{activeStaff.staffName}</strong> from role <strong>{consoleConfirmRemoveModule.moduleName}</strong>?
            </p>
          </Modal>
        );
      })()}
    </div>
  );
};
