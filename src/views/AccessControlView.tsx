import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { InteractiveSearchBar, SearchSuggestion } from '@/components/ui/InteractiveSearchBar';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Filter, ArrowLeft, X } from 'lucide-react';
import { UserRole, StaffAccessRecord, StaffPermission } from '@/types';
import { PendingStaffApproval, INITIAL_PENDING_APPROVALS } from '@/data/mockData';
import {
  isAdmin,
  canGrantAdmin,
  canRevokeAdmin,
  canDeleteStaff,
} from '@/lib/permissions';

interface AccessControlViewProps {
  activeTab?: 'add_users' | 'edit_users' | 'ledger' | string;
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

export const AccessControlView: React.FC<AccessControlViewProps> = ({ activeTab = 'add_users' }) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'add_users' | 'edit_users' | 'ledger'>(() => {
    if (activeTab === 'edit_users' || activeTab === 'ledger') return activeTab;
    return 'add_users';
  });

  useEffect(() => {
    if (activeTab === 'add_users' || activeTab === 'edit_users' || activeTab === 'ledger') {
      setSelectedSubTab(activeTab);
    }
  }, [activeTab]);
  const {
    currentUser,
    staffAccessList,
    accessAuditLog,
    grantStaffAccess,
    revokeStaffAccess,
    deleteStaffAccount,
    updateStaffCapabilities,
    addStaffAccount,
    addAuditLogEntry,
  } = useAuth();

  const { addDoctor, doctors = [] } = useClinic();

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
      sessionStorage.setItem('cms_pending_approvals_v2', JSON.stringify(pendingApprovals));
    } catch {
      // Fallback
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

  // Capability action confirmation modal state
  interface PendingCapabilityAction {
    staffId: string;
    staffName: string;
    permissionId: string;
    permissionName: string;
    permissionDescription: string;
    action: 'grant' | 'revoke';
    alsoRevokePrescription?: boolean;
  }

  const [pendingCapAction, setPendingCapAction] = useState<PendingCapabilityAction | null>(null);
  const [isCapActionLoading, setIsCapActionLoading] = useState(false);

  const handleRequestCapabilityAction = (
    staff: StaffAccessRecord,
    perm: StaffPermission,
    isCurrentlyGranted: boolean
  ) => {
    if (isCurrentlyGranted) {
      // Check if revoking administrative access
      if (perm.id === 'perm-admin' || perm.name === 'Administrative Access') {
        const check = canRevokeAdmin(currentUser, staff, staffAccessList);
        if (!check.allowed) {
          showNotification({
            type: 'error',
            message: check.reason || 'Administrative access cannot be revoked.',
          });
          return;
        }
      }

      // Revoke action
      const isEmr = perm.id === 'perm-emr' || perm.name === 'EMR Records Access';
      const isPrescGranted = staff.permissions.some(
        (p) => (p.id === 'perm-presc' || p.name === 'Prescription Authoring') && p.enabled
      );
      const alsoRevokePrescription = isEmr && isPrescGranted;

      setPendingCapAction({
        staffId: staff.id,
        staffName: staff.staffName,
        permissionId: perm.id,
        permissionName: perm.name,
        permissionDescription: perm.description,
        action: 'revoke',
        alsoRevokePrescription,
      });
    } else {
      // Grant action
      if (perm.id === 'perm-admin' || perm.name === 'Administrative Access') {
        if (!canGrantAdmin(currentUser, staff)) {
          showNotification({
            type: 'error',
            message: 'Administrative access can only be granted to active consulting physicians.',
          });
          return;
        }
      }

      setPendingCapAction({
        staffId: staff.id,
        staffName: staff.staffName,
        permissionId: perm.id,
        permissionName: perm.name,
        permissionDescription: perm.description,
        action: 'grant',
        alsoRevokePrescription: false,
      });
    }
  };

  const handleExecuteCapabilityAction = async () => {
    if (!pendingCapAction) return;

    setIsCapActionLoading(true);
    try {
      // In-flight simulated request delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const updates: Array<{ permissionId: string; enabled: boolean }> = [
        {
          permissionId: pendingCapAction.permissionId,
          enabled: pendingCapAction.action === 'grant',
        },
      ];

      if (pendingCapAction.alsoRevokePrescription) {
        const targetStaff = staffAccessList.find((s) => s.id === pendingCapAction.staffId);
        const presc = targetStaff?.permissions.find(
          (p) => p.id === 'perm-presc' || p.name === 'Prescription Authoring'
        );
        if (presc && presc.enabled) {
          updates.push({
            permissionId: presc.id,
            enabled: false,
          });
        }
      }

      updateStaffCapabilities(
        pendingCapAction.staffId,
        updates,
        currentUser?.name || 'Dr. Marcus Vance (Managing Director)'
      );

      if (pendingCapAction.alsoRevokePrescription) {
        showNotification({
          type: 'success',
          message: `Revoked EMR Records Access and dependent Prescription Authoring for ${pendingCapAction.staffName}.`,
        });
      } else {
        const actionVerb = pendingCapAction.action === 'grant' ? 'granted' : 'revoked';
        showNotification({
          type: 'success',
          message: `Capability "${pendingCapAction.permissionName}" successfully ${actionVerb} for ${pendingCapAction.staffName}.`,
        });
      }

      setPendingCapAction(null);
    } catch {
      showNotification({
        type: 'error',
        message: `Failed to update capability "${pendingCapAction.permissionName}". Operational state preserved.`,
      });
    } finally {
      setIsCapActionLoading(false);
    }
  };

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
        pendingCapAction !== null ||
        isDiscardModalOpen ||
        deleteTarget !== null ||
        isAddModalOpen ||
        isProvisionConfirmOpen ||
        approveTarget !== null ||
        rejectTarget !== null;

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
        pendingCapAction !== null ||
        isDiscardModalOpen ||
        deleteTarget !== null ||
        isAddModalOpen ||
        isProvisionConfirmOpen ||
        approveTarget !== null ||
        rejectTarget !== null;

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
    pendingCapAction,
    isDiscardModalOpen,
    deleteTarget,
    isAddModalOpen,
    hasUnsavedChanges,
    isProvisionConfirmOpen,
    approveTarget,
    rejectTarget,
  ]);

  // Handlers for Onboarding Approvals
  const handleApprovePending = (req: PendingStaffApproval) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newRecord: StaffAccessRecord = {
      id: `acc-${req.role}-${Date.now()}`,
      role: req.role,
      staffName: req.staffName,
      staffTitle: req.staffTitle,
      department: req.department,
      badgeNumber: req.badgeNumber,
      status: 'granted',
      lastUpdated: timestamp,
      updatedBy: 'Dr. Marcus Vance (Managing Director)',
      reason: 'Onboarding application authorized by Managing Director',
      permissions:
        req.role === 'doctor'
          ? DEFAULT_DOCTOR_PERMISSIONS
          : DEFAULT_RECEPTIONIST_PERMISSIONS,
    };

    addStaffAccount(
      newRecord,
      `Approved onboarding request for ${req.staffName} as ${req.role === 'doctor' ? 'Staff Physician' : 'Receptionist'}`
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
    showNotification({
      type: 'success',
      message: `Approved and granted clearance for ${req.staffName} (${req.role === 'doctor' ? 'Doctor' : 'Receptionist'}).`,
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

    const newRecord: StaffAccessRecord = {
      id: `acc-${addFormRole}-${Date.now()}`,
      role: addFormRole,
      staffName: savedName,
      staffTitle: assignedTitle,
      department: addFormDepartment.trim(),
      badgeNumber: assignedBadge,
      status: 'granted',
      lastUpdated: timestamp,
      updatedBy: 'Dr. Marcus Vance (Managing Director)',
      reason: 'Directly provisioned and authorized by Managing Director',
      permissions:
        addFormRole === 'doctor'
          ? DEFAULT_DOCTOR_PERMISSIONS
          : DEFAULT_RECEPTIONIST_PERMISSIONS,
    };

    addStaffAccount(
      newRecord,
      `Directly provisioned new ${addFormRole === 'doctor' ? 'Doctor' : 'Receptionist'} account for ${savedName}`
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
      message: `Directly provisioned and granted clearance for ${savedName} (${savedRole === 'doctor' ? 'Doctor' : 'Receptionist'}).`,
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

      {/* Sub-Workstation Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        {[
          {
            id: 'add_users' as const,
            label: `Add New Users (${pendingApprovals.length} pending)`,
          },
          {
            id: 'edit_users' as const,
            label: `Edit Users (${staffAccessList.length})`,
          },
          {
            id: 'ledger' as const,
            label: `Security Ledger (${accessAuditLog.length})`,
          },
        ].map((tab) => {
          const isActive = selectedSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedSubTab(tab.id);
                setSelectedStaffId(null);
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

                      {/* Authorized Capabilities Switchboard */}
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                          <span>Authorized Capabilities & Authorities</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Managing Director Controls
                          </span>
                        </div>

                        {/* Suspended Account Notice (Requirement 6) */}
                        {isRevoked && (
                          <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Access revoked. Restore access to edit capabilities.</span>
                          </div>
                        )}

                        <div className="space-y-2 divide-y divide-slate-200/70 dark:divide-slate-700/60">
                          {(() => {
                            let permissionsToDisplay = activeStaff.permissions;
                            if (activeStaff.role === 'doctor') {
                              const hasAdmin = permissionsToDisplay.some(
                                (p) => p.id === 'perm-admin' || p.name === 'Administrative Access'
                              );
                              if (!hasAdmin) {
                                permissionsToDisplay = [
                                  {
                                    id: 'perm-admin',
                                    name: 'Administrative Access',
                                    description: 'Clinic configuration, staff access control, and master ledger management',
                                    enabled: Boolean(activeStaff.isOriginalAdmin || activeStaff.id === 'acc-doc-1'),
                                  },
                                  ...permissionsToDisplay,
                                ];
                              }
                            } else if (activeStaff.role === 'receptionist') {
                              const defaultIds = ['perm-register', 'perm-checkin', 'perm-payment'];
                              const list = [...permissionsToDisplay];
                              for (const def of DEFAULT_RECEPTIONIST_PERMISSIONS) {
                                if (!list.some((p) => p.id === def.id || p.name.toLowerCase() === def.name.toLowerCase())) {
                                  list.push(def);
                                }
                              }
                              permissionsToDisplay = list.filter((p) => defaultIds.includes(p.id));
                            }

                            return permissionsToDisplay.map((perm) => {
                              const isGranted = perm.enabled;

                              // Dependency Rule (Requirement 5):
                              // Prescription Authoring cannot be granted while EMR Records Access is Not granted.
                              const isEmrGranted = activeStaff.permissions.some(
                                (p) => (p.id === 'perm-emr' || p.name === 'EMR Records Access') && p.enabled
                              );
                              const isPrescriptionAuth =
                                perm.id === 'perm-presc' || perm.name === 'Prescription Authoring';
                              const isGrantDisabledByDependency = !isGranted && isPrescriptionAuth && !isEmrGranted;

                              // Admin Revocation Protection Rule
                              const isAdminPerm = perm.id === 'perm-admin' || perm.name === 'Administrative Access';
                              const adminRevokeCheck =
                                isAdminPerm && isGranted
                                  ? canRevokeAdmin(currentUser, activeStaff, staffAccessList)
                                  : { allowed: true };
                              const isRevokeBlockedByProtection = isGranted && !adminRevokeCheck.allowed;

                              const isDisabled =
                                isRevoked || isCapActionLoading || isGrantDisabledByDependency || isRevokeBlockedByProtection;

                              const tooltipText = isRevokeBlockedByProtection
                                ? adminRevokeCheck.reason
                                : isGrantDisabledByDependency
                                ? 'Requires EMR Records Access'
                                : isRevoked
                                ? 'Access revoked. Restore access to edit capabilities.'
                                : undefined;

                              return (
                                <div
                                  key={perm.id}
                                  className="pt-2.5 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                      {perm.name}
                                    </div>
                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                      {perm.description}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {/* 1. Status Label: plain text "Granted" or "Not granted" using app's existing badge style. Same style for both */}
                                    <Badge variant="neutral" size="sm">
                                      {isGranted ? 'Granted' : 'Not granted'}
                                    </Badge>

                                    {/* 2. Action Button: If Granted -> standard secondary button "Revoke"; If Not granted -> standard primary button "Grant" */}
                                    <div className="inline-block" title={tooltipText}>
                                      <Button
                                        size="sm"
                                        variant={isGranted ? 'secondary' : 'primary'}
                                        disabled={isDisabled}
                                        aria-label={`${isGranted ? 'Revoke' : 'Grant'} ${perm.name}`}
                                        title={tooltipText}
                                        onClick={() =>
                                          handleRequestCapabilityAction(activeStaff, perm, isGranted)
                                        }
                                      >
                                        {isGranted ? 'Revoke' : 'Grant'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
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
                    <div className="w-full sm:w-56 shrink-0">
                      <Select
                        icon={<Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                        value={selectedRoleFilter}
                        placeholder="All roles"
                        onChange={(e) => {
                          const newRole = e.target.value as RoleFilterKey;
                          setSelectedRoleFilter(newRole);
                          setSelectedStaffId(null);
                        }}
                        options={[
                          { value: '', label: 'All roles' },
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
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    {!isPatientSection ? (
                                      <>
                                        <TableHead>Department</TableHead>
                                        <TableHead>ID</TableHead>
                                      </>
                                    ) : (
                                      <TableHead>MRN</TableHead>
                                    )}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedStaff.map((staff) => {
                                    const specialization =
                                      (staff as { specialization?: string }).specialization ||
                                      doctors.find((d) => d.name.toLowerCase() === staff.staffName.toLowerCase())
                                        ?.specialization;
                                    const grantedCount = staff.permissions.filter((p) => p.enabled).length;
                                    const totalCount = staff.permissions.length;

                                    return (
                                      <TableRow key={staff.id}>
                                        <TableCell>
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
                                          <TableCell>
                                            <div className="text-slate-700 dark:text-slate-300">
                                              {staff.department}
                                            </div>
                                            {specialization && (
                                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {specialization}
                                              </div>
                                            )}
                                          </TableCell>
                                        )}
                                        <TableCell className="text-slate-700 dark:text-slate-300">
                                          {staff.badgeNumber}
                                        </TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300">
                                          {staff.status === 'revoked' ? 'Revoked' : 'Active'}
                                        </TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300">
                                          {grantedCount} of {totalCount} granted
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
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

      {/* SUB-MODULE 1: ADD NEW USERS */}
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Role
                  </label>
                  <Select
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Badge ID</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedApprovals.length > 0 ? (
                      paginatedApprovals.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{req.staffName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{req.staffTitle}</div>
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">
                            {req.role === 'doctor' ? 'Doctor' : 'Receptionist'}
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-700 dark:text-slate-300">{req.department}</div>
                            {req.specialization && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">{req.specialization}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">
                            {req.badgeNumber}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                            {req.requestedAt}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xs" title={req.notes}>
                              {req.notes}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Authorized By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLog.length > 0 ? (
                      paginatedAuditLog.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {log.timestamp}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatActionLabel(log.action)}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {log.targetStaffName}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 capitalize whitespace-nowrap">
                            {log.targetRole}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 max-w-md">
                            <div className="line-clamp-2" title={log.description}>
                              {log.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
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

      {/* Capability Confirmation Modal (Requirements 3, 4, 5) */}
      <Modal
        isOpen={pendingCapAction !== null}
        onClose={() => {
          if (!isCapActionLoading) setPendingCapAction(null);
        }}
        title={
          pendingCapAction?.action === 'grant'
            ? 'Confirm Grant Capability'
            : pendingCapAction?.alsoRevokePrescription
            ? 'Confirm Revoke Capability & Dependencies'
            : 'Confirm Revoke Capability'
        }
        description="Administrative confirmation for workstation authority"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingCapAction(null)}
              disabled={isCapActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={pendingCapAction?.action === 'grant' ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleExecuteCapabilityAction}
              isLoading={isCapActionLoading}
            >
              Confirm
            </Button>
          </>
        }
      >
        {pendingCapAction && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Personnel Name:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {pendingCapAction.staffName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Capability:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {pendingCapAction.permissionName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Requested Action:</span>
                <span className="font-medium capitalize text-slate-800 dark:text-slate-200">
                  {pendingCapAction.action === 'grant' ? 'Grant Capability' : 'Revoke Capability'}
                </span>
              </div>
            </div>

            {/* Operational Effect Statement */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  Operational Effect:
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {pendingCapAction.action === 'grant'
                    ? `Granting this authority allows ${pendingCapAction.staffName} to ${pendingCapAction.permissionDescription.toLowerCase()}.`
                    : `Revoking this authority prevents ${pendingCapAction.staffName} from ${pendingCapAction.permissionDescription.toLowerCase()}.`}
                </span>
              </div>
            </div>

            {/* Dependency Policy Warning (Requirement 5) */}
            {pendingCapAction.alsoRevokePrescription && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-slate-500 mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                    Dependency Policy Warning:
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Prescription Authoring requires active EMR Records Access. Revoking EMR Records Access prompts to also revoke Prescription Authoring for {pendingCapAction.staffName}. Both capabilities will be revoked upon confirmation.
                  </span>
                </div>
              </div>
            )}

            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to proceed with this administrative change? This action will be logged in the Security Audit Ledger.
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
        maxWidth="lg"
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
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Target Role <span className="text-rose-500">*</span>
            </label>
            <Select
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
    </div>
  );
};
