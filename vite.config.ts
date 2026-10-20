import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            return 'vendor';
          }
          if (id.includes('src/views/DoctorView')) {
            return 'view-doctor';
          }
          if (id.includes('src/views/ReceptionistView')) {
            return 'view-receptionist';
          }
          if (id.includes('src/views/BillingView')) {
            return 'view-billing';
          }
          if (id.includes('src/views/AttendanceView')) {
            return 'view-attendance';
          }
          if (id.includes('src/views/AccessControlView')) {
            return 'view-access';
          }
          if (id.includes('src/views/DashboardView')) {
            return 'view-dashboard';
          }
          if (id.includes('src/views/PatientPortal') || id.includes('src/views/PatientView')) {
            return 'view-patient';
          }
        },
      },
    },
  },
});


