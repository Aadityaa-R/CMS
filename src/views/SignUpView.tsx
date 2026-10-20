import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Building2, User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { validatePasswordPolicy } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { EcgBackground } from '@/components/auth/EcgBackground';
import { AuthAudience } from '@/services/authService';

export interface SignUpViewProps {
  onBackToLogin: () => void;
  onChangeAudience?: () => void;
  contentOnly?: boolean;
  audience?: AuthAudience;
  fullName?: string;
  onFullNameChange?: (value: string) => void;
  email?: string;
  onEmailChange?: (value: string) => void;
  phone?: string;
  onPhoneChange?: (value: string) => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  onBackToLogin,
  onChangeAudience,
  contentOnly = false,
  audience = 'patient',
  fullName: externalFullName,
  onFullNameChange,
  email: externalEmail,
  onEmailChange,
  phone: externalPhone,
  onPhoneChange,
}) => {
  const { signUpPatient, signUpStaff } = useAuth();

  // Local fallback states if not controlled externally
  const [localFullName, setLocalFullName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPhone, setLocalPhone] = useState('');

  const fullName = externalFullName !== undefined ? externalFullName : localFullName;
  const setFullName = onFullNameChange || setLocalFullName;

  const email = externalEmail !== undefined ? externalEmail : localEmail;
  const setEmail = onEmailChange || setLocalEmail;

  const phone = externalPhone !== undefined ? externalPhone : localPhone;
  const setPhone = onPhoneChange || setLocalPhone;

  // Passwords are always cleared on audience switch
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Patient fields
  const [dob, setDob] = useState('1990-01-01');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');

  // Staff fields
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [roleRequested, setRoleRequested] = useState<'doctor' | 'receptionist'>('doctor');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const fullNameInputRef = useRef<HTMLInputElement>(null);

  // Clear passwords and focus first field when audience changes
  useEffect(() => {
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    fullNameInputRef.current?.focus();
  }, [audience]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter your contact phone number.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      setFormError(policy.error || 'Password policy not met.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (audience === 'patient') {
        const res = await signUpPatient({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          dob,
          gender,
        });

        if (!res.success) {
          setFormError(res.error || 'Patient registration failed.');
          setIsSubmitting(false);
          return;
        }

        if (res.claimPending) {
          setSuccessInfo({
            title: 'Account Created: Verification Pending',
            message:
              'A patient record matching your details was found at Beacon Health Clinic. Your account is waiting to be linked by a clinic receptionist. You will be able to access your full health portal once approved.',
          });
        } else {
          setSuccessInfo({
            title: 'Patient Account Created',
            message:
              'Your patient account and clinical record have been registered successfully. You can now sign in with your email and password.',
          });
        }
      } else {
        // Staff registration
        if (!jobTitle.trim()) {
          setFormError('Please enter your professional job title.');
          setIsSubmitting(false);
          return;
        }
        if (!department.trim()) {
          setFormError('Please enter your department.');
          setIsSubmitting(false);
          return;
        }

        const res = await signUpStaff({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          jobTitle: jobTitle.trim(),
          department: department.trim(),
          roleRequested,
        });

        if (!res.success) {
          setFormError(res.error || 'Staff registration request failed.');
          setIsSubmitting(false);
          return;
        }

        setSuccessInfo({
          title: 'Access Request Submitted',
          message:
            'Your staff access request has been submitted to the clinic administration queue. An administrator will review your application. You will be able to sign in once approved.',
        });
      }
    } catch {
      setFormError('An unexpected error occurred during account creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const innerCardContent = (
    <div className="w-full">
      {successInfo ? (
        <div className="space-y-6 text-center py-4">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center border border-teal-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">{successInfo.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              {successInfo.message}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full min-h-[44px]"
              onClick={onBackToLogin}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="pb-5 mb-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-semibold text-slate-900">
              Creating a {audience === 'patient' ? 'Patient' : 'Clinic Staff'} account
            </div>
            <div className="flex items-center gap-3">
              {onChangeAudience && (
                <button
                  type="button"
                  onClick={onChangeAudience}
                  className="text-xs font-medium text-teal-600 hover:text-teal-800 cursor-pointer min-h-[44px] px-1 inline-flex items-center"
                >
                  Change
                </button>
              )}
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer min-h-[44px] px-1 inline-flex items-center"
              >
                Back to sign in
              </button>
            </div>
          </div>

          {formError && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-slate-800 text-xs"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              <div>
                <span className="font-semibold text-slate-900">Registration Error:</span>{' '}
                {formError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Input
                label="Full Name"
                ref={fullNameInputRef}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={
                  audience === 'patient'
                    ? 'e.g. Eleanor Wright'
                    : 'e.g. Dr. Clara Oswald or David Kim'
                }
                icon={<User className="w-4 h-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Email Address (Username)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beaconclinic.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
              </div>
              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  icon={<Phone className="w-4 h-4" />}
                  required
                />
              </div>
            </div>

            {audience === 'patient' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Date of Birth
                  </label>
                  <DatePicker value={dob} onChange={setDob} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Biological Sex
                  </label>
                  <Select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    options={[
                      { value: 'female', label: 'Female' },
                      { value: 'male', label: 'Male' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="Job Title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Staff Consulting Physician"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Pediatrics or Reception"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Role requested
                  </label>
                  <Select
                    value={roleRequested}
                    onChange={(e) => setRoleRequested(e.target.value as any)}
                    options={[
                      { value: 'doctor', label: 'Doctor' },
                      { value: 'receptionist', label: 'Receptionist' },
                    ]}
                  />
                  <p className="text-[0.6875rem] text-slate-500 mt-1">
                    Administrator access cannot be requested. Staff accounts require review and activation by clinic administration.
                  </p>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 10 chars, letter & number"
                    className="w-full rounded-lg border border-slate-300 hover:border-slate-400 bg-white pl-11 pr-10 py-2.5 min-h-[44px] text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-teal-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] justify-center cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span
                      key={showPassword ? 'eye-off' : 'eye'}
                      className="login-icon-crossfade inline-flex"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-lg border border-slate-300 hover:border-slate-400 bg-white pl-11 pr-10 py-2.5 min-h-[44px] text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-teal-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] justify-center cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <span
                      key={showConfirmPassword ? 'eye-off' : 'eye'}
                      className="login-icon-crossfade inline-flex"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-sm font-semibold min-h-[44px] h-11"
                isLoading={isSubmitting}
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                {audience === 'patient'
                  ? 'Register Patient Account'
                  : 'Submit Access Application'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );

  if (contentOnly) {
    return innerCardContent;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <EcgBackground />
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Beacon Health Clinic
        </h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Clinic Management System (CMS) • Self-Registration Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card dark:shadow-none print:shadow-none rounded-2xl border border-slate-200">
          {innerCardContent}
        </div>
      </div>
    </div>
  );
};

export default SignUpView;
