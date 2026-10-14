import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { Shield, Stethoscope, User, Calendar } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, switchRole, availableRoles, currentUser } = useAuth();

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5" />;
      case 'doctor':
        return <Stethoscope className="w-3.5 h-3.5" />;
      case 'patient':
        return <User className="w-3.5 h-3.5" />;
      case 'receptionist':
        return <Calendar className="w-3.5 h-3.5" />;
      default:
        return <Stethoscope className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-slate-900 text-white text-xs border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-sm z-30 relative">
      <div className="flex items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-teal-400 text-[11px]">
          Development Role Switcher:
        </span>
        <span className="text-slate-400 hidden sm:inline text-[11px]">
          Select any of the 3 clinic roles to test its dashboard and workflow:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {availableRoles.map((r) => {
          const isActive = currentRole === r.role;
          return (
            <button
              key={r.role}
              onClick={() => switchRole(r.role)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={r.description}
            >
              <span>{getRoleIcon(r.role)}</span>
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center gap-2 border-l border-slate-800 pl-3 text-slate-300 text-[11px]">
        <span className="text-slate-400">Logged in:</span>
        <span className="font-semibold text-white">{currentUser.name}</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
          {currentUser.badgeNumber || currentUser.department}
        </span>
      </div>
    </div>
  );
};

