import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginAs, availableRoles } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('clinic_admin');
  const [email, setEmail] = useState('admin@beaconclinic.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const roleEmails: Record<UserRole, string> = {
      clinic_admin: 'admin@beaconclinic.com',
      doctor: 'm.vance@beaconclinic.com',
      patient: 'eleanor.wright@email.com',
      receptionist: 'p.sharma@beaconclinic.com',
      nurse: 'd.cho@beaconclinic.com',
      pharmacist: 'm.lin@beaconclinic.com',
      accountant: 'd.ross@beaconclinic.com',
      lab_technician: 's.kim@beaconclinic.com',
    };
    setEmail(roleEmails[role]);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAs(selectedRole);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background clinical decorative gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/30 via-slate-900 to-slate-950 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-xl ring-4 ring-teal-500/20">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Beacon Health Clinic
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Clinic Management System (CMS) • Secure Staff & Patient Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-200">
          {/* Quick Demo Credentials Switcher */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                1-Click Demo Account Selector
              </span>
              <span className="text-[11px] text-slate-500">
                8 Pre-configured Roles
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {availableRoles.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => handleRoleSelect(r.role)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                    selectedRole === r.role
                      ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-700'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="font-semibold truncate">{r.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      selectedRole === r.role ? 'text-teal-100' : 'text-slate-400'
                    }`}
                  >
                    {r.department}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <Input
                label="Email Address or Username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Remember this terminal</span>
              </label>
              <a href="#" className="font-medium text-teal-600 hover:text-teal-700">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold mt-2"
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Sign In as {availableRoles.find((r) => r.role === selectedRole)?.label}
            </Button>
          </form>

          {/* Security notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Encrypted Session • HIPAA & Data Privacy Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

