import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ClinicProvider } from '@/context/ClinicContext';
import { AppLayout } from '@/components/layout/AppLayout';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ClinicProvider>
        <AppLayout />
      </ClinicProvider>
    </AuthProvider>
  );
};

export default App;
