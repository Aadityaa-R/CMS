# CLINIC MANAGEMENT SYSTEM (CMS) - RECEPTIONIST MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Front Desk Coordinator / Reception Officer
- **Default Profile**: Priya Sharma
- **Department**: Front Desk, Patient Reception & Triage Intake
- **Access Level**: Outpatient Intake, Check-In, Token Dispatch, Patient Registration, and Doctor Appointment Scheduling
- **Login Credentials**:
  - **Username**: `receptionist`
  - **Email**: `receptionist@beaconclinic.com` (or `p.sharma@beaconclinic.com`)
  - **Password**: `Reception@123`
  - **Badge ID**: `REC-301`
- **Core Clinical Responsibility**:
  Serve as the primary intake point for arriving outpatients, manage the waiting lounge and queue token system, register new patient demographic and safety records, coordinate walk-in visits, and schedule consultations with clinic physicians.

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Receptionist workstation features four dedicated operational modules:

### 2.1 Module 1: Front Desk Overview (`overview`)
The front desk dashboard monitoring patient throughput and clinic reception load.

- **Intake KPI Metrics**:
  - **Today's Total Appointments**: Total scheduled outpatient visits on the clinic master calendar for today.
  - **Patients Checked In**: Current count of patients who have physically arrived and are waiting in the lounge.
  - **Completed Consultations Today**: Patients who have finished their medical examination and exited the doctor's room.
  - **Doctors on Duty**: Count of clinical physicians currently active and taking consultations.
- **Waiting Lounge Status**:
  - Real-time monitoring of queue load to prevent front desk congestion.
- **Quick Action Bar**:
  - One-click shortcuts for rapid new patient registration and immediate walk-in appointment booking.

---

### 2.2 Sub-Module 2: Patient Check-In & Queue Management (`checkin`)
Workstation for patient arrival verification, token issuance, and queue advancement.

- **Queue Search & Filter**:
  - Instant search across arriving patients by Name, Appointment ID, or MRN.
- **Front Desk Queue Table**:
  - **Token #**: System-generated chronological token (e.g., `Token #101`, `Token #102`).
  - **Time Slot**: Scheduled consultation time.
  - **Patient**: Full patient name and contact telephone number.
  - **Attending Doctor**: Physician and department handling the appointment.
  - **Visit Type**: Scheduled visit or emergency walk-in indicator.
  - **Reason for Visit**: Patient's presenting complaint.
  - **Status Badge**: Current workflow state (`scheduled`, `confirmed`, `checked_in`, `in_consultation`, `completed`).
- **Action Control: "Check In & Issue Token"**:
  - One-click check-in button for arriving patients.
  - Transitions appointment status from `scheduled` or `confirmed` to `checked_in`.
  - Dispatches the patient directly to the **Nurse Triage Queue** for vital signs assessment.

---

### 2.3 Sub-Module 3: Register New Patient (`registration`)
Comprehensive patient intake form for creating new permanent clinical records.

- **Demographic Intake Fields**:
  - First Name and Last Name
  - Date of Birth (DOB) and Gender (`Male`, `Female`, `Other`)
  - Contact Telephone and Email Address
  - Residential Street Address
- **Clinical Safety Baseline**:
  - Blood Group Selection (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
  - Known Drug and Food Allergies (comma-separated, e.g., "Penicillin, Peanuts")
  - Chronic Conditions / Medical History (e.g., "Hypertension, Asthma")
- **Emergency Contact**:
  - Contact Person Full Name, Relationship (e.g., Spouse, Parent), and Emergency Phone Number.
- **"Complete Patient Registration" Action**:
  - Validates required fields and automatically assigns a new permanent Medical Record Number (e.g., `MRN-90234`).
  - Stores the patient record immediately in the clinic-wide database for doctor and nurse lookup.

---

### 2.4 Sub-Module 4: Book Appointment (`booking`)
Appointment scheduling engine connecting patients with available physicians.

- **Booking Parameters**:
  - **Patient Selection**: Dropdown search of all registered clinic outpatients.
  - **Doctor Selection**: Dropdown listing active physicians with their department and consultation tariff (e.g., Dr. Marcus Vance - Cardiology - $150.00).
  - **Consultation Date & Time**: Date picker and slot selector honoring the doctor's duty hours.
  - **Visit Category**: Scheduled Appointment or Urgent Walk-In.
  - **Reason for Visit**: Presenting clinical reason (e.g., "Cardiology consultation", "Follow-up", "Cold symptoms").
- **"Confirm Appointment & Issue Token" Action**:
  - Books the slot, assigns the next sequential token number, and adds the appointment to the Doctor's consultation desk and Front Desk queue.

---

## 3. DOMAIN DATA MODELS

```typescript
export interface Appointment {
  id: string;
  tokenNumber: number;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  dateTime: string;
  status:
    | 'scheduled'
    | 'confirmed'
    | 'checked_in'
    | 'in_consultation'
    | 'completed'
    | 'cancelled';
  reasonForVisit: string;
  type: 'consultation' | 'follow_up' | 'walk_in' | 'emergency';
  notes?: string;
}
```

---

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION

```
[Arriving Patient]
       │
       v
[Receptionist Desk] ──── (1-Click Check In) ────> [Token Issued: #101]
       │                                                    │
       │                                                    v
       ├────────────────────────────────────────> [Nurse Triage Queue]
       │                                          (Measures Vitals & BMI)
       │                                                    │
       v                                                    v
[Doctor Queue] <──────────────────────────────── (Triage Complete)
(Calls Patient into Examination Room)
       │
       v
[Accountant Desk] (Collects Consultation Fee)
```

1. **Patient Check-In -> Nurse Triage**: When the Receptionist clicks **"Check In & Issue Token"**, the patient immediately appears in Nurse Daniel Cho's triage queue without phone calls or paper slips.
2. **New Patient Intake -> System-Wide Visibility**: Newly registered patients can immediately be booked for appointments, prescribed medications by doctors, and billed by accountants.
3. **Queue Coordination**: Real-time status sync prevents patients from being called into a doctor's room before nurse triage has taken place.

---

## 5. RECEPTION PROTOCOLS & QUALITY STANDARDS

- **Accurate Identity Verification**: Prevents duplicate records by cross-referencing MRN and contact telephone.
- **Triage Safety Flags**: Mandatory entry of allergy information during registration ensures downstream clinical safety.
- **Walk-In Prioritization**: Enables front desk staff to triage walk-in cases into available physician gaps.

