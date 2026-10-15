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
import { Filter, UserCog, UserPlus, History, ArrowLeft, X } from 'lucide-react';
import { UserRole, StaffAccessRecord, StaffPermission } from '@/types';

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
  { id: 'perm-consult', name: 'Consultation Workstation', description: 'Conduct patient visits and clinical assessments', enabled: true },
  { id: 'perm-emr', name: 'EMR Records Access', description: 'Review medical records, chronic history, and vitals', enabled: true },
  { id: 'perm-presc', name: 'Prescription Authoring', description: 'Generate and sign electronic outpatient prescriptions', enabled: true },
  { id: 'perm-schedule', name: 'Consulting Calendar', description: 'Manage personal schedule and view patient queue', enabled: true },
];

const DEFAULT_RECEPTIONIST_PERMISSIONS: StaffPermission[] = [
  { id: 'perm-terminal', name: 'Terminal Workstation Login', description: 'Access front desk reception desk terminal', enabled: true },
  { id: 'perm-checkin', name: 'Patient Check-In & Tokens', description: 'Check in waiting patients and issue queue tokens', enabled: true },
  { id: 'perm-register', name: 'Patient Registration', description: 'Enroll new outpatients and generate medical record numbers', enabled: true },
  { id: 'perm-book', name: 'Appointment Booking', description: 'Schedule consultations with clinic physicians', enabled: true },
];

interface PendingStaffApproval {
  id: string;
  role: 'doctor' | 'receptionist';
  staffName: string;
  staffTitle: string;
  department: string;
  badgeNumber: string;
  specialization?: string;
  consultationFee?: number;
  requestedAt: string;
  notes: string;
}

const INITIAL_PENDING_APPROVALS: PendingStaffApproval[] = [
  {
    id: 'pend-doc-1',
    role: 'doctor',
    staffName: 'Dr. Clara Oswald',
    staffTitle: 'Staff Consulting Physician',
    department: 'Pediatric & Family Medicine',
    badgeNumber: 'DOC-104',
    specialization: 'Pediatrics & Adolescent Care',
    consultationFee: 110,
    requestedAt: '2026-10-14 09:30',
    notes: 'Board certified in Pediatrics; credential verification completed by HR.',
  },
  {
    id: 'pend-rec-1',
    role: 'receptionist',
    staffName: 'Samuel Vance',
    staffTitle: 'Front Desk Admitting Specialist',
    department: 'Reception & Triage',
    badgeNumber: 'REC-303',
    requestedAt: '2026-10-14 10:15',
    notes: 'Completed clinic terminal intake training; clearance pending MD authorization.',
  },
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
  } = useAuth();

  const { addDoctor } = useClinic();

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

  const resetAddForm = () => {
    setAddFormRole('doctor');
    setAddFormName('');
    setAddFormTitle('');
    setAddFormDepartment('');
    setAddFormBadge('');
    setAddFormSpecialization('');
    setAddFormFee('120');
    setAddFormError('');
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
        isAddModalOpen;

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
        isAddModalOpen;

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
  }, [selectedStaffId, pendingCapAction, isDiscardModalOpen, deleteTarget, isAddModalOpen, hasUnsavedChanges]);

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
    showNotification(
      `Approved and granted clearance for ${req.staffName} (${req.role === 'doctor' ? 'Doctor' : 'Receptionist'}).`
    );
  };

  const handleRejectPending = (id: string, name: string) => {
    setPendingApprovals((prev) => prev.filter((p) => p.id !== id));
    showNotification(`Rejected onboarding application for ${name}.`);
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

    const assignedBadge =
      addFormBadge.trim() ||
      (addFormRole === 'doctor'
        ? `DOC-${100 + staffAccessList.filter((s) => s.role === 'doctor').length + 1}`
        : `REC-${300 + staffAccessList.filter((s) => s.role === 'receptionist').length + 1}`);

    const assignedTitle =
      addFormTitle.trim() ||
      (addFormRole === 'doctor' ? 'Staff Consulting Physician' : 'Front Desk Workstation Coordinator');

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newRecord: StaffAccessRecord = {
      id: `acc-${addFormRole}-${Date.now()}`,
      role: addFormRole,
      staffName: addFormName.trim(),
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
      `Directly provisioned new ${addFormRole === 'doctor' ? 'Doctor' : 'Receptionist'} account for ${addFormName.trim()}`
    );

    if (addFormRole === 'doctor' && addDoctor) {
      addDoctor({
        name: addFormName.trim(),
        specialization: addFormSpecialization.trim() || 'General Medicine',
        qualification: 'MD / MBBS',
        department: addFormDepartment.trim(),
        phone: '+1 (555) 018-9922',
        email: `${addFormName.toLowerCase().replace(/[^a-z]/g, '')}@metropolitanclinic.com`,
        consultationFee: Number(addFormFee) || 120,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        consultationHours: '09:00 - 17:00',
        status: 'active',
        roomNumber: `Suite ${200 + staffAccessList.filter((s) => s.role === 'doctor').length + 1}`,
      });
    }

    setIsAddModalOpen(false);
    resetAddForm();
    showNotification(
      `Directly provisioned and granted clearance for ${addFormName.trim()} (${addFormRole === 'doctor' ? 'Doctor' : 'Receptionist'}).`
    );
  };

  // Counts for role options
  const docCount = staffAccessList.filter((s) => s.role === 'doctor').length;
  const receptionistCount = staffAccessList.filter((s) => s.role === 'receptionist').length;
  const patientCount = staffAccessList.filter((s) => s.role === 'patient').length;

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

  // Candidate sections: filter strictly if role chosen, otherwise display all role sections
  const candidateSections = selectedRoleFilter
    ? ROLE_SECTIONS.filter((s) => s.key === selectedRoleFilter)
    : ROLE_SECTIONS;

  // When searching, display ONLY sections that contain matching personnel!
  const displayedSections = candidateSections.filter((section) => {
    const staffInRole = getStaffForRole(section.role);
    if (searchTerm.trim() !== '') {
      return staffInRole.length > 0;
    }
    return true;
  });

  const isRoleOrSearchActive = true;

  // Pagination State (10 records per page)
  const [auditPage, setAuditPage] = useState(1);
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const getSectionPage = (key: string) => sectionPages[key] || 1;
  const setSectionPage = (key: string, page: number) => setSectionPages((prev) => ({ ...prev, [key]: page }));

  useEffect(() => {
    setAuditPage(1);
    setSectionPages({});
  }, [searchTerm, selectedRoleFilter]);

  const auditPageSize = 10;
  const paginatedAuditLog = accessAuditLog.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);

  const searchSuggestions: SearchSuggestion[] = React.useMemo(() => {
    const list: SearchSuggestion[] = [];
    const seenNames = new Set<string>();
    staffAccessList.forEach((staff) => {
      if (staff.staffName && !seenNames.has(staff.staffName.toLowerCase())) {
        seenNames.add(staff.staffName.toLowerCase());
        list.push({
          label: staff.staffName,
          category: staff.role.toUpperCase(),
          sublabel: `${staff.badgeNumber} • ${staff.department}`,
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
            Administrative & Security Governance
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-xs text-slate-200">
            <span>MD Non-Revocable Authority</span>
          </div>
        </div>
      </div>

      {/* Administrative Sub-Modules Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          {
            id: 'add_users' as const,
            label: 'Add New Users',
            icon: <UserPlus className="w-4 h-4" />,
            badge: pendingApprovals.length > 0 ? `${pendingApprovals.length} pending` : undefined,
            badgeColor: 'amber',
          },
          {
            id: 'edit_users' as const,
            label: 'Edit Users',
            icon: <UserCog className="w-4 h-4" />,
            badge: `${filteredStaff.length}`,
          },
          {
            id: 'ledger' as const,
            label: 'Security Ledger',
            icon: <History className="w-4 h-4" />,
            badge: `${accessAuditLog.length}`,
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
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[11px] font-mono font-medium ${
                    isActive
                      ? 'text-teal-200'
                      : tab.badgeColor === 'amber'
                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  ({tab.badge})
                </span>
              )}
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
                              onClick={() => handleRevoke(activeStaff.id, activeStaff.staffName)}
                            >
                              Revoke Access
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
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
                          {activeStaff.permissions.map((perm) => {
                            const isGranted = perm.enabled;

                            // Dependency Rule (Requirement 5):
                            // Prescription Authoring cannot be granted while EMR Records Access is Not granted.
                            const isEmrGranted = activeStaff.permissions.some(
                              (p) => (p.id === 'perm-emr' || p.name === 'EMR Records Access') && p.enabled
                            );
                            const isPrescriptionAuth =
                              perm.id === 'perm-presc' || perm.name === 'Prescription Authoring';
                            const isGrantDisabledByDependency = !isGranted && isPrescriptionAuth && !isEmrGranted;

                            const isDisabled = isRevoked || isCapActionLoading || isGrantDisabledByDependency;

                            const tooltipText = isGrantDisabledByDependency
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
                          })}
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
                  <div className="shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Clearance Governance
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Search personnel or select role to inspect access controls:
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl lg:justify-end">
                    {/* Search Input with Interactive Dropdown and Autofill */}
                    <div className="relative flex-1 min-w-[200px]">
                      <InteractiveSearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        suggestions={searchSuggestions}
                        placeholder="Search by staff name..."
                      />
                    </div>

                    {/* Role Filter Dropdown with Filter icon inside */}
                    <div className="w-full sm:w-56 shrink-0">
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
                </div>
              </div>

              {/* Main Role Sections Layout (Shows data first when role is chosen or search is active) */}
              {isRoleOrSearchActive && (
                <div className="space-y-6">
                  {displayedSections.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                      {searchTerm.trim() !== '' ? (
                        <span>
                          No personnel found matching &ldquo;<strong>{searchTerm}</strong>&rdquo; within the selected criteria. Try refining your search query.
                        </span>
                      ) : (
                        <span>No personnel found matching the selected role.</span>
                      )}
                    </div>
                  ) : (
                    displayedSections.map((sectionMeta) => {
                      const staffInSection = getStaffForRole(sectionMeta.role);
                      const sectionPage = getSectionPage(sectionMeta.key);
                      const paginatedStaff = staffInSection.slice((sectionPage - 1) * 10, sectionPage * 10);

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
                                    variant="primary"
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
                              <div className="space-y-4">
                                {/* Responsive Staff Card Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {paginatedStaff.map((staff) => {
                                    const isRevoked = staff.status === 'revoked';
                                    const enabledCount = staff.permissions.filter((p) => p.enabled && !isRevoked).length;
                                    const totalCount = staff.permissions.length;
                                    const avatarStyle = getRoleAvatarStyles(staff.role);

                                    return (
                                      <div
                                        key={staff.id}
                                        className="rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-xs"
                                      >
                                        <div className="space-y-3">
                                          {/* Header: Avatar, Name, Status Badge */}
                                          <div className="flex items-start justify-between gap-2.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarStyle}`}
                                              >
                                                {getInitials(staff.staffName)}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {staff.staffName}
                                                  </h4>
                                                  <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                                      isRevoked ? 'bg-rose-500' : 'bg-teal-500'
                                                    }`}
                                                    title={isRevoked ? 'Suspended' : 'Active'}
                                                  />
                                                </div>
                                                <span
                                                  className={`text-xs font-medium inline-block mt-0.5 ${
                                                    isRevoked
                                                      ? 'text-rose-600 dark:text-rose-400'
                                                      : 'text-teal-600 dark:text-teal-400'
                                                  }`}
                                                >
                                                  {isRevoked ? 'Suspended' : 'Active'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Title, Department, Badge */}
                                          <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                                            <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                                              {staff.staffTitle}
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="truncate">{staff.department}</span>
                                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                                                ({staff.badgeNumber})
                                              </span>
                                            </div>
                                          </div>

                                          {/* Permission count */}
                                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                                            <span className="text-slate-400 dark:text-slate-500">Permissions:</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                              {enabledCount}/{totalCount} enabled
                                            </span>
                                          </div>
                                        </div>

                                        {/* Footer Action */}
                                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs"
                                            onClick={(e) => togglePersonSelection(staff.id, e.currentTarget)}
                                          >
                                            Manage Access
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <Pagination
                              currentPage={sectionPage}
                              totalItems={staffInSection.length}
                              pageSize={10}
                              onPageChange={(p) => setSectionPage(sectionMeta.key, p)}
                            />
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
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Directly Provision Staff Member
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Directly register and authorize a new physician or receptionist into the clinic access directory.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDirectAddSubmit} className="space-y-4">
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
                    required
                    placeholder={addFormRole === 'doctor' ? 'e.g. Dr. Julian Bashir' : 'e.g. Sarah Jenkins'}
                    value={addFormName}
                    onChange={(e) => setAddFormName(e.target.value)}
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
                    required
                    placeholder={addFormRole === 'doctor' ? 'e.g. Cardiology & Triage' : 'e.g. Front Desk & Admissions'}
                    value={addFormDepartment}
                    onChange={(e) => setAddFormDepartment(e.target.value)}
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

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">
                      This account will be instantly initialized with active clearance status and standard workstation permissions.
                    </span>
                  </div>
                  <Button type="submit" variant="primary" size="sm" className="shrink-0">
                    Provision & Grant Clearance
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Onboarding & Role Clearance Approvals Notification Box */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader
              action={
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {pendingApprovals.length} {pendingApprovals.length === 1 ? 'Pending Clearance' : 'Pending Clearances'}
                </span>
              }
            >
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Onboarding & Role Clearance Approvals
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review and authorize onboarding requests for Doctor and Receptionist workstations.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    No Pending Onboarding Clearances
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    All candidates have been authorized and processed. Use the direct provisioning form above to add personnel immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {req.staffName}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            ({req.role === 'doctor' ? 'Doctor Workstation' : 'Receptionist Terminal'})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {req.staffTitle} • {req.department} • Badge: <span className="font-mono">{req.badgeNumber}</span>
                          {req.specialization ? ` • ${req.specialization}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Applied: {req.requestedAt} — <span className="italic">{req.notes}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectPending(req.id, req.staffName)}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApprovePending(req)}
                        >
                          Approve Clearance
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-4 py-2">
                {paginatedAuditLog.map((log) => {
                  const isRevokeOrDelete =
                    log.action === 'access_revoked' || log.action === 'account_deleted';
                  const isGranted = log.action === 'access_granted';

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Node Dot */}
                      <span
                        className={`absolute -left-[1.95rem] top-2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-transform group-hover:scale-125 ${
                          isRevokeOrDelete
                            ? 'bg-rose-500'
                            : isGranted
                            ? 'bg-teal-500'
                            : 'bg-slate-400 dark:bg-slate-500'
                        }`}
                      />

                      {/* Log Card */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-semibold uppercase tracking-wider ${
                                isRevokeOrDelete
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isGranted
                                  ? 'text-teal-600 dark:text-teal-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {log.targetStaffName}
                            </span>
                            <span className="text-[11px] text-slate-400 capitalize">
                              ({log.targetRole})
                            </span>
                          </div>

                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                            {log.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                          {log.description}
                        </p>

                        {log.capability && (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
                              {log.capability}
                            </span>
                            {log.oldState && log.newState && (
                              <span>
                                {log.oldState} &rarr; {log.newState}
                              </span>
                            )}
                            {log.targetUserId && (
                              <span className="text-slate-400 font-mono text-[10px]">
                                (ID: {log.targetUserId})
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                          <span>
                            Authorized by: <strong className="text-slate-700 dark:text-slate-300">{log.authorizedBy}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                currentPage={auditPage}
                totalItems={accessAuditLog.length}
                pageSize={auditPageSize}
                onPageChange={setAuditPage}
                className="mt-4"
              />
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
        <form onSubmit={handleDirectAddSubmit} className="space-y-4">
          {addFormError && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200">{addFormError}</span>
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
              required
              placeholder={addFormRole === 'doctor' ? 'e.g. Dr. Julian Bashir' : 'e.g. Sarah Jenkins'}
              value={addFormName}
              onChange={(e) => setAddFormName(e.target.value)}
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
              required
              placeholder={addFormRole === 'doctor' ? 'e.g. Cardiology & Triage' : 'e.g. Front Desk & Admissions'}
              value={addFormDepartment}
              onChange={(e) => setAddFormDepartment(e.target.value)}
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
    </div>
  );
};
