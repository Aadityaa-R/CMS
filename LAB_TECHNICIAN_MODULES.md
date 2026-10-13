# CLINIC MANAGEMENT SYSTEM (CMS) - LABORATORY TECHNICIAN MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Lead Medical Laboratory Technologist
- **Default Profile**: Samuel Kim, MLS
- **Department**: Diagnostic Pathology & Clinical Laboratory
- **Access Level**: Laboratory Diagnostics, Specimen Accessioning, and Result Certification
- **Login Credentials**:
  - **Username**: `labtech`
  - **Email**: `labtech@beaconclinic.com` (or `s.kim@beaconclinic.com`)
  - **Password**: `LabTech@123`
  - **Badge ID**: `LAB-703`
- **Core Clinical Responsibility**:
  Process all diagnostic investigations ordered by attending physicians, manage biological specimen intake and phlebotomy tracking, run automated clinical analyzers, record certified findings, and publish laboratory reports directly to the Electronic Medical Record (EMR).

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Laboratory Technician workstation consists of three primary modules and workstations:

### 2.1 Module 1: Laboratory Worklist (`overview`)
The primary operational overview and pathology dispatch desk.

- **Clinical KPI Metrics**:
  - **Active Laboratory Orders**: Total count of all diagnostic test orders currently awaiting sample collection, processing, or technologist certification.
  - **Urgent / STAT Priority**: Real-time counter of high-priority investigations requiring immediate turnaround (e.g., troponin cardiac markers, acute metabolic screens, critical electrolyte panels).
  - **Completed Assays Today**: Running count of finalized, certified laboratory test reports published to the clinic EMR today.
- **Master Pathology Worklist Table**:
  - Displays a consolidated directory of all laboratory orders across all lifecycle states.
  - **Fields Displayed**:
    - **Order #**: Unique laboratory requisition identifier (e.g., `ORD-LAB-01`).
    - **Patient**: Patient name, Medical Record Number (MRN), and biological sample type.
    - **Investigation Name**: Specific test or diagnostic assay ordered (e.g., Complete Blood Count, Lipid Profile, CMP, HbA1c, hs-CRP, TSH).
    - **Category**: Diagnostic pathology discipline (e.g., Hematology, Biochemistry, Immunology, Endocrinology).
    - **Ordering Doctor**: Full name and department of the physician who requested the investigation.
    - **Priority**: Visual clinical triage badge (`ROUTINE`, `URGENT`, or `STAT`).
    - **Specimen Status**: Progression badge (`ordered`, `sample_collected`, or `completed`).
    - **Result / Values**: Measured clinical values once published, or `Awaiting Testing`.
    - **Laboratory Actions**: Dynamic action controls (`Collect Sample`, `Enter Result`, or `Validated`).

---

### 2.2 Sub-Module 2: Sample Collection & Specimen Accessioning (`samples`)
Dedicated workstation for biological specimen collection, phlebotomy, and intake handling.

- **Target Queue**:
  - Filters and displays only investigations in the `ordered` state where a physical biological sample has not yet been collected from the patient.
- **Sample Container Protocol**:
  - Identifies the required specimen collection container and transport guidelines:
    - Venous Whole Blood (EDTA Lavender Top)
    - Serum (Gold / Tiger Top Separator)
    - Plasma (Lithium Heparin Green Top)
    - Midstream Sterile Urine
- **Action Control**:
  - **"Collect Sample"**: Single-click accession button.
  - Updates test order status from `ordered` to `sample_collected`.
  - Records accession timestamp and transitions the specimen into the analytical testing queue.

---

### 2.3 Sub-Module 3: Diagnostic Results Entry & Certification (`results`)
Dedicated analytical workstation for recording measured assay values, adding clinical technologist observations, and publishing validated diagnostic reports.

- **Target Queue**:
  - Filters for investigations in the `sample_collected` or `processing` state awaiting certified results.
  - Displays the ordering doctor's clinical indication (e.g., "Routine cardiovascular risk screening", "Suspected metabolic dysregulation").
- **Action Control**:
  - **"Enter Result"**: Launches the accessible Result Certification Modal.
- **Result Certification Modal**:
  - **Requisition Context Banner**: Summarizes patient name, test order ID, investigation category, and ordering physician.
  - **Diagnostic Result Value Input**: Form field for numerical or qualitative findings:
    - *Quantitative Example*: `Total Cholesterol: 215 mg/dL; LDL: 135 mg/dL; HDL: 48 mg/dL; Triglycerides: 160 mg/dL`
    - *Metabolic Example*: `HbA1c: 6.2% (Estimated Average Glucose: 131 mg/dL)`
    - *Qualitative Example*: `Negative for microalbuminuria`
  - **Technologist Observations / Notes**: Form field for reference range comparisons, analyzer calibration remarks, or specimen integrity notes.
  - **"Certify & Publish Result" Action**:
    - Validates inputs.
    - Stamps the authenticated technologist's credentials (`technicianName`).
    - Sets order status to `completed`.
    - Dispatches findings in real-time across the clinic network.

---

## 3. DOMAIN DATA MODEL (`LabTest`)

The Laboratory Technician module operates on the following TypeScript data structure:

```typescript
export interface LabTest {
  id: string;
  testOrderNumber: string;    // e.g. "ORD-LAB-01"
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  testName: string;            // e.g. "Comprehensive Metabolic Panel (CMP)"
  category: string;            // e.g. "Biochemistry", "Hematology"
  orderDate: string;           // ISO 8601 timestamp
  priority: 'routine' | 'urgent' | 'stat';
  sampleType: string;          // e.g. "Venous Blood", "Serum", "Urine"
  status: 'ordered' | 'sample_collected' | 'completed';
  result?: string;             // Certified laboratory values
  normalRange?: string;        // Reference interval
  units?: string;              // Units of measurement
  technicianName?: string;     // Certifying technologist signature
  clinicalNotes?: string;      // Attending doctor's clinical indication
}
```

---

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION

```
[Attending Doctor] ──────── (Orders Test) ────────> [Lab Technician Worklist]
                                                               │
                                                       (Collects Sample)
                                                               │
                                                               v
                                                    [Sample Accessioning]
                                                               │
                                                      (Runs Diagnostic)
                                                               │
                                                               v
                                                    [Result Certification]
                                                               │
        ┌──────────────────────────────┬───────────────────────┴──────────────────────┐
        v                              v                                              v
[Doctor Consultation]          [Patient Portal]                             [Accountant Billing]
Instant EMR lab alert         Viewable in "My Lab Results"                 Service fee billed to
for clinical diagnosis        with certified values                         patient invoice
```

### Detailed Ripple Effects:
1. **Physician Initiation -> Laboratory Receipt**:
   - Attending doctor selects investigation and priority (`routine`, `urgent`, `stat`) on the consultation workstation.
   - The order immediately appears in the Lab Technician's worklist with appropriate color badges (rose for STAT, amber for urgent, slate for routine).
2. **Laboratory Certification -> Medical Record Update**:
   - As soon as the technologist certifies the result, the patient's record updates clinic-wide without page refreshes.
   - The attending physician sees the result under their patient EMR panel.
3. **Laboratory Certification -> Patient Empowerment**:
   - The patient sees the certified diagnostic report under the "My Lab Results" tab in their portal.
4. **Laboratory Certification -> Billing Clearance**:
   - The accountant's invoice register updates to reflect completed diagnostic investigations for payment settlement.

---

## 5. REGULATORY & AUDIT STANDARDS

- **Role-Based Access Enforcement**: Only authenticated users with the `lab_technician` role can certify, modify, or publish clinical lab values.
- **Audit Trails**: Every published result retains immutable references to the ordering doctor ID, collection timestamp, and certifying technologist name.
- **Priority Protocol**: STAT orders surface at the top of queues to minimize turnaround time for emergency diagnostics.

