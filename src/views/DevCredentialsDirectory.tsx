import React from 'react';
import { RoleCredential } from '@/types';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { KeyRound } from 'lucide-react';
import { audienceOf, AuthAudience } from '@/services/authService';

interface DevCredentialsDirectoryProps {
  roleCredentials: RoleCredential[];
  onFill: (username: string, pass: string) => void;
  currentAudience?: AuthAudience;
}

function getRoleHint(role: string): string {
  switch (role) {
    case 'md':
      return 'Try: Full clinic governance, staff clearance, and consultation desk.';
    case 'doctor':
      return 'Try: Patient consultation desk, triage vitals, and prescribing.';
    case 'receptionist':
      return 'Try: Reception lounge, walk-in check-in, tokens, and billing.';
    case 'patient':
      return 'Try: Health portal, upcoming visits, prescriptions, and invoice settlement.';
    default:
      return 'Try: Standard station access.';
  }
}

export const DevCredentialsDirectory: React.FC<DevCredentialsDirectoryProps> = ({
  roleCredentials = [],
  onFill,
  currentAudience,
}) => {
  const allCredentials = roleCredentials || [];
  const credentialsList = currentAudience
    ? allCredentials.filter((c) => audienceOf(c) === currentAudience)
    : allCredentials;

  const audienceLabel =
    currentAudience === 'patient'
      ? 'Patient Accounts'
      : currentAudience === 'staff'
      ? 'Clinic Staff Accounts'
      : 'Accounts';

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
          <span>
            Authorized Credentials Directory ({credentialsList.length} {audienceLabel})
          </span>
        </h3>
        <span className="text-[0.6875rem] text-slate-500">
          Click 'Fill' to load credentials
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 w-full">
        <Table stackBelow="sm">
          <TableHeader>
            <TableRow>
              <TableHead kind="short" priority={1}>Role</TableHead>
              <TableHead kind="short" priority={2}>Username</TableHead>
              <TableHead kind="short" priority={4}>Password</TableHead>
              <TableHead kind="short" priority={5}>Assigned Staff & Hint</TableHead>
              <TableHead kind="short" priority={3} isActions className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentialsList.map((c) => (
              <TableRow key={c.username}>
                <TableCell label="Role" kind="short" priority={1}>
                  <span className="font-medium text-teal-700 dark:text-teal-400">
                    {c.label}
                  </span>
                </TableCell>
                <TableCell label="Username" kind="short" priority={2} className="text-[0.6875rem] text-slate-700">
                  {c.username}
                </TableCell>
                <TableCell label="Password" kind="short" priority={4} className="text-[0.6875rem] text-slate-700">
                  {c.password}
                </TableCell>
                <TableCell label="Assigned Staff" kind="short" priority={5} className="whitespace-normal">
                  <div className="text-xs text-slate-800 font-medium truncate">{c.fullName}</div>
                  <div className="text-[0.625rem] text-slate-500 mt-0.5 leading-snug">
                    {getRoleHint(c.role)}
                  </div>
                </TableCell>
                <TableCell label="Action" fullWidthOnStack kind="short" priority={3} isActions className="text-right">
                  <Button
                    size="xs"
                    variant="outline"
                    type="button"
                    className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                    onClick={() => onFill(c.username, c.password)}
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
  );
};

export default DevCredentialsDirectory;
