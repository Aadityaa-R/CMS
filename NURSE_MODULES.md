# CLINIC MANAGEMENT SYSTEM (CMS) - NURSE MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Head Triage Nurse / Clinical Registered Nurse
- **Default Profile**: Daniel Cho, RN
- **Department**: Nursing Care & Outpatient Clinical Triage
- **Access Level**: Vital Signs Recording, Triage Queue Assessment, Nursing Observations, and Patient Preparation
- **Login Credentials**:
  - **Username**: `nurse`
  - **Email**: `nurse@beaconclinic.com` (or `d.cho@beaconclinic.com`)
  - **Password**: `Nurse@123`
  - **Badge ID**: `NUR-402`
- **Core Clinical Responsibility**:
  Perform pre-consultation clinical triage for all checked-in outpatients, record comprehensive vital signs, compute Body Mass Index (BMI), identify critical vital abnormalities, document preliminary nursing care observations, and prepare patients for physician examination.

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Nurse workstation comprises three dedicated clinical modules:

### 2.1 Module 1: Triage Station (`overview`)
The nursing command dashboard for active intake oversight.

- **Triage KPI Metrics**:
  - **Triage Waiting Queue**: Count of patients checked in at reception who have not yet had intake vitals measured.
  - **Vitals Logged Today**: Total intake vitals assessments successfully recorded and published to patient records today.
  - **Triage Protocol Status**: Operational indicator verifying standard clinical intake triage procedures are active.
- **Two-Panel Triage Layout**:
  - **Left Panel (Awaiting Triage)**: Real-time waiting list of patients with token numbers and presenting visit reasons.
  - **Right Panel (Recent Triage Vitals Log)**: Audit feed of recently completed vital measurements with timestamps and technologist IDs.
- **Action Control**:
  - **"Record Patient Vitals"**: Launches the comprehensive Vital Signs Entry Modal.

---

### 2.2 Sub-Module 2: Record Vital Signs (`vitals`)
Dedicated vital signs recording and physiological assessment station.

- **Patient Identification**:
  - Dropdown selector of checked-in patients awaiting intake.
  - Displays patient demographics, age, biological sex, and known drug allergies.
- **Physiological Parameter Form**:
  - **Blood Pressure**:
    - Systolic Pressure (`mmHg`, e.g., `120`)
    - Diastolic Pressure (`mmHg`, e.g., `80`)
    - Automatically alerts on Stage 1 / Stage 2 hypertensive thresholds ($\ge 140/90\text{ mmHg}$).
  - **Heart Rate**:
    - Resting Pulse Rate (`bpm`, e.g., `72`)
    - Flags bradycardia ($< 60\text{ bpm}$) and tachycardia ($> 100\text{ bpm}$).
  - **Body Temperature**:
    - Core body temperature in Celsius (`°C`, e.g., `36.7`)
    - Flags hypothermia ($< 35.5\text{ °C}$) and febrile temperatures ($\ge 38.0\text{ °C}$).
  - **Respiratory Rate**:
    - Breaths per minute (`breaths/min`, e.g., `16`)
  - **Oxygen Saturation ($\text{SpO}_2$)**:
    - Pulse oximetry percentage (`%`, e.g., `99`)
    - Triggers hypoxia warning if $\text{SpO}_2 < 95\%$.
  - **Anthropometric Measurements**:
    - Height in centimeters (`cm`, e.g., `170`)
    - Weight in kilograms (`kg`, e.g., `70`)
- **Automated Body Mass Index (BMI) Engine**:
  - Uses the international clinical formula:
    $$\text{BMI} = \frac{\text{Weight (kg)}}{(\text{Height (m)})^2}$$
  - Computes BMI dynamically as numbers are typed and classifies the patient into clinical ranges:
    - Normal: $18.5 - 24.9$
    - Overweight: $25.0 - 29.9$
    - Obese: $\ge 30.0$
- **"Save & Publish Vitals" Action**:
  - Validates all vital signs, binds the nurse's digital signature (`recordedByName: "Daniel Cho, RN"`), and publishes the data directly to the patient's record and Doctor's consultation desk.

---

### 2.3 Sub-Module 3: Patient Triage Queue (`queue`)
Specialized waiting room queue management for nursing staff.

- **Prioritized Triage List**:
  - Displays all arriving outpatients sorted chronologically and by token number.
  - Highlights patients presenting with acute symptoms (e.g., chest pain, shortness of breath, high fever) for expedited vital assessment.
- **Triage Action Controls**:
  - One-click trigger to immediately launch vital signs measurement for the selected patient.
  - Handoff status indicator confirming the patient is ready to be called into the doctor's room.

---

## 3. DOMAIN DATA MODELS

```typescript
export interface VitalSigns {
  id: string;
  patientId: string;
  recordedAt: string;
  recordedBy: string;
  recordedByName: string;
  systolicBp: number;
  diastolicBp: number;
  heartRateBpm: number;
  temperatureCelsius: number;
  respiratoryRate: number;
  oxygenSaturationPct: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  notes?: string;
}
```

---

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION

```
[Receptionist Desk] (Checks in Patient)
       │
       v
[Nurse Triage Station]
  • Measures BP, Pulse, Temp, SpO2
  • Measures Height & Weight -> Computes BMI
  • Documents Nursing Observations
       │
       v
[Doctor Consultation Desk]
  • Automatically displays Nurse Daniel's vitals card
  • Highlights hypertension or fever alerts
  • Informs physician's physical examination
       │
       v
[Patient Portal]
  • Patient views their recorded vitals in personal health summary
```

1. **Reception -> Nursing Handshake**: When the receptionist checks in a patient, the patient appears instantly in Nurse Daniel's queue.
2. **Nursing -> Physician Handshake**: Once Nurse Daniel logs vitals, the Doctor's desk automatically updates. The physician sees the patient's BP, pulse, and BMI with zero manual re-entry.
3. **Nursing -> Patient Transparency**: Recorded vitals populate the patient's personal portal summary under "My Health Portal".

---

## 5. NURSING CLINICAL SAFETY PROTOCOLS

- **Abnormal Vital Sign Alerts**: Automatically flags high blood pressure, tachycardia, fever, or low oxygen saturation.
- **Pre-Consultation Safety**: Ensures every patient seeing a physician has a fresh physiological baseline documented.
- **Signature Accountability**: All recorded vitals maintain an immutable nurse ID and timestamp for clinical audit compliance.

