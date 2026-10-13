import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ClinicProvider } from '@/context/ClinicContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppLayout } from '@/components/layout/AppLayout';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClinicProvider>
          <AppLayout />
        </ClinicProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

