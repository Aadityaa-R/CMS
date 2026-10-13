import React, { createContext, useContext, useState } from 'react';
import {
  Patient,
  Doctor,
  Appointment,
  AppointmentStatus,
  VitalSigns,
  Prescription,
  LabTest,
  LabTestStatus,
  Invoice,
  PaymentMethod,
  InventoryItem,
} from '@/types';
import {
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_VITALS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_LAB_TESTS,
  INITIAL_INVOICES,
  INITIAL_INVENTORY,
} from '@/data/mockData';

interface ClinicContextType {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  vitals: VitalSigns[];
  prescriptions: Prescription[];
  labTests: LabTest[];
  invoices: Invoice[];
  inventory: InventoryItem[];

  // Patient Actions
  addPatient: (data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;

  // Appointment Actions
  addAppointment: (data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>) => Appointment;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;

  // Vitals Actions
  recordVitals: (data: Omit<VitalSigns, 'id' | 'recordedAt'>) => VitalSigns;

  // Prescription Actions
  createPrescription: (data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>) => Prescription;
  dispensePrescriptionItem: (prescriptionId: string, itemId: string, pharmacistName: string) => void;

  // Lab Test Actions
  createLabTest: (data: Omit<LabTest, 'id' | 'testOrderNumber' | 'orderedAt' | 'status'>) => LabTest;
  updateLabTestStatus: (
    id: string,
    status: LabTestStatus,
    extra?: { result?: string; notes?: string; technicianName?: string }
  ) => void;

  // Billing Actions
  createInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'status'>) => Invoice;
  recordPayment: (id: string, amount: number, method: PaymentMethod) => void;

  // Inventory Actions
  adjustInventoryStock: (id: string, delta: number) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [vitals, setVitals] = useState<VitalSigns[]>(INITIAL_VITALS);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(INITIAL_PRESCRIPTIONS);
  const [labTests, setLabTests] = useState<LabTest[]>(INITIAL_LAB_TESTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);

  const addPatient = (data: Omit<Patient, 'id' | 'mrn' | 'registeredDate' | 'status'>): Patient => {
    const newId = `pat-${patients.length + 1}`;
    const newMrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}`;
    const newPatient: Patient = {
      ...data,
      id: newId,
      mrn: newMrn,
      registeredDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };
    setPatients((prev) => [newPatient, ...prev]);
    return newPatient;
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  };

  const addAppointment = (
    data: Omit<Appointment, 'id' | 'appointmentNumber' | 'tokenNumber'>
  ): Appointment => {
    const newId = `apt-${appointments.length + 1}`;
    const tokenNumber = appointments.length + 1;
    const appointmentNumber = `APT-2026-${String(tokenNumber).padStart(3, '0')}`;
    const newApt: Appointment = {
      ...data,
      id: newId,
      appointmentNumber,
      tokenNumber,
    };
    setAppointments((prev) => [newApt, ...prev]);
    return newApt;
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
    );
  };

  const recordVitals = (data: Omit<VitalSigns, 'id' | 'recordedAt'>): VitalSigns => {
    const newId = `vit-${vitals.length + 1}`;
    const newVital: VitalSigns = {
      ...data,
      id: newId,
      recordedAt: new Date().toISOString(),
    };
    setVitals((prev) => [newVital, ...prev]);
    return newVital;
  };

  const createPrescription = (
    data: Omit<Prescription, 'id' | 'prescriptionNumber' | 'date' | 'status'>
  ): Prescription => {
    const newId = `rx-${prescriptions.length + 1}`;
    const prescriptionNumber = `RX-2026-${String(prescriptions.length + 85).padStart(4, '0')}`;
    const newRx: Prescription = {
      ...data,
      id: newId,
      prescriptionNumber,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
    setPrescriptions((prev) => [newRx, ...prev]);
    return newRx;
  };

  const dispensePrescriptionItem = (
    prescriptionId: string,
    itemId: string,
    pharmacistName: string
  ) => {
    setPrescriptions((prev) =>
      prev.map((rx) => {
        if (rx.id !== prescriptionId) return rx;
        const updatedItems = rx.items.map((it) =>
          it.id === itemId ? { ...it, dispensed: true } : it
        );
        const allDispensed = updatedItems.every((it) => it.dispensed);
        return {
          ...rx,
          items: updatedItems,
          status: allDispensed ? 'dispensed' : 'partially_dispensed',
          dispensedBy: pharmacistName,
          dispensedAt: new Date().toISOString(),
        };
      })
    );
  };

  const createLabTest = (
    data: Omit<LabTest, 'id' | 'testOrderNumber' | 'orderedAt' | 'status'>
  ): LabTest => {
    const newId = `lab-${labTests.length + 1}`;
    const testOrderNumber = `LAB-2026-${String(labTests.length + 125).padStart(4, '0')}`;
    const newTest: LabTest = {
      ...data,
      id: newId,
      testOrderNumber,
      orderedAt: new Date().toISOString(),
      status: 'ordered',
    };
    setLabTests((prev) => [newTest, ...prev]);
    return newTest;
  };

  const updateLabTestStatus = (
    id: string,
    status: LabTestStatus,
    extra?: { result?: string; notes?: string; technicianName?: string }
  ) => {
    setLabTests((prev) =>
      prev.map((test) => {
        if (test.id !== id) return test;
        return {
          ...test,
          status,
          ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
          ...(status === 'sample_collected'
            ? { sampleCollectedAt: new Date().toISOString() }
            : {}),
          ...(extra?.result ? { result: extra.result } : {}),
          ...(extra?.notes ? { clinicalNotes: extra.notes } : {}),
          ...(extra?.technicianName ? { technicianName: extra.technicianName } : {}),
        };
      })
    );
  };

  const createInvoice = (
    data: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'status'>
  ): Invoice => {
    const newId = `inv-${invoices.length + 1}`;
    const invoiceNumber = `INV-2026-${String(invoices.length + 500).padStart(4, '0')}`;
    const newInv: Invoice = {
      ...data,
      id: newId,
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      status: data.paidAmount >= data.totalAmount ? 'paid' : data.paidAmount > 0 ? 'partially_paid' : 'unpaid',
    };
    setInvoices((prev) => [newInv, ...prev]);
    return newInv;
  };

  const recordPayment = (id: string, amount: number, method: PaymentMethod) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const newPaid = inv.paidAmount + amount;
        const newStatus =
          newPaid >= inv.totalAmount
            ? 'paid'
            : newPaid > 0
            ? 'partially_paid'
            : 'unpaid';
        return {
          ...inv,
          paidAmount: newPaid,
          status: newStatus,
          paymentMethod: method,
        };
      })
    );
  };

  const adjustInventoryStock = (id: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newStock = Math.max(0, item.currentStock + delta);
        return { ...item, currentStock: newStock };
      })
    );
  };

  return (
    <ClinicContext.Provider
      value={{
        patients,
        doctors,
        appointments,
        vitals,
        prescriptions,
        labTests,
        invoices,
        inventory,
        addPatient,
        updatePatient,
        addAppointment,
        updateAppointmentStatus,
        recordVitals,
        createPrescription,
        dispensePrescriptionItem,
        createLabTest,
        updateLabTestStatus,
        createInvoice,
        recordPayment,
        adjustInventoryStock,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
