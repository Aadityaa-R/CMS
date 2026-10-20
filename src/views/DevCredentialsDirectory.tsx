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

interface DevCredentialsDirectoryProps {
  roleCredentials: RoleCredential[];
  onFill: (username: string, pass: string) => void;
}

export const DevCredentialsDirectory: React.FC<DevCredentialsDirectoryProps> = ({
  roleCredentials = [],
  onFill,
}) => {
  const credentialsList = roleCredentials || [];
  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
          <span>Authorized Role Credentials Directory ({credentialsList.length} Accounts)</span>
        </h3>
        <span className="text-[0.6875rem] text-slate-500">
          Click 'Fill' to load credentials
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table stackBelow="sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-3/12 min-w-[120px]">Role</TableHead>
              <TableHead className="w-2/12 min-w-[100px]">Username</TableHead>
              <TableHead hideBelow="sm" className="w-2/12 min-w-[100px]">Password</TableHead>
              <TableHead hideBelow="sm" className="w-3/12 min-w-[140px]">Assigned Staff</TableHead>
              <TableHead className="w-2/12 min-w-[80px] text-right whitespace-nowrap">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentialsList.map((c) => (
              <TableRow key={c.username}>
                <TableCell label="Role" className="w-3/12 min-w-[120px]">
                  <span className="font-medium text-teal-700 dark:text-teal-400">
                    {c.label}
                  </span>
                </TableCell>
                <TableCell label="Username" className="w-2/12 min-w-[100px] text-[0.6875rem] text-slate-700">
                  {c.username}
                </TableCell>
                <TableCell label="Password" hideBelow="sm" className="w-2/12 min-w-[100px] text-[0.6875rem] text-slate-700">
                  {c.password}
                </TableCell>
                <TableCell label="Assigned Staff" hideBelow="sm" className="w-3/12 min-w-[140px] text-slate-600 truncate">
                  {c.fullName}
                </TableCell>
                <TableCell label="Action" fullWidthOnStack className="w-2/12 min-w-[80px] text-right whitespace-nowrap">
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
