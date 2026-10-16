import React, { useState, useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ClinicProvider } from '@/context/ClinicContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AttendanceProvider } from '@/context/AttendanceContext';
import { BillingProvider } from '@/context/BillingContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { seedInitialData, isStorageCorrupted, resetDemoData } from '@/data/storage';
import { Button } from '@/components/ui/Button';

export const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [hasCorruptedStorage, setHasCorruptedStorage] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (isStorageCorrupted()) {
        setHasCorruptedStorage(true);
        setIsReady(true);
        return;
      }
      try {
        await seedInitialData(false);
      } catch {
        // Fallback
      }
      setIsReady(true);
    };
    init();
  }, []);

  const handleResetCorrupted = async () => {
    await resetDemoData('System Recovery');
    setHasCorruptedStorage(false);
    window.location.reload();
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 text-sm">
        Loading
      </div>
    );
  }

  if (hasCorruptedStorage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-4">
          <h2 className="text-lg font-bold text-white">Storage Recovery</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The data stored in this browser is corrupted or unreadable. Restore factory demo data to proceed.
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={handleResetCorrupted}>
              Reset demo data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <ClinicProvider>
          <AttendanceProvider>
            <BillingProvider>
              <NotificationProvider>
                <AppLayout />
              </NotificationProvider>
            </BillingProvider>
          </AttendanceProvider>
        </ClinicProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
