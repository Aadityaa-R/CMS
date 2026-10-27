import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { DetailList, DetailItem, DetailGrid } from '@/components/ui/DetailList';
import { Eye, EyeOff } from 'lucide-react';
import { getRepository } from '@/data/storage';
import { Account } from '@/types/storage';
import { Patient, AccessAuditLogEntry } from '@/types';
import {
  getPasswordPolicyText,
  getSessionSecurityText,
  validatePasswordPolicy,
} from '@/lib/auth';
import {
  DICTATION_LANGUAGES,
  getDefaultDictationLanguage,
  saveDictationLanguage,
} from '@/lib/dictation';

interface ProfileViewProps {
  onNavigate?: (tab: string, subTab?: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, onDirtyChange }) => {
  const { currentUser, currentRole, updateCurrentUser, changePassword, verifyCurrentPassword } = useAuth();
  const { patients = [], updatePatient, modules = [] } = useClinic();

  // Determine linked patient record
  const patient = useMemo(() => {
    if (currentRole !== 'patient') return null;
    return patients.find(
      (p) =>
        p.id === currentUser.patientId ||
        p.mrn === currentUser.badgeNumber ||
        currentUser.id === `usr-${p.id}` ||
        currentUser.id === p.id ||
        (currentUser.email && p.email && p.email.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [currentRole, patients, currentUser]);

  const isUnlinkedPatient = currentRole === 'patient' && (!patient || currentUser.claimPending);

  // Status message for screen reader announcements
  const [liveMessage, setLiveMessage] = useState<string>('');
  const announce = (msg: string) => {
    setLiveMessage(msg);
  };

  // Staff roles display
  const staffRolesText = useMemo(() => {
    const roleNames: string[] = [];
    if (currentUser.role === 'md') {
      roleNames.push('Managing Director', 'Administrator');
    } else if (currentUser.role === 'doctor') {
      roleNames.push('Doctor');
    } else if (currentUser.role === 'receptionist') {
      roleNames.push('Receptionist');
    } else if (currentUser.role) {
      roleNames.push(String(currentUser.role).charAt(0).toUpperCase() + String(currentUser.role).slice(1));
    }
    if (modules && modules.length > 0) {
      modules.forEach((mod) => {
        if (
          mod.memberIds?.includes(currentUser.id) ||
          mod.memberIds?.includes(currentUser.badgeNumber || '') ||
          currentUser.moduleIds?.includes(mod.id)
        ) {
          if (!roleNames.includes(mod.name)) {
            roleNames.push(mod.name);
          }
        }
      });
    }
    return roleNames.join(', ');
  }, [currentUser, modules]);

  // Initial values for dirty tracking
  const initialValues = useMemo(() => {
    if (currentRole === 'patient' && patient) {
      return {
        phone: patient.phone || '',
        address: patient.address || '',
        emergName: patient.emergencyContact?.name || '',
        emergRel: patient.emergencyContact?.relationship || '',
        emergPhone: patient.emergencyContact?.phone || '',
        email: patient.email || currentUser.email || '',
      };
    }
    return {
      phone: currentUser.phone || '',
      address: '',
      emergName: '',
      emergRel: '',
      emergPhone: '',
      email: currentUser.email || '',
    };
  }, [currentRole, patient, currentUser]);

  // Contact Form State
  const [contactPhone, setContactPhone] = useState(initialValues.phone);
  const [contactAddress, setContactAddress] = useState(initialValues.address);
  const [contactEmergName, setContactEmergName] = useState(initialValues.emergName);
  const [contactEmergRel, setContactEmergRel] = useState(initialValues.emergRel);
  const [contactEmergPhone, setContactEmergPhone] = useState(initialValues.emergPhone);
  const [contactEmail, setContactEmail] = useState(initialValues.email);
  const [contactVerifyPassword, setContactVerifyPassword] = useState('');
  const [showContactVerifyPassword, setShowContactVerifyPassword] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [dictationLanguage, setDictationLanguage] = useState<string>(() => getDefaultDictationLanguage());

  // Sync state if initialValues change from external update
  useEffect(() => {
    setContactPhone(initialValues.phone);
    setContactAddress(initialValues.address);
    setContactEmergName(initialValues.emergName);
    setContactEmergRel(initialValues.emergRel);
    setContactEmergPhone(initialValues.emergPhone);
    setContactEmail(initialValues.email);
  }, [initialValues]);

  // Compute dirty state
  const isContactDirty = useMemo(() => {
    if (currentRole === 'patient') {
      return (
        contactPhone !== initialValues.phone ||
        contactAddress !== initialValues.address ||
        contactEmergName !== initialValues.emergName ||
        contactEmergRel !== initialValues.emergRel ||
        contactEmergPhone !== initialValues.emergPhone ||
        contactEmail !== initialValues.email
      );
    }
    return (
      contactPhone !== initialValues.phone ||
      contactEmail !== initialValues.email
    );
  }, [currentRole, contactPhone, contactAddress, contactEmergName, contactEmergRel, contactEmergPhone, contactEmail, initialValues]);

  useEffect(() => {
    onDirtyChange?.(isContactDirty);
  }, [isContactDirty, onDirtyChange]);

  // Unsaved changes navigation guard
  const [pendingNavigation, setPendingNavigation] = useState<{ tab: string; subTab?: string } | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isContactDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isContactDirty]);

  const emailHasChanged = contactEmail.trim().toLowerCase() !== initialValues.email.trim().toLowerCase();

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');

    const cleanPhone = contactPhone.trim();
    const cleanEmail = contactEmail.trim().toLowerCase();
    const cleanAddress = contactAddress.trim();

    if (!cleanPhone) {
      setContactError('Phone number is required.');
      return;
    }
    if (!cleanEmail) {
      setContactError('Email address is required.');
      return;
    }
    if (currentRole === 'patient' && !cleanAddress) {
      setContactError('Address is required.');
      return;
    }

    if (emailHasChanged) {
      if (!contactVerifyPassword.trim()) {
        setContactError('Current password is required to confirm an email change.');
        return;
      }
      setIsSavingContact(true);
      const isPassValid = await verifyCurrentPassword(contactVerifyPassword);
      if (!isPassValid) {
        setIsSavingContact(false);
        setContactError('Current password is incorrect.');
        return;
      }
    } else {
      setIsSavingContact(true);
    }

    // Uniqueness validation (M5 rules)
    try {
      const repoAccounts = getRepository<Account>('accounts');
      const repoPatients = getRepository<Patient>('patients');
      const allAccounts = await repoAccounts.list();
      const allPatients = await repoPatients.list();

      const duplicateEmail = allAccounts.find(
        (a) => a.id !== currentUser.id && a.email.toLowerCase() === cleanEmail
      );
      if (duplicateEmail) {
        setIsSavingContact(false);
        setContactError('An account with this email address already exists.');
        return;
      }

      const duplicatePhoneAccount = allAccounts.find(
        (a) => a.id !== currentUser.id && a.phone === cleanPhone
      );
      const duplicatePhonePatient = allPatients.find(
        (p) => (patient ? p.id !== patient.id : true) && p.phone === cleanPhone
      );
      if (duplicatePhoneAccount || duplicatePhonePatient) {
        setIsSavingContact(false);
        setContactError('An account with this phone number already exists.');
        return;
      }

      // Update patient record if role is patient
      if (patient) {
        updatePatient(patient.id, {
          phone: cleanPhone,
          address: cleanAddress,
          email: cleanEmail,
          emergencyContact: {
            name: contactEmergName.trim() || 'Primary Contact',
            relationship: contactEmergRel.trim() || 'Relative',
            phone: contactEmergPhone.trim() || cleanPhone,
          },
        });
      }

      // Update account record in repository
      const existingAccount = allAccounts.find(
        (a) =>
          a.id === currentUser.id ||
          a.email.toLowerCase() === currentUser.email.toLowerCase() ||
          a.username.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (existingAccount) {
        await repoAccounts.update(existingAccount.id, {
          ...existingAccount,
          phone: cleanPhone,
          email: cleanEmail,
          username: cleanEmail,
          updatedAt: new Date().toISOString(),
        });
      }

      // Update current user in session
      updateCurrentUser({
        phone: cleanPhone,
        email: cleanEmail,
      });

      // Write ledger entry (contains NO password data)
      const repoLedger = getRepository<AccessAuditLogEntry>('ledger');
      await repoLedger.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'profile_updated',
        targetUserId: currentUser.id,
        targetRole: currentRole,
        subject: currentUser.name,
        description: `Contact details updated for ${currentUser.name} (${currentUser.role}).`,
        authorizedBy: currentUser.name,
      });

      setIsSavingContact(false);
      setContactVerifyPassword('');
      setShowContactVerifyPassword(false);
      setContactSuccess('Contact details updated successfully.');
      announce('Contact details updated successfully.');
    } catch {
      setIsSavingContact(false);
      setContactError('Failed to save contact details. Please try again.');
    }
  };

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      setPasswordError(policyCheck.error || 'Password does not satisfy security policy.');
      return;
    }

    setIsUpdatingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsUpdatingPassword(false);

    if (!res.success) {
      setPasswordError(res.error || 'Failed to update password.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordSuccess('Password changed successfully.');
    announce('Password changed successfully.');
  };

  return (
    <div className="space-y-[var(--card-gap)]">
      {/* Polite Live Region */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1
          id="profile-heading"
          tabIndex={-1}
          className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 outline-none"
        >
          My Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {currentRole === 'patient'
            ? 'Manage your personal contact information and access credentials.'
            : 'Authorized station credentials and personnel contact details.'}
        </p>
      </div>

      {/* Grid: 2 columns on desktop (>= 1024px), 1 column below */}
      <DetailGrid className={isUnlinkedPatient ? 'max-w-xl mx-auto' : ''}>
        {/* Staff Read-Only Card (side by side with Contact Details) */}
        {!isUnlinkedPatient && currentRole !== 'patient' && (
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg font-bold">Staff Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <DetailList>
                <DetailItem label="Name" value={currentUser.name} />
                <DetailItem
                  label="Staff ID"
                  value={<span className="tabular-nums">{currentUser.badgeNumber || 'STAFF-100'}</span>}
                />
                <DetailItem label="Job title" value={currentUser.title || 'Staff Member'} />
                <DetailItem label="Department" value={currentUser.department || 'Clinical Services'} />
                <DetailItem label="Roles" value={staffRolesText} />
              </DetailList>
              <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  To change these details, ask an administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card: Contact Details (hidden for unlinked patient) */}
        {!isUnlinkedPatient && (
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg font-bold">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between">
              <form onSubmit={handleSaveContact} className="space-y-5 text-sm" noValidate>
                {contactError && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg"
                  >
                    {contactError}
                  </div>
                )}
                {contactSuccess && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg">
                    {contactSuccess}
                  </div>
                )}

                {/* Patient-specific fields: Address and Emergency Contact */}
                {currentRole === 'patient' && (
                  <>
                    <Input
                      id="profile-address"
                      label="Address"
                      value={contactAddress}
                      onChange={(e) => {
                        setContactAddress(e.target.value);
                        if (contactError) setContactError('');
                      }}
                      placeholder="Street, City, Zip"
                      autoComplete="street-address"
                      required
                    />

                    <Input
                      id="profile-emerg-name"
                      label="Emergency Contact Name"
                      value={contactEmergName}
                      onChange={(e) => {
                        setContactEmergName(e.target.value);
                        if (contactError) setContactError('');
                      }}
                      placeholder="Emergency contact full name"
                    />

                    <Input
                      id="profile-emerg-rel"
                      label="Emergency Contact Relationship"
                      value={contactEmergRel}
                      onChange={(e) => {
                        setContactEmergRel(e.target.value);
                        if (contactError) setContactError('');
                      }}
                      placeholder="e.g. Spouse, Parent, Sibling"
                    />

                    <Input
                      id="profile-emerg-phone"
                      label="Emergency Contact Phone"
                      type="tel"
                      value={contactEmergPhone}
                      onChange={(e) => {
                        setContactEmergPhone(e.target.value);
                        if (contactError) setContactError('');
                      }}
                      placeholder="+1 (555) 000-0000"
                    />
                  </>
                )}

                {/* Common editable fields: Phone and Email */}
                <Input
                  id="profile-phone"
                  label="Phone"
                  aria-label="Phone Number"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => {
                    setContactPhone(e.target.value);
                    if (contactError) setContactError('');
                  }}
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  required
                />

                <Input
                  id="profile-email"
                  label="Email Address"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    if (contactError) setContactError('');
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />

                {/* Current password requirement when email is changed */}
                {emailHasChanged && (
                  <div className="pt-1">
                    <Input
                      id="profile-contact-password"
                      label="Current Password"
                      type={showContactVerifyPassword ? 'text' : 'password'}
                      value={contactVerifyPassword}
                      onChange={(e) => {
                        setContactVerifyPassword(e.target.value);
                        if (contactError) setContactError('');
                      }}
                      placeholder="Type current password to confirm email change"
                      autoComplete="current-password"
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowContactVerifyPassword(!showContactVerifyPassword)}
                          className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                          aria-label={showContactVerifyPassword ? 'Hide current password' : 'Show current password'}
                        >
                          {showContactVerifyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                      Current password is required to verify changes to your email address.
                    </span>
                  </div>
                )}

                {/* Save button */}
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!isContactDirty || isSavingContact}
                    className="min-h-[44px]"
                  >
                    {isSavingContact ? 'Saving...' : 'Save Contact Details'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Card: Security & Password */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-bold">Security & Password</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <form onSubmit={handleUpdatePassword} className="space-y-5 text-sm" noValidate>
              {passwordError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg"
                >
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg">
                  {passwordSuccess}
                </div>
              )}

              <Input
                id="security-current-password"
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <Input
                id="security-new-password"
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <Input
                id="security-confirm-password"
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Password policy and session security text derived from constants */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <span className="uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider text-xs">
                  Password & Session Security Policy
                </span>
                <p className="leading-relaxed">
                  {getPasswordPolicyText()}
                </p>
                <p className="leading-relaxed text-slate-500 dark:text-slate-400 text-xs">
                  {getSessionSecurityText()}
                </p>
              </div>

              {/* Submit button */}
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdatingPassword}
                  className="min-h-[44px]"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Card: Dictation Preferences */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-bold">Dictation Preferences</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <Select
                  label="Dictation language"
                  value={dictationLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setDictationLanguage(newLang);
                    saveDictationLanguage(newLang);
                  }}
                  options={DICTATION_LANGUAGES}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Select your preferred language for voice dictation in consultation notes, prescriptions, and appointment booking reasons.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DetailGrid>

      {/* Discard changes dialog */}
      <Modal
        isOpen={!!pendingNavigation}
        onClose={() => setPendingNavigation(null)}
        title="Discard changes?"
        description="You have unsaved changes to your contact details. Are you sure you want to discard them?"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingNavigation(null)}
            >
              Keep editing
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const target = pendingNavigation;
                setPendingNavigation(null);
                if (target && onNavigate) {
                  onNavigate(target.tab, target.subTab);
                }
              }}
            >
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Any modifications you made to your contact details will not be saved.
        </p>
      </Modal>
    </div>
  );
};
