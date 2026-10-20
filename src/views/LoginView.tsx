import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SignUpView } from './SignUpView';
import { resetDemoData } from '@/data/storage';
import { getPrefersReducedMotion } from '@/styles/loginMotion';
import { EcgBackground } from '@/components/auth/EcgBackground';
import { AuthAudience } from '@/services/authService';
import {
  Building2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

const DevCredentialsDirectory = React.lazy(() => import('./DevCredentialsDirectory'));

function getLastUsedAudience(): AuthAudience | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('cms_auth_audience');
    if (saved === 'patient' || saved === 'staff') {
      return saved as AuthAudience;
    }
  } catch {
    // fallback
  }
  return null;
}

function parseInitialRoute(): {
  audience: AuthAudience | null;
  viewMode: 'login' | 'signup';
} {
  if (typeof window === 'undefined') {
    return { audience: null, viewMode: 'login' };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const asParam = params.get('as');
    const viewParam = params.get('view');
    const pathname = window.location.pathname.toLowerCase();

    let audience: AuthAudience | null = null;
    if (asParam === 'patient' || pathname.includes('/patient')) {
      audience = 'patient';
    } else if (asParam === 'staff' || pathname.includes('/staff')) {
      audience = 'staff';
    }

    let viewMode: 'login' | 'signup' = 'login';
    if (viewParam === 'signup' || pathname.includes('/signup')) {
      viewMode = 'signup';
    }

    return { audience, viewMode };
  } catch {
    return { audience: null, viewMode: 'login' };
  }
}

export const LoginView: React.FC = () => {
  const { login, roleCredentials } = useAuth();
  const queryDemoParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('demo')
      : null;
  const isDemoMode =
    queryDemoParam !== null ? queryDemoParam === 'true' : import.meta.env.VITE_DEMO_MODE === 'true';

  // Read URL before first render so the wrong step never flashes
  const initialRoute = parseInitialRoute();
  const lastUsedAudience = getLastUsedAudience();

  // Step state: 'choose' (account type chooser) or 'form' (login/signup form)
  const [step, setStep] = useState<'choose' | 'form'>(() =>
    initialRoute.audience !== null ? 'form' : 'choose'
  );
  const [audience, setAudience] = useState<AuthAudience>(() =>
    initialRoute.audience !== null ? initialRoute.audience : lastUsedAudience || 'staff'
  );
  const [viewMode, setViewMode] = useState<'login' | 'signup'>(() => initialRoute.viewMode);

  // Preserve typed credentials across switches
  const [identifier, setIdentifier] = useState(() => (audience === 'patient' ? 'patient' : 'md'));
  const [password, setPassword] = useState('Doctor@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Preserve typed sign-up fields across audience switch
  const [sharedFullName, setSharedFullName] = useState('');
  const [sharedEmail, setSharedEmail] = useState('');
  const [sharedPhone, setSharedPhone] = useState('');

  // UI status and errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wrongPortalTarget, setWrongPortalTarget] = useState<AuthAudience | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(true);

  // Motion states
  const [isEntranceActive, setIsEntranceActive] = useState(() => !getPrefersReducedMotion());
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccessExiting, setIsSuccessExiting] = useState(false);

  // Focus tracking refs
  const patientOptionRef = useRef<HTMLButtonElement>(null);
  const staffOptionRef = useRef<HTMLButtonElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedOptionRef = useRef<AuthAudience | null>(null);

  // Reset demo data modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Entrance animation timer (max 700ms)
  useEffect(() => {
    if (!isEntranceActive) return;
    const timer = setTimeout(() => {
      setIsEntranceActive(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [isEntranceActive]);

  // Listen to browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const { audience: routeAudience, viewMode: routeViewMode } = parseInitialRoute();
      if (routeAudience) {
        setAudience(routeAudience);
        setStep('form');
      } else {
        setStep('choose');
      }
      setViewMode(routeViewMode);
      setErrorMessage(null);
      setPasswordError(null);
      setIdentifierError(null);
      setWrongPortalTarget(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // In chooser step, focus the last used audience (or previously chosen option)
  useEffect(() => {
    if (step === 'choose') {
      const target = lastFocusedOptionRef.current || lastUsedAudience || 'patient';
      setTimeout(() => {
        if (target === 'staff') {
          staffOptionRef.current?.focus();
        } else {
          patientOptionRef.current?.focus();
        }
      }, 30);
    }
  }, [step, lastUsedAudience]);

  const triggerShake = () => {
    if (!getPrefersReducedMotion()) {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 350);
    }
  };

  // User chooses an audience option from the chooser step
  const handleSelectAudience = (chosen: AuthAudience) => {
    setAudience(chosen);
    setStep('form');
    setPassword('');
    setErrorMessage(null);
    setPasswordError(null);
    setIdentifierError(null);
    setWrongPortalTarget(null);

    // Update demo defaults if untouched
    if (identifier === 'md' && chosen === 'patient') {
      setIdentifier('patient');
      setPassword('Patient@123');
    } else if (identifier === 'patient' && chosen === 'staff') {
      setIdentifier('md');
      setPassword('Doctor@123');
    }

    try {
      localStorage.setItem('cms_auth_audience', chosen);
      const url = new URL(window.location.href);
      url.searchParams.set('as', chosen);
      if (viewMode === 'signup') {
        url.searchParams.set('view', 'signup');
      } else {
        url.searchParams.delete('view');
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // fallback
    }

    // Focus first field of form
    setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 40);
  };

  // User clicks "Change" on top of the form step to return to chooser
  const handleReturnToChooser = () => {
    lastFocusedOptionRef.current = audience;
    setStep('choose');
    setPassword('');
    setErrorMessage(null);
    setPasswordError(null);
    setIdentifierError(null);
    setWrongPortalTarget(null);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('as');
      window.history.pushState({}, '', url.toString());
    } catch {
      // fallback
    }
  };

  const handleViewModeChange = (mode: 'login' | 'signup') => {
    setViewMode(mode);
    setErrorMessage(null);
    setPasswordError(null);
    setIdentifierError(null);
    setWrongPortalTarget(null);

    try {
      const url = new URL(window.location.href);
      if (mode === 'signup') {
        url.searchParams.set('view', 'signup');
      } else {
        url.searchParams.delete('view');
      }
      if (step === 'form') {
        url.searchParams.set('as', audience);
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // fallback
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);
    setWrongPortalTarget(null);

    let hasError = false;
    if (!identifier.trim()) {
      setIdentifierError('Please enter your username or email address.');
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError('Please enter your role password.');
      hasError = true;
    }
    if (hasError) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier.trim(), password, audience, rememberMe, { deferAuth: true });
    setIsSubmitting(false);

    if (result.code === 'wrongPortal') {
      const expected = result.expectedAudience || (audience === 'patient' ? 'staff' : 'patient');
      setWrongPortalTarget(expected);
      setErrorMessage(
        result.error ||
          (audience === 'patient'
            ? 'This is a clinic staff account. Use the Clinic Staff option.'
            : 'This is a patient account. Use the Patient option.')
      );
      triggerShake();
      return;
    }

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
      triggerShake();
      return;
    }

    // Successful authentication exit: 250ms scale(0.98) and fade-out before navigation
    if (getPrefersReducedMotion()) {
      result.completeNavigation?.();
    } else {
      setIsSuccessExiting(true);
      setTimeout(() => {
        result.completeNavigation?.();
      }, 250);
    }
  };

  const handleFillCredentials = (username: string, pass: string) => {
    setIdentifier(username);
    setPassword(pass);
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);
    setWrongPortalTarget(null);
  };

  const handleConfirmResetDemo = async () => {
    setIsResetting(true);
    await resetDemoData('Login Screen');
    setIsResetting(false);
    setIsResetModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <EcgBackground />

      {/* Brand Header: Locked exactly in place across steps */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className={`flex justify-center ${isEntranceActive ? 'login-entrance-0 login-animating' : ''}`}>
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h1
          className={`mt-4 text-center text-2xl font-bold tracking-tight text-white ${
            isEntranceActive ? 'login-entrance-1 login-animating' : ''
          }`}
        >
          Beacon Health Clinic
        </h1>
        <p className={`mt-1 text-center text-xs text-slate-400 ${isEntranceActive ? 'login-entrance-2 login-animating' : ''}`}>
          {viewMode === 'login'
            ? 'Clinic Management System (CMS) • Multi-Role Healthcare Portal'
            : 'Clinic Management System (CMS) • Self-Registration Portal'}
        </p>
      </div>

      {/* Crossfaded Section Below Header (reserves minimum height to prevent layout pop) */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl z-10 px-4 sm:px-0 min-h-[460px]">
        {step === 'choose' ? (
          /* STEP 1: ACCOUNT TYPE CHOOSER */
          <div key="choose-step" className="login-step-crossfade w-full">
            <div className="bg-white py-8 px-6 sm:px-10 shadow-card dark:shadow-none print:shadow-none rounded-2xl border border-slate-200">
              <h2
                className={`text-lg font-bold text-slate-900 text-center mb-6 ${
                  isEntranceActive ? 'login-entrance-3 login-animating' : ''
                }`}
              >
                Who is signing in?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Patient Option */}
                <button
                  ref={patientOptionRef}
                  type="button"
                  onClick={() => handleSelectAudience('patient')}
                  className={`min-h-[88px] w-full p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-colors cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 shadow-card flex flex-col justify-center ${
                    isEntranceActive ? 'login-entrance-4 login-animating' : ''
                  }`}
                >
                  <div className="text-base font-bold text-slate-900">Patient</div>
                  <div className="text-xs text-slate-500 mt-1">Records, bookings and bills</div>
                  {lastUsedAudience === 'patient' && (
                    <div className="text-[0.6875rem] text-slate-400 mt-1.5 font-normal">Last used</div>
                  )}
                </button>

                {/* Clinic Staff Option */}
                <button
                  ref={staffOptionRef}
                  type="button"
                  onClick={() => handleSelectAudience('staff')}
                  className={`min-h-[88px] w-full p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-colors cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-teal-600 shadow-card flex flex-col justify-center ${
                    isEntranceActive ? 'login-entrance-5 login-animating' : ''
                  }`}
                >
                  <div className="text-base font-bold text-slate-900">Clinic Staff</div>
                  <div className="text-xs text-slate-500 mt-1">Doctors, receptionists and administrators</div>
                  {lastUsedAudience === 'staff' && (
                    <div className="text-[0.6875rem] text-slate-400 mt-1.5 font-normal">Last used</div>
                  )}
                </button>
              </div>

              {/* Demo Mode Chooser Helper: Plain reset demo data button only */}
              {isDemoMode && (
                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer min-h-[44px] inline-flex items-center"
                  >
                    Reset demo data
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: AUTHENTICATION FORM CARD */
          <div
            key={`form-step-${audience}-${viewMode}`}
            className={`login-step-crossfade w-full bg-white py-8 px-6 sm:px-10 shadow-card dark:shadow-none print:shadow-none rounded-2xl border border-slate-200 ${
              isEntranceActive ? 'login-entrance-3 login-animating' : ''
            } ${isShaking ? 'login-card-shake' : ''} ${isSuccessExiting ? 'login-card-exit' : ''}`}
          >
            {/* Top Indicator Line with Change Button */}
            {viewMode === 'login' ? (
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-200">
                <div className="text-sm font-semibold text-slate-900">
                  Signing in as {audience === 'patient' ? 'Patient' : 'Clinic Staff'}
                </div>
                <button
                  type="button"
                  onClick={handleReturnToChooser}
                  className="text-xs font-medium text-teal-600 hover:text-teal-800 cursor-pointer min-h-[44px] px-2 inline-flex items-center"
                >
                  Change
                </button>
              </div>
            ) : null}

            {viewMode === 'signup' ? (
              <SignUpView
                contentOnly
                audience={audience}
                fullName={sharedFullName}
                onFullNameChange={setSharedFullName}
                email={sharedEmail}
                onEmailChange={setSharedEmail}
                phone={sharedPhone}
                onPhoneChange={setSharedPhone}
                onChangeAudience={handleReturnToChooser}
                onBackToLogin={() => handleViewModeChange('login')}
              />
            ) : (
              <>
                {/* Error notification with polite live region */}
                {errorMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-slate-800 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                    <div className="flex-1">
                      <span className="font-semibold text-slate-900">Authentication Notice:</span>{' '}
                      <span>{errorMessage}</span>
                      {wrongPortalTarget && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAudience(wrongPortalTarget);
                            }}
                            className="font-medium text-teal-600 hover:text-teal-800 underline cursor-pointer min-h-[44px] inline-flex items-center"
                          >
                            Switch to {wrongPortalTarget === 'staff' ? 'Clinic Staff' : 'Patient'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form className="space-y-4" onSubmit={handleLoginSubmit} noValidate>
                  <div className={isEntranceActive ? 'login-entrance-4 login-animating' : ''}>
                    <Input
                      label="Username or Email"
                      ref={identifierInputRef}
                      type="text"
                      autoFocus
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (identifierError) setIdentifierError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={
                        audience === 'patient'
                          ? 'e.g. patient or patient@beaconclinic.com'
                          : 'e.g. md or doctor or receptionist'
                      }
                      icon={<UserIcon className="w-4 h-4" />}
                      className="min-h-[44px] py-2.5"
                      error={identifierError || undefined}
                    />
                  </div>

                  <div className={`w-full ${isEntranceActive ? 'login-entrance-5 login-animating' : ''}`}>
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
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="Enter role password"
                        className={`w-full rounded-lg border bg-white pl-11 pr-10 py-2.5 min-h-[44px] text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-teal-500 ${
                          passwordError
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span key={showPassword ? 'eye-off' : 'eye'} className="login-icon-crossfade inline-flex">
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </span>
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-xs text-rose-600">{passwordError}</p>
                    )}
                  </div>

                  <div className={`space-y-4 ${isEntranceActive ? 'login-entrance-6 login-animating' : ''}`}>
                    <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                        />
                        <span>Remember session</span>
                      </label>
                      {isDemoMode && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowCredentialsGuide(!showCredentialsGuide)}
                            className="font-medium text-teal-600 hover:text-teal-800 flex items-center gap-1 min-h-[44px] cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{showCredentialsGuide ? 'Hide Credentials' : 'Show Role Credentials'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsResetModalOpen(true)}
                            className="font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1 min-h-[44px] cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset demo data</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full text-sm font-semibold mt-2 min-h-[44px] h-11 login-btn-press"
                      disabled={isSubmitting || isSuccessExiting}
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          {!getPrefersReducedMotion() && (
                            <span
                              aria-hidden="true"
                              className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white login-spinner-ring inline-block"
                            />
                          )}
                          <span>Signing in</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {audience === 'patient'
                              ? 'Sign In to Patient Portal'
                              : 'Sign In to Medical Station'}
                          </span>
                        </span>
                      )}
                    </Button>

                    {/* Create account link */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => handleViewModeChange('signup')}
                        className="text-xs font-medium text-teal-600 hover:text-teal-800 cursor-pointer min-h-[44px] inline-flex items-center"
                      >
                        Create account
                      </button>
                    </div>
                  </div>
                </form>

                {/* Credentials Guide Table filtered by active audience */}
                {isDemoMode && DevCredentialsDirectory && (
                  <div
                    className="login-credentials-accordion"
                    data-expanded={showCredentialsGuide ? 'true' : 'false'}
                    aria-hidden={!showCredentialsGuide}
                  >
                    <div className="login-credentials-accordion-inner">
                      <div className="pt-4">
                        <React.Suspense fallback={null}>
                          <DevCredentialsDirectory
                            roleCredentials={roleCredentials}
                            onFill={handleFillCredentials}
                            currentAudience={audience}
                          />
                        </React.Suspense>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Security notice (text only, decorative check icon removed) */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center text-[0.6875rem] text-slate-400">
              <span>Demo environment. Do not enter real patient data.</span>
            </div>
          </div>
        )}
      </div>

      {/* Reset Demo Data Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Demo Data"
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
              onClick={handleConfirmResetDemo}
              isLoading={isResetting}
            >
              Restore Demo Data
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-700 leading-relaxed">
          Restore the demo data? All changes made in this browser will be lost.
        </p>
      </Modal>
    </div>
  );
};

export default LoginView;
