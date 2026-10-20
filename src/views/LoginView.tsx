import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SignUpView } from './SignUpView';
import { resetDemoData } from '@/data/storage';
import { getPrefersReducedMotion } from '@/styles/loginMotion';
import { EcgBackground } from '@/components/auth/EcgBackground';
import {
  Building2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

const DevCredentialsDirectory = React.lazy(() => import('./DevCredentialsDirectory'));

export const LoginView: React.FC = () => {
  const { login, roleCredentials } = useAuth();
  const queryDemoParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') : null;
  const isDemoMode = queryDemoParam !== null ? queryDemoParam === 'true' : import.meta.env.VITE_DEMO_MODE === 'true';

  const [viewMode, setViewMode] = useState<'login' | 'signup'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'signup') return 'signup';
    } catch {
      // fallback
    }
    return 'login';
  });

  const [identifier, setIdentifier] = useState('md');
  const [password, setPassword] = useState('Doctor@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(true);

  // Motion states
  const [isEntranceActive, setIsEntranceActive] = useState(() => !getPrefersReducedMotion());
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccessExiting, setIsSuccessExiting] = useState(false);

  useEffect(() => {
    if (!isEntranceActive) return;
    const timer = setTimeout(() => {
      setIsEntranceActive(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [isEntranceActive]);

  const triggerShake = () => {
    if (!getPrefersReducedMotion()) {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 350);
    }
  };

  // Reset demo data modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);

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
    const result = await login(identifier.trim(), password, rememberMe, { deferAuth: true });
    setIsSubmitting(false);

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

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className={`flex justify-center ${isEntranceActive ? 'login-entrance-0 login-animating' : ''}`}>
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h1 className={`mt-4 text-center text-2xl font-bold tracking-tight text-white ${isEntranceActive ? 'login-entrance-1 login-animating' : ''}`}>
          Beacon Health Clinic
        </h1>
        <p className={`mt-1 text-center text-xs text-slate-400 ${isEntranceActive ? 'login-entrance-2 login-animating' : ''}`}>
          {viewMode === 'login'
            ? 'Clinic Management System (CMS) • Multi-Role Healthcare Portal'
            : 'Clinic Management System (CMS) • Self-Registration Portal'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl z-10 px-4 sm:px-0">
        <div
          className={`bg-white py-8 px-6 sm:px-10 shadow-card dark:shadow-none print:shadow-none rounded-2xl border border-slate-200 transition-[min-height] duration-200 ${
            isEntranceActive ? 'login-entrance-3 login-animating' : ''
          } ${isShaking ? 'login-card-shake' : ''} ${isSuccessExiting ? 'login-card-exit' : ''}`}
        >
          {/* View transition container: 200ms crossfade between sign-in and sign-up with smooth height */}
          <div key={viewMode} className="login-view-crossfade">
            {viewMode === 'signup' ? (
              <SignUpView contentOnly onBackToLogin={() => setViewMode('login')} />
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
                    <div>
                      <span className="font-semibold text-slate-900">Authentication Notice:</span>{' '}
                      {errorMessage}
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form className="space-y-4" onSubmit={handleLoginSubmit} noValidate>
                  <div className={isEntranceActive ? 'login-entrance-4 login-animating' : ''}>
                    <Input
                      label="Username or Email"
                      type="text"
                      autoFocus
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (identifierError) setIdentifierError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. md or doctor or receptionist or email"
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
                            <span>{showCredentialsGuide ? 'Hide Credentials Guide' : 'Show Role Credentials'}</span>
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
                          <span>Sign In to Medical Station</span>
                        </span>
                      )}
                    </Button>

                    {/* Create account link */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setViewMode('signup')}
                        className="text-xs font-medium text-teal-600 hover:text-teal-800 cursor-pointer min-h-[44px] inline-flex items-center"
                      >
                        Create account
                      </button>
                    </div>
                  </div>
                </form>

                {/* Credentials Guide Accordion (smooth height change 0fr to 1fr and fade) */}
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
                          />
                        </React.Suspense>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security notice */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[0.6875rem] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Demo environment. Do not enter real patient data.</span>
                </div>
              </>
            )}
          </div>
        </div>
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
