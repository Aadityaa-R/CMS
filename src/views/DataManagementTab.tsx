import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  getStorageStats,
  switchStorageMode,
  exportBackupData,
  importBackupData,
  resetDemoData,
  hasUndoSnapshot,
  restoreUndoSnapshot,
} from '@/data/storage';
import { User } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { BackupData } from '@/types/storage';
import { Download, RotateCcw, AlertCircle, Undo2 } from 'lucide-react';
import { formatLocalDate, formatDate, formatTime } from '@/lib/time';
import { DetailList, DetailItem } from '@/components/ui/DetailList';

const COLLECTION_LABELS: Record<string, string> = {
  accounts: 'Accounts',
  staff: 'Staff',
  patients: 'Patients',
  assignments: 'Assignments',
  appointments: 'Appointments',
  visits: 'Visits',
  prescriptions: 'Prescriptions',
  invoices: 'Invoices',
  payments: 'Payments',
  attendance: 'Attendance',
  leave: 'Leave',
  shifts: 'Shifts',
  roles: 'Roles',
  approvals: 'Approvals',
  claimRequests: 'Claim requests',
  ledger: 'Ledger',
  notifications: 'Notifications',
  formulary: 'Formulary',
  settings: 'Settings',
};

function formatCollectionLabel(col: string): string {
  if (COLLECTION_LABELS[col]) {
    return COLLECTION_LABELS[col];
  }
  const spaced = col.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface DataManagementTabProps {
  currentUser: User;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({ currentUser }) => {
  const { addAuditLogEntry } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Storage Mode Change Modal
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<'browser' | 'memory'>('browser');

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [importConfirmText, setImportConfirmText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  // Reset Demo Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const refreshStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await getStorageStats();
      setStats(data);
      setCanUndo(hasUndoSnapshot());
    } catch {
      // Fallback
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // 1. Storage Mode
  const handleModeChange = (newMode: 'browser' | 'memory') => {
    if (newMode === stats?.mode) return;
    setPendingMode(newMode);
    setIsModeModalOpen(true);
  };

  const handleConfirmModeChange = () => {
    switchStorageMode(pendingMode);
    addAuditLogEntry({
      action: 'storage_mode_changed',
      targetRole: 'system',
      targetStaffName: 'Storage Configuration',
      targetUserId: 'sys-storage',
      description: `Storage persistence mode changed to ${pendingMode === 'browser' ? 'Browser Storage' : 'In-Memory'}`,
      authorizedBy: currentUser.name,
    });
    setIsModeModalOpen(false);
    refreshStats();
    showNotice(`Storage mode switched to ${pendingMode === 'browser' ? 'Browser Storage' : 'In-Memory (Reset on reload)'}.`);
  };

  // 2. Export Backup
  const handleConfirmExport = async () => {
    try {
      const backup = await exportBackupData();
      const todayStr = formatLocalDate();
      const filename = `cms-backup-${todayStr}.json`;
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addAuditLogEntry({
        action: 'data_exported',
        targetRole: 'system',
        targetStaffName: 'System Backup',
        targetUserId: 'sys-backup',
        description: `Full clinic backup exported to ${filename}`,
        authorizedBy: currentUser.name,
      });

      setIsExportModalOpen(false);
      showNotice(`Backup ${filename} downloaded successfully.`);
    } catch {
      showNotice('Failed to export backup data.');
    }
  };

  // 3. File Input Picker for Import
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportConfirmText('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          setImportError('Invalid file: File is not a valid JSON document.');
          return;
        }
        if (!parsed.SCHEMA_VERSION) {
          setImportError('Invalid backup file: Missing SCHEMA_VERSION property.');
          return;
        }
        if (!parsed.collections || typeof parsed.collections !== 'object') {
          setImportError('Invalid backup file: Missing collections container.');
          return;
        }
        setPendingBackup(parsed);
        setIsImportModalOpen(true);
      } catch {
        setImportError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (importConfirmText !== 'RESTORE') {
      return;
    }
    if (!pendingBackup) return;

    try {
      await importBackupData(pendingBackup, currentUser.name);
      setIsImportModalOpen(false);
      setPendingBackup(null);
      setImportConfirmText('');
      await refreshStats();
      showNotice('Backup restored successfully. Snapshot saved for undo.');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setImportError(err.message || 'Failed to restore backup.');
    }
  };

  const handleUndoRestore = async () => {
    const success = await restoreUndoSnapshot();
    if (success) {
      addAuditLogEntry({
        action: 'data_restored_undo',
        targetRole: 'system',
        targetStaffName: 'System Backup',
        targetUserId: 'sys-backup',
        description: 'Undo snapshot restored to reverse previous backup import',
        authorizedBy: currentUser.name,
      });
      await refreshStats();
      showNotice('Previous backup restore was undone successfully.');
      setTimeout(() => window.location.reload(), 1200);
    } else {
      showNotice('Could not undo restore: snapshot not available.');
    }
  };

  // 4. Reset Demo Data
  const handleConfirmReset = async () => {
    if (resetConfirmText !== 'RESET') return;
    setIsResetting(true);
    await resetDemoData(currentUser.name);
    setIsResetting(false);
    setIsResetModalOpen(false);
    setResetConfirmText('');
    showNotice('Demo data restored to factory defaults.');
    setTimeout(() => window.location.reload(), 1000);
  };

  if (isLoadingStats && !stats) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100">
          {notification}
        </div>
      )}

      {/* Mandatory Demo Notice */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        This is a demo. Data is stored only in this browser and is not encrypted. Do not enter real patient data.
      </p>

      {/* Storage Status & Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Storage Status */}
        <div className="lg:col-span-2 flex flex-col h-auto lg:h-full gap-4">
          <div>
            <Card>
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <CardTitle>Browser Storage Status</CardTitle>
              </CardHeader>
              <CardContent className="!p-0">
                <DetailList>
                  <DetailItem label="Storage Location" value={stats?.mode === 'browser' ? 'Local browser storage (localStorage)' : 'In-memory session (Resets on reload)'} />
                  <DetailItem label="Last Saved" value={stats?.lastSaved ? `${formatDate(stats.lastSaved.slice(0, 10))} ${formatTime(stats.lastSaved.slice(11, 16))}` : 'Not recorded'} />
                  <DetailItem label="Data Size" value={stats?.totalSizeFormatted || '0 KB'} />
                  <DetailItem label="Schema Version" value="Version 1 (Active)" />
                </DetailList>

                {stats?.isNearQuota && (
                  <div className="m-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Warning:</span> Storage usage is above 80% of the browser quota limit. Consider exporting a backup and resetting demo data.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Record Counts Table */}
          <Card className="flex flex-col flex-1">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle>Collection Record Counts</CardTitle>
            </CardHeader>
            <CardContent className="!p-0 flex-1 flex flex-col justify-start">
              <DetailList dense columns={3} className="flex-1">
                {stats?.counts &&
                  Object.entries(stats.counts).map(([col, count]) => (
                    <DetailItem
                      key={col}
                      label={formatCollectionLabel(col)}
                      value={String(count)}
                    />
                  ))}
              </DetailList>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions and Configuration */}
        <div className="flex flex-col h-auto lg:h-full gap-4">
          {/* Storage Configuration */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle>Storage Mode</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Persistence Strategy
                </label>
                <Select
                  value={stats?.mode || 'browser'}
                  onChange={(e) => handleModeChange(e.target.value as any)}
                  options={[
                    { value: 'browser', label: 'Save data in this browser' },
                    { value: 'memory', label: 'Do not save: data resets on reload' },
                  ]}
                />
              </div>
              <p className="text-[0.6875rem] text-slate-500 leading-relaxed">
                When set to "Do not save", changes persist only during the active browser session and reset automatically upon page reload.
              </p>
            </CardContent>
          </Card>

          {/* Backup & Restore Controls */}
          <Card className="flex flex-col flex-1">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle>Backup and Restore</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-start">
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs min-h-[44px]"
                  icon={<Download className="w-4 h-4 text-teal-600" />}
                  onClick={() => setIsExportModalOpen(true)}
                >
                  Export backup (.json)
                </Button>

                <label className="w-full block cursor-pointer">
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <span className="inline-flex items-center gap-2 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md min-h-[44px]">
                    <span>Import backup (.json)</span>
                  </span>
                </label>

                {canUndo && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs min-h-[44px]"
                    icon={<Undo2 className="w-4 h-4 text-slate-600" />}
                    onClick={handleUndoRestore}
                  >
                    Undo last restore
                  </Button>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800" />

                <Button
                  variant="outline"
                  className="w-full justify-start text-xs min-h-[44px] text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  icon={<RotateCcw className="w-4 h-4 text-rose-600" />}
                  onClick={() => {
                    setResetConfirmText('');
                    setIsResetModalOpen(true);
                  }}
                >
                  Reset demo data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL 1: Change Storage Mode Confirmation */}
      <Modal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        title="Confirm Storage Mode Change"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setIsModeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmModeChange}>
              Confirm Change
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Switching storage mode to{' '}
          <strong>{pendingMode === 'browser' ? 'Browser Storage' : 'In-Memory (Reset on reload)'}</strong>{' '}
          will change how data persists on this device. Do you want to proceed?
        </p>
      </Modal>

      {/* MODAL 2: Export Backup Confirmation */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Clinic Backup"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmExport}>
              Export Backup
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            This backup file contains complete clinic datasets, patient demographics, attendance records, and cryptographic password hashes.
          </p>
          <p className="text-slate-500">
            Store the exported file securely. Do not share on untrusted devices or unencrypted networks.
          </p>
        </div>
      </Modal>

      {/* MODAL 3: Import Backup Confirmation */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPendingBackup(null);
        }}
        title="Restore Clinic Backup"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false);
                setPendingBackup(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={importConfirmText !== 'RESTORE'}
              onClick={handleConfirmImport}
            >
              Restore Backup
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800">
              {importError}
            </div>
          )}

          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Restoring this backup will replace current records with the data from the selected file. A snapshot of your current state will be preserved to allow a single undo.
          </p>

          {pendingBackup?.collections && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-semibold block text-slate-900 dark:text-slate-100">Backup Contents:</span>
              <div className="grid grid-cols-2 gap-1 text-[0.6875rem] text-slate-600 dark:text-slate-400">
                <span>Accounts: {pendingBackup.collections.accounts?.length || 0}</span>
                <span>Patients: {pendingBackup.collections.patients?.length || 0}</span>
                <span>Appointments: {pendingBackup.collections.appointments?.length || 0}</span>
                <span>Prescriptions: {pendingBackup.collections.prescriptions?.length || 0}</span>
                <span>Attendance: {pendingBackup.collections.attendance?.length || 0}</span>
                <span>Roles: {pendingBackup.collections.roles?.length || 0}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type <strong>RESTORE</strong> to confirm:
            </label>
            <Input
              value={importConfirmText}
              onChange={(e) => setImportConfirmText(e.target.value)}
              placeholder="RESTORE"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Reset Demo Data Confirmation */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Demo Data to Factory Defaults"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={resetConfirmText !== 'RESET' || isResetting}
              onClick={handleConfirmReset}
              isLoading={isResetting}
            >
              Reset Data
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            All changes made in this browser will be permanently lost and factory demo datasets will be restored.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type <strong>RESET</strong> to confirm:
            </label>
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DataManagementTab;
