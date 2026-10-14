# CLINIC MANAGEMENT SYSTEM (CMS) - ADMIN MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Administrator
- **Default Profile**: Dr. Sarah Jenkins
- **Department**: Administration & Executive Management
- **Access Level**: Full Administrative Oversight, Operations Governance, Master Roster & Analytics
- **Login Credentials**:
  - **Username**: `admin`
  - **Email**: `admin@beaconclinic.com`
  - **Password**: `Admin@123`
  - **Badge ID**: `ADM-101`
- **Core Clinical Responsibility**:
  Oversee clinic-wide medical operations, supervise healthcare personnel rosters and credentials, maintain registered patient directories, manage consultation schedules, monitor financial revenue streams, and verify supply inventory continuity.

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Admin workstation is modeled directly on the design language, reactive feedback mechanisms, and sub-module ergonomics of the Laboratory Technician module, providing full institutional control through six operational workstations:

### 2.1 Module 1: Clinic Overview (`overview`)
The executive high-level dashboard and operations dispatch desk.

- **Clinical & Executive KPI Cards**:
  - **Total Registered Patients**: Master active outpatient count with permanent electronic medical records.
  - **Active Consulting Doctors**: Real-time count of specialists currently on duty / active roster.
  - **Consultations Today**: Running tally of scheduled, in-consultation, and completed visits for the current day.
  - **Gross Revenue Collected**: Accumulated settlements and fee collections, paired with pending receivables.
- **Master Consultation Dispatch Table**:
  - Displays today's patient queue across all attending physicians.
  - **Fields**: Token & Appointment ID, Patient Name & Phone, Attending Doctor & Department, Scheduled Time, Status badge with colored indicator dot, Dynamic Action control (`Conclude` / `Completed`).
- **Operational Alerts & Clinic Health**:
  - Automated low buffer stock detection with 1-click restock shortcut.
  - Outpatient triage wait time monitor.
  - Accounts settlement rate metric.

---

### 2.2 Sub-Module 2: Patient Directory & EMR (`patients`)
Master outpatient demographic registry and Electronic Health Record (EHR) directory.

- **Universal Search & Status Scope Filter**:
  - Instant lookup by Patient Name, Medical Record Number (MRN), contact phone, or blood group.
  - Filter by Active records or Clinical Allergy Alerts.
- **Master Patient Directory Table**:
  - **MRN**: Unique permanent clinical identifier (e.g., `MRN-84291`).
  - **Patient Details**: Full name and email address.
  - **Demographics**: Calculated age and biological gender.
  - **Contact**: Primary telephone number.
  - **Blood Group**: Standard ABO/Rh typing badge (`A+`, `O+`, `B+`, etc.).
  - **Safety Alerts**: High-visibility allergy badges (e.g., Penicillin, NSAIDs) or `None Recorded`.
  - **EMR Status**: Real-time active indicator dot.
- **Action Control**:
  - **"Register Patient"**: Launches modal to add new patient with full validation and auto MRN generation.

---

### 2.3 Sub-Module 3: Doctor Management & Credentialing (`doctors`)
Clinical specialist directory, credentialing roster, room allocations, and duty management.

- **Target Queue & Filtering**:
  - Search by doctor name, medical department, specialty, or room number.
  - Filter active duty vs on-leave physicians.
- **Master Physician Table**:
  - **Physician**: Name and clinical email address.
  - **Specialty & Department**: Department assignment and sub-specialty.
  - **Qualifications**: Medical degrees and board certifications (e.g., MD, FACC, MBBS).
  - **Consulting Schedule**: Duty hours and assigned consultation room.
  - **Consultation Fee**: Standard outpatient tariff per visit.
  - **Duty Status**: Live availability dot (`Active`, `On Leave`, `Inactive`).
- **Action Controls**:
  - **"Toggle Duty Status"**: Instant 1-click status switcher between Active Duty and On Leave with reactive notification.
  - **"Onboard Doctor"**: Launches modal to register a new physician into the consulting roster.

---

### 2.4 Sub-Module 4: Master Appointment Ledger (`appointments`)
Institutional consultation schedule coordination covering all physician consultation desks.

- **Clinic-Wide Calendar Feed**:
  - Comprehensive ledger of all outpatient bookings, walk-ins, and follow-ups.
- **Master Schedule Table**:
  - Token #, Appointment ID, Patient Name & Phone, Attending Doctor & Department, Date & Time, Reason for Visit, Status badge with colored dot.
- **Action Control**:
  - **"Conclude"**: 1-click administrative resolution to mark visit completed with reactive notification.

---

### 2.5 Sub-Module 5: Revenue Governance & Invoices (`billing`)
Executive financial oversight and institutional accounts audit.

- **Accounts Ledger Table**:
  - Invoice #, Patient Name, Issue Date, Total Amount Billed, Amount Settled, Balance Due, Payment Method, Settlement Status badge.
- **Action Control**:
  - **"Record Payment"**: Opens the payment settlement modal to accept payments (Credit/Debit Card, Cash, Insurance Claim, Digital UPI) and update invoice balance in real time.

---

### 2.6 Sub-Module 6: Stock & Supply Governance (`inventory`)
Institution-level pharmaceutical and clinical supply oversight.

- **Buffer Stock Table**:
  - Item Description & Batch Number, SKU Code, Category, Current Stock vs Minimum Threshold, Unit Cost, Status badge (`Stock Optimal` vs `Low Buffer Alert`).
- **Action Control**:
  - **"Restock Supply"**: Launches inventory replenishment modal to add stock units directly to active inventory.

---

## 3. DOMAIN DATA MODELS

The Admin workstation operates on and governs the core clinical data structures:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  title?: string;
  department?: string;
  badgeNumber?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  department: string;
  phone: string;
  email: string;
  consultationFee: number;
  availableDays: string[];
  consultationHours: string;
  status: 'active' | 'on_leave' | 'inactive';
  roomNumber: string;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  bloodGroup: BloodGroup;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: EmergencyContact;
  registeredDate: string;
  status: 'active' | 'inactive';
}
```

---

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION (5 ROLES)

```
[Admin] ─── (Manages Doctors & Fees) ───> [Receptionist] (Books Appointments & Check-in)
   │                                              │
   ├─── (Oversees Master Directory) ──────> [Doctor] (Consultations, e-Rx & Lab Orders)
   │                                              │
   ├─── (Audits Revenue & Inventory) <───── [Patient] (Reviews Records & Pays Bills)
   │                                              │
   └─── (Diagnostic Quality Control) ─────> [Lab Technician] (Processes Assays & Results)
```

1. **Physician Onboarding & Tariffs -> Receptionist Booking**: When the Admin onboards a doctor or updates consultation fees, the Receptionist's booking engine immediately offers the doctor and current tariffs.
2. **Master EMR Directory -> Clinic Workstations**: Newly registered patients or demographic updates instantly propagate across Doctor consultation desks, Reception check-in queues, and Lab accessioning.
3. **Billing & Inventory Governance**: Prescription and lab order fulfillment events adjust stock levels and invoice balances, providing executive financial and buffer alerts without external reconciliation.

---

## 5. UI PATTERNS & ERGONOMIC STANDARDS

- **Dark Mode Compatibility**: Full support across light (`bg-slate-50`) and dark (`dark:bg-slate-950`) themes with high-contrast text and border styling.
- **Reactive Notification System**: Real-time feedback banner appears upon every action (patient registration, doctor duty toggle, payment recording, inventory restock) with auto-dismiss after 4.5 seconds.
- **Universal Search & Filter**: Integrated search bar with dropdown status selector and click-outside dismissal matching the Lab Technician workstation.
