# CLINIC MANAGEMENT SYSTEM (CMS) - PATIENT PORTAL MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Registered Outpatient / Health Portal User
- **Default Profile**: Eleanor Wright
- **Department**: Outpatient Medical Care
- **Access Level**: Personal Electronic Health Record (EHR), Appointment Self-Booking, Active Prescriptions, Lab Reports, and Billing Receipts
- **Login Credentials**:
  - **Username**: `patient`
  - **Email**: `patient@beaconclinic.com` (or `eleanor.wright@email.com`)
  - **Password**: `Patient@123`
  - **Medical Record Number (MRN)**: `MRN-84291`
- **Core User Responsibility**:
  View personal clinical summary records, track upcoming appointments and schedule visits with clinic doctors, review active prescription regimens and instructions, access certified pathology laboratory reports, and inspect invoices and payment receipts.

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Patient Portal is organized into five focused self-service modules:

### 2.1 Module 1: My Health Portal (`overview`)
The patient home dashboard displaying personal clinical vitals and active care highlights.

- **Personal Profile & Vitals Summary Card**:
  - Displays patient demographics: Full Name (Eleanor Wright), Age (39), Biological Sex (Female), Blood Group (`A+`), and registered contact phone.
  - **Latest Clinical Vitals**:
    - Blood Pressure: `128/82 mmHg`
    - Resting Heart Rate: `74 bpm`
    - Body Temperature: `36.7 °C`
    - Oxygen Saturation $\text{SpO}_2$: `99%`
    - Body Mass Index: `24.2`
  - **Clinical Safety Alerts**: Highlighted drug allergies (e.g., Penicillin) and ongoing chronic conditions (e.g., Essential Hypertension).
- **Quick Status Overview Cards**:
  - Next scheduled doctor visit.
  - Active medication count awaiting pickup or in course.
  - Latest completed laboratory diagnostic investigation.
  - Outstanding billing balance indicator.

---

### 2.2 Sub-Module 2: My Appointments & Visits (`appointments`)
Self-service appointment management and clinic visit history.

- **Upcoming & Past Appointments Card**:
  - Chronological listing of clinic visits.
  - **Fields**: Attending Doctor Name (e.g., Dr. Marcus Vance), Department, Consultation Date & Time, Visit Reason, Room Location, and Status Badge (`confirmed`, `completed`, `in_consultation`, `scheduled`).
- **Action Control: "Book Visit" (Appointment Booking Modal)**:
  - **Physician Selector**: Choose from available clinic doctors and view their consultation fee and specialty.
  - **Date & Time Picker**: Select preferred consultation day and arrival time.
  - **Reason for Visit Input**: Specify the clinical reason (e.g., "Blood pressure review", "Medication refill", "Routine wellness check").
  - **Confirmation**: Dispatches booking directly to the clinic master calendar and front desk schedule.

---

### 2.3 Sub-Module 3: My Prescriptions & Medications (`prescriptions`)
Electronic prescription registry and medication compliance instructions.

- **Prescription Directory**:
  - Complete record of all medications prescribed by attending doctors.
  - **Fields**: Prescription Number (e.g., `RX-2026-101`), Prescribing Doctor, Clinical Diagnosis, Date Prescribed, and Pharmacy Status (`dispensed`, `pending`).
- **Medication Regimen Details**:
  - Medicine Name and Commercial/Generic Designation (e.g., Amlodipine Besylate 5 mg).
  - Dosage and Administration Frequency (e.g., "Once daily in morning after breakfast").
  - Treatment Duration (e.g., "30 days").
  - Patient Instructions & Precautions (e.g., "Take with a full glass of water. Avoid skipping doses").
  - Real-time dispensary indicator showing whether the pharmacy has prepared the medicine for collection.

---

### 2.4 Sub-Module 4: My Diagnostic Lab Results (`lab_results`)
Patient access to certified clinical pathology and laboratory investigation reports.

- **Laboratory Reports Ledger**:
  - Comprehensive catalog of all laboratory tests ordered for this patient.
  - **Fields**: Test Name (e.g., Lipid Profile Assay, Comprehensive Metabolic Panel), Ordering Physician, Requisition Date, Status (`completed`, `sample_collected`, `ordered`).
- **Certified Clinical Results**:
  - Shows validated measurement values (e.g., `Total Cholesterol: 215 mg/dL; LDL: 135 mg/dL; HDL: 48 mg/dL`).
  - Displays verifying technologist's certified signature (e.g., Certified by Samuel Kim, MLS).
  - Includes clinical reference ranges and indications.

---

### 2.5 Sub-Module 5: My Invoices & Receipts (`billing`)
Financial statement ledger, fee breakdowns, and payment confirmation receipts.

- **Invoices Ledger**:
  - Displays all itemized billing statements issued to this patient.
  - **Fields**: Invoice Number (e.g., `INV-2026-001`), Date Issued, Services Itemized (Consultation Fee, Laboratory Fee, Pharmacy), Total Amount Due, and Payment Status (`paid`, `pending`, `partially_paid`).
- **Payment Settlement Details**:
  - Shows settlement method used (Cash, Credit Card, Health Insurance, or UPI).
  - Provides a formal payment confirmation indicator for paid accounts.

---

## 3. DOMAIN DATA MODELS

The Patient Portal consumes personal instances of the following core data types:

```typescript
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

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION

```
[Patient Portal] ──────── (Books Appointment) ────────> [Receptionist & Calendar]
       ▲                                                        │
       │                                            (Physician Examines)
       │                                                        │
       ├────────────── (Consultation Vitals & Notes) ───────────┤
       │                                                        │
       ├────────────── (Prescribes Medication) ───────────────> [Pharmacist]
       │                                                        │
       ├────────────── (Certifies Lab Report) <──────────────── [Lab Technician]
       │                                                        │
       └────────────── (Invoices & Receipts) <───────────────── [Accountant]
```

1. **Self-Booking -> Front Desk**: When the patient books a visit, the Receptionist immediately sees the entry in the front desk queue and the Doctor's schedule updates.
2. **Physician Examination -> Patient EMR**: When Dr. Marcus Vance updates notes or prescribes medications, they become instantly visible in the patient's portal.
3. **Lab Tech Certification -> Patient Delivery**: Once Lab Tech Samuel Kim publishes results, the patient can immediately review their diagnostic numbers without waiting for postal delivery or front desk pickup.
4. **Accountant Billing -> Patient Receipt**: Financial receipts reflect online payments and insurer clearances in real time.

---

## 5. PATIENT DATA PRIVACY & ACCESS CONTROLS

- **Strict Boundary Isolation**: Patients can ONLY view their own clinical records, prescriptions, lab results, and invoices. Under no circumstances can patient accounts access records of other patients.
- **Role Enforcement**: Patient accounts cannot modify doctor clinical notes, change lab test results, or alter invoice balances.
- **Transparency**: Clear presentation of medical terminology and dosage instructions promotes medication compliance and patient health literacy.

