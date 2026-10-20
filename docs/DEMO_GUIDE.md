# Beacon Health Clinic Management System - Demonstration Guide

> [!NOTE] Clinical Safety Notice
> All clinical data, patient identities, prescription records, pharmaceutical dosages, and medical findings within this demonstration application are entirely fictional and generated for software verification purposes only. This system is a technology demonstration and is not certified for clinical diagnosis, active patient treatment, or actual healthcare delivery.

---

## 1. Persona Accounts and Credentials Directory

The application includes pre-configured demonstration accounts representing all primary clinical and administrative roles. All accounts are pre-seeded with PBKDF2 cryptographic password credentials and live module-derived authorizations:

| Role | Persona / Full Name | Username | Password | Primary Workstations | What to Inspect in Persona |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Managing Director & Admin** | Dr. Marcus Vance | `md` | `Doctor@123` | Executive Dashboard, Access Control, Clinic Governance, Attendance, Consultation Desk, Billing Master Ledger | Full clinic governance; 8 executive summary cards; inline SVG trend and grouped charts; live module management; staff clearance approvals; supervisory read-only desk inspection; immutable security ledger. |
| **Staff Consulting Physician** | Dr. Nathan Hayes | `doctor` | `Doctor@123` | Consultation Desk, E-Prescriptions, Consulting Calendar, Attendance | Scoped outpatient consultations; triage vitals entry; electronic prescribing with formulary and allergen safety validation; isolated personal caseload and assigned patient directory. |
| **Outpatient Consulting Physician** | Dr. Sophia Reed | `doctor2` | `Doctor@123` | Consultation Desk, E-Prescriptions, Consulting Calendar, Attendance | Independent outpatient family medicine caseload; consultation desk with triage vitals; cross-coverage patient care. |
| **Lead Front Desk Coordinator** | Priya Sharma | `receptionist` | `Reception@123` | Front Desk Reception (Waiting Lounge, Appointments, Patient Directory, Intake Registry), Billing Collections | Daily token queue dispatch; walk-in and booked arrival check-in; demographics-only registration; fee collection with minor-unit accuracy; printable receipts. |
| **Front Desk Intake Specialist** | David Kim | `receptionist2` | `Reception@123` | Front Desk Reception, Intake Registry, Daily Billing Collections | Patient arrival check-in; priority queue triage; intake audit log inspection; fee collection recording. |
| **Registered Outpatient** | Eleanor Wright | `patient` | `Patient@123` | Patient Portal (Health Summary, Appointments, Active Prescriptions, Billing and Invoices) | Self-service appointment booking with primary physician; active prescription regimen instructions; online invoice settlement and printable certified receipts. |

---

## 2. Interactive Step-by-Step Walkthroughs

### Walkthrough 1: Front Desk Intake to Completed Visit and Paid Invoice

1. **Sign in as Receptionist**: Sign in as Priya Sharma (`receptionist` / `Reception@123`). Navigate to **Reception** in the sidebar and select the **Waiting Lounge** tab.
2. **Patient Arrival Check-In**: Locate patient Clara Thornton in the queue and click **Check In**, or click **Check In Walk-In** to register a new arrival. Verify that a sequential token is generated and the status changes to **Checked In**.
3. **Admit to Consultation Desk**: Switch persona to Dr. Nathan Hayes (`doctor` / `Doctor@123`). Navigate to **Consultation Desk**. In the arrival queue, click **Admit to Desk** for the admitted patient. Enter clinical vitals (systolic/diastolic blood pressure, heart rate, O2 saturation, temperature) and save vitals.
4. **Prescribe and Conclude Visit**: Click **Issue Electronic Prescription**, select an indicated medicine from the formulary, review the regimen dosage, and sign the prescription. Click **Conclude Visit** to complete the encounter. An invoice is automatically generated based on the physician consultation fee ($90.00 / 9000 cents).
5. **Collect Fee and Print Receipt**: Switch back to Priya Sharma (`receptionist`) and navigate to **Billing** > **Invoices**. Locate the newly generated invoice, click **Record Payment**, choose payment method (Card or Cash), and record payment in full. Inspect the generated official receipt.

---

### Walkthrough 2: Out-of-Formulary Prescription with Clinical Justification

1. **Sign in as Consulting Physician**: Sign in as Dr. Nathan Hayes (`doctor` / `Doctor@123`) and open an active encounter on the **Consultation Desk**.
2. **Open E-Prescribing Interface**: Click the **Issue Electronic Prescription** button above the clinical notes area.
3. **Select Custom Non-Formulary Drug**: In the medicine search combobox, type a non-standard medication name not present in the clinic formulary, or choose **Custom / Non-Formulary Medicine**.
4. **Provide Mandatory Clinical Justification**: When a non-formulary item is selected, the application requires an explicit justification. Enter the clinical rationale (for example: "Patient demonstrated adverse response to first-line formulary beta-blockers; specialist second-line therapy indicated").
5. **Sign and Audit Regimen**: Specify dose, frequency, administration route, and duration, then click **Sign Prescription**. Navigate to the **e-Prescriptions** tab to confirm the prescription is logged with its non-formulary justification and immutable audit ledger entry.

---

### Walkthrough 3: Access Module Membership and Live Capability Re-Derivation

1. **Sign in as Clinic Administrator**: Sign in as Managing Director Dr. Marcus Vance (`md` / `Doctor@123`). Navigate to **Administrative** > **Access Control** > **Modules** tab.
2. **Create New Module**: Click **Create Module**. Enter the module name "Billing Operations", description "Permission to record and review patient payments", and select the `paymentRecording` capability checkbox. Click **Save Module**.
3. **Assign Staff Member**: In the newly created module card, click **Add Member**, select Dr. Nathan Hayes (`acc-doc-2`), and confirm. Observe the member count immediately increment.
4. **Verify Live Privilege Elevation**: Open another browser tab or switch persona to Dr. Nathan Hayes (`doctor` / `Doctor@123`). Notice that **Billing** immediately appears in his navigation sidebar, granting fee collection capabilities without requiring a manual re-login or session reset.
5. **Verify Live Privilege Revocation**: Return to Dr. Vance's administrator view, open the "Billing Operations" module, and click **Remove** next to Dr. Hayes. Switch back to Dr. Hayes: the Billing navigation item and associated screens are immediately removed from his view live.

---

### Walkthrough 4: Storage Backup Export, Modification, and Snapshot Restoration

1. **Sign in as Clinic Administrator**: Sign in as Dr. Marcus Vance (`md` / `Doctor@123`). Navigate to **Administrative** > **Data Management** tab.
2. **Export Baseline Storage**: Under Backup Operations, click **Export System Backup**. The browser downloads a complete JSON snapshot file formatted as `cms-backup-YYYY-MM-DD.json` containing all schema-validated collections.
3. **Introduce a State Change**: Navigate to **Administrative** > **Clearances** and approve or reject a pending clearance, or record a sample payment in Billing.
4. **Restore Previous Snapshot**: Return to **Administrative** > **Data Management**. Click **Import Backup**, select the previously exported JSON file, and type **RESTORE** into the safety confirmation dialog.
5. **Verify Reversion and Safe Undo**: The system restores all collections in-place, invalidates stale memory caches, and displays a prominent "Restore Undo Snapshot" option allowing immediate rollback if needed.

---

### Walkthrough 5: Patient Portal Online Invoice Settlement

1. **Sign in as Registered Patient**: Sign in as Eleanor Wright (`patient` / `Patient@123`). The **Patient Portal** opens with her personal health dashboard.
2. **Review Medical Invoices**: Navigate to the **Billing** tab within the Patient Portal. Observe the list of clinical consultation charges and payment receipts.
3. **Identify Outstanding Balance**: Locate any invoice with an unpaid balance (for example, the specialist consultation charge). Click **Pay Invoice**.
4. **Authorize Simulated Payment**: In the checkout modal, review the itemized service breakdown, select the payment method (Credit/Debit Card or Health Savings Account), and click **Authorize Payment**.
5. **Review Certified Receipt**: The invoice status immediately transitions to **Paid**, the remaining balance drops to zero, and an official printable receipt (`RCT-YYYY-XXXX`) is issued. Switch to receptionist or MD view to verify the payment is credited in the clinic ledger.

---

## 3. System Reset and Baseline Recovery

To restore all demonstration data back to its original factory state at any time:
1. Sign in as Managing Director Dr. Marcus Vance (`md` / `Doctor@123`).
2. Navigate to **Administrative** > **Data Management**.
3. Under the **Factory Reset** section, click **Reset Demo Data**.
4. Type **RESET** into the confirmation modal and click **Confirm Reset**.
5. All collections are re-seeded using the dynamic scenario generator relative to the current calendar date.
