# CLINIC MANAGEMENT SYSTEM (CMS) - CLINIC ADMIN MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Clinic Director / Executive Administrator
- **Default Profile**: Dr. Sarah Jenkins
- **Department**: Clinic Administration & Executive Management
- **Access Level**: Full Administrative Oversight, Operations Governance, Master Roster & Analytics
- **Login Credentials**:
  - **Username**: `admin`
  - **Email**: `admin@beaconclinic.com`
  - **Password**: `Admin@123`
  - **Badge ID**: `ADM-101`
- **Core Clinical Responsibility**:
  Oversee clinic-wide medical operations, supervise healthcare personnel rosters and credentials, maintain registered patient directories, monitor financial revenue streams, and verify supply inventory continuity.

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Clinic Admin workstation provides full institutional control through six key operational modules:

### 2.1 Module 1: Clinic Overview (`overview`)
The executive high-level dashboard for operational visibility.

- **Institutional KPI Cards**:
  - **Total Registered Patients**: Total active outpatient records registered in the clinical repository.
  - **Active Medical Staff**: Count of physicians, nursing personnel, pharmacists, technologists, and administrative staff currently rostered.
  - **Today's Clinic Consultations**: Real-time counter of appointments scheduled, checked-in, and completed for the current day.
  - **Monthly Clinic Revenue**: Accumulated gross billing revenue and settlement metrics.
- **Departmental Activity & Resource Allocation**:
  - Outpatient load breakdown across Cardiology, Internal Medicine, Pediatrics, Triage, and Diagnostics.
  - Real-time room occupancy and utilization rates.
- **Quick Administration Actions**:
  - One-click shortcuts for registering new patients, onboarding physicians, and reviewing inventory requisitions.

---

### 2.2 Sub-Module 2: Patient Directory (`patients`)
Master outpatient demographic registry and Electronic Health Record (EHR) directory.

- **Patient Search & Filtering**:
  - Instant lookup by Patient Name, Medical Record Number (MRN), contact phone number, or blood group.
- **Master Directory Table**:
  - **MRN**: Unique permanent clinical identifier (e.g., `MRN-84291`).
  - **Patient Details**: Full name, age, biological sex, date of birth.
  - **Blood Group**: Standard ABO/Rh typing (`A+`, `O+`, `B+`, `AB+`, etc.).
  - **Clinical Safety Alerts**: Highlighted allergy warnings (e.g., Penicillin, NSAIDs) and chronic condition tags (e.g., Hypertension, Type 2 Diabetes).
  - **Contact & Emergency**: Telephone number, residential address, emergency contact person and relationship.
  - **Record Status**: Active / Inactive patient status indicators.
- **Administrative Action Controls**:
  - Review demographic profiles, update emergency contacts, and audit registration dates.

---

### 2.3 Sub-Module 3: Doctor Management (`doctors`)
Clinical staff directory, credentialing, and physician consultation scheduling.

- **Physician Roster Table**:
  - **Physician Identity**: Full name, medical qualifications (e.g., MD, FACC, MBBS).
  - **Specialization & Department**: Clinical department assignment (e.g., Cardiology, General Practice).
  - **Duty Schedule**: Weekly consultation days and clinic hours (e.g., Mon-Fri 09:00 - 16:30).
  - **Consultation Fee**: Standard outpatient tariff per consultation session.
  - **Status Badge**: Real-time duty availability (`Active`, `On Leave`, or `Inactive`).
- **Physician Onboarding & Profile Updates**:
  - Add new doctors to the clinic schedule, set room allocations, and adjust consultation fee tariffs.

---

### 2.4 Sub-Module 4: All Appointments & Master Calendar (`appointments`)
Institutional schedule coordination covering all physician consultation rooms.

- **Clinic-Wide Calendar Feed**:
  - Centralized ledger of all outpatient bookings, walk-ins, and follow-up consultations.
- **Schedule Table Fields**:
  - Appointment Token #, Patient Name, Attending Physician, Scheduled Time, Reason for Visit, and Workflow Status (`scheduled`, `confirmed`, `checked_in`, `in_consultation`, `completed`, `cancelled`).
- **Action Controls**:
  - Filter appointments by attending physician or date range.
  - Administrative override to mark appointments completed or reschedule slots.

---

### 2.5 Sub-Module 5: Revenue & Billing Summaries (`billing`)
Executive financial governance and clinic revenue performance audit.

- **Financial Analytics**:
  - Daily, weekly, and monthly fee collections broken down by consultation fees, diagnostic laboratory charges, and pharmacy sales.
  - Outstanding balances and pending insurance claim receivables.
- **Accounts Audit Ledger**:
  - High-level invoice reconciliation linked directly with the Accountant module.

---

### 2.6 Sub-Module 6: Stock & Inventory Alerts (`inventory`)
Institution-level pharmaceutical and medical supply oversight.

- **Threshold Monitoring**:
  - Automated detection of medications and clinical consumables falling below minimum safe buffer stock.
- **Batch & Expiry Risk Controls**:
  - Identifies pharmaceutical items nearing expiry date to eliminate wastage and prevent stockouts.

---

## 3. DOMAIN DATA MODELS

The Clinic Admin module governs institutional instances of the following core data models:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'clinic_admin';
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
}
```

---

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION

```
[Clinic Admin] ─── (Manages Doctors & Fees) ───> [Receptionist] (Books Appointments)
       │                                                 │
       ├─── (Oversees Master Directory) ─────────> [Nurse & Doctor] (Clinical Intake)
       │                                                 │
       └─── (Audits Revenue & Supply) ───────────> [Accountant & Pharmacist]
```

1. **Doctor Scheduling -> Front Desk**: When the Admin updates a doctor's consultation fee or available days, the Receptionist's booking engine immediately reflects the new fee and valid time slots.
2. **Patient Directory -> Clinical Teams**: Updates made to patient demographics or emergency contacts in the master directory propagate to Doctor, Nurse, and Accountant views.
3. **Institutional Reporting**: Aggregates real-time events from all 7 other roles into executive KPI metrics without requiring manual database reconciliation.

---

## 5. REGULATORY & AUDIT STANDARDS

- **Executive Authority**: Full access to institutional data while respecting patient confidentiality and role-based access rules.
- **Credential Governance**: Enforces staff credentials and active license tracking.
- **Operational Redundancy**: Oversees department queues to ensure patient waiting times comply with clinical benchmarks.

