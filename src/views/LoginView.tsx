import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  Building2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, roleCredentials } = useAuth();
  const [identifier, setIdentifier] = useState('md');
  const [password, setPassword] = useState('Doctor@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(true);

  const handleLoginSubmit = (e: React.FormEvent) => {
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
      return;
    }

    setIsSubmitting(true);
    const result = login(identifier.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleFillCredentials = (username: string, pass: string) => {
    setIdentifier(username);
    setPassword(pass);
    setErrorMessage(null);
    setIdentifierError(null);
    setPasswordError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl ring-4 ring-teal-500/20">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Beacon Health Clinic
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Clinic Management System (CMS) • Multi-Role Healthcare Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-200">
          {/* Error notification */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              <div>
                <span className="font-semibold text-slate-900">Authentication Failed:</span>{' '}
                {errorMessage}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLoginSubmit} noValidate>
            <div>
              <Input
                label="Username or Email"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (identifierError) setIdentifierError(null);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. md or doctor or receptionist"
                icon={<UserIcon className="w-4 h-4" />}
                className="min-h-[44px] py-2.5"
                error={identifierError || undefined}
              />
            </div>

            <div className="w-full">
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
                  className={`w-full rounded-lg border bg-white pl-11 pr-10 py-2.5 min-h-[44px] text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors ${
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
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-rose-600">{passwordError}</p>
              )}
            </div>

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
              <button
                type="button"
                onClick={() => setShowCredentialsGuide(!showCredentialsGuide)}
                className="font-medium text-teal-600 hover:text-teal-800 flex items-center gap-1 min-h-[44px]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showCredentialsGuide ? 'Hide Credentials Guide' : 'Show Role Credentials'}</span>
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold mt-2 min-h-[44px] h-11"
              isLoading={isSubmitting}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Sign In to Medical Station
            </Button>
          </form>

          {/* Credentials Guide Table for all 4 roles */}
          {showCredentialsGuide && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                  <span>Authorized Role Credentials Directory ({roleCredentials.length} Accounts)</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Click 'Fill' to load credentials
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table stackBelow="sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead hideBelow="sm">Password</TableHead>
                      <TableHead hideBelow="sm">Assigned Staff</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleCredentials.map((c) => (
                      <TableRow key={c.username}>
                        <TableCell label="Role">
                          <span className="font-medium text-teal-700 dark:text-teal-400">
                            {c.label}
                          </span>
                        </TableCell>
                        <TableCell label="Username" className="font-mono text-[11px] text-slate-700">
                          {c.username}
                        </TableCell>
                        <TableCell label="Password" hideBelow="sm" className="font-mono text-[11px] text-slate-700">
                          {c.password}
                        </TableCell>
                        <TableCell label="Assigned Staff" hideBelow="sm" className="text-slate-600 truncate max-w-[140px]">
                          {c.fullName}
                        </TableCell>
                        <TableCell label="Action" fullWidthOnStack className="text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            type="button"
                            className="min-h-[36px] sm:min-h-0 w-full sm:w-auto"
                            onClick={() => handleFillCredentials(c.username, c.password)}
                          >
                            Fill
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Security notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Encrypted Session • Role-Based Access Control Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
