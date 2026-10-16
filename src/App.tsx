import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ClinicProvider } from '@/context/ClinicContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AttendanceProvider } from '@/context/AttendanceContext';
import { AppLayout } from '@/components/layout/AppLayout';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClinicProvider>
          <AttendanceProvider>
            <AppLayout />
          </AttendanceProvider>
        </ClinicProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

