# Beacon Health Clinic Management System - Demonstration Guide

> [!NOTE] Clinical Safety Notice
> All clinical data, patient identities, prescription records, pharmaceutical dosages, and medical findings within this demonstration application are entirely fictional and generated for software verification purposes only. This system is a technology demonstration and is not certified for clinical diagnosis, active patient treatment, or actual healthcare delivery.

---

## 1. Authentication Audience Chooser and Sign-In Steps

The application separates authentication into two dedicated audience portals accessed through an engaging opening sequence and clean account type chooser step:

0. **Login Opening Sequence (The Intro)**:
   - On the first load of the login screen in a browser session, the system plays an entrance sequence: the logo icon fades and scales centered in the viewport, holds for 500ms, and slides up to the brand header over 650ms.
   - As the logo slides up, the clinic name and tagline fade and rise into view (350ms duration starting 150ms into the slide), followed by the chooser card (450ms duration starting 350ms into the slide).
   - The decorative bright ECG heartbeat line begins drawing when the slide starts (at 900ms).
   - **Single Play Per Session**: The full intro sequence plays only once per browser session (tracked via `sessionStorage`). Subsequent visits (such as after signing out) and direct links with `?as=` or `/login/<audience>` use the concise short entrance (<= 700ms). Under `prefers-reduced-motion`, both the intro and entrance are completely disabled: the finished page appears immediately.
   - **Skip Mechanism**: Any pointer click or keypress during the intro immediately completes it to its resting state without losing the keypress's effect on the focused control. Window resize and orientation change also complete the intro immediately with zero layout shift.

1. **Account Type Chooser Step (Default Entrance)**:
   - When entering the application without a pre-set audience, the system presents the clinic brand header (logo, clinic name, and tagline) followed by the prompt: **"Who is signing in?"**.
   - Two equal outlined option buttons are presented:
     - **Patient**: "Records, bookings and bills" (dedicated self-service portal for registered outpatients to inspect appointments, electronic prescriptions, and medical bills).
     - **Clinic Staff**: "Doctors, receptionists and administrators" (medical workstation entrance for Managing Director, Consulting Physicians, and Receptionists).
   - **Last Used Indicator**: The last selected audience (stored safely in `localStorage`) is auto-focused first with a muted **"Last used"** label under its description without skipping the chooser step.
   - **Demo Recovery**: In demo mode, the chooser step displays a plain **"Reset demo data"** text button at the bottom.

2. **Audience Form Step**:
   - Selecting an audience transitions smoothly to that audience's sign-in form.
   - The card top line reads **"Signing in as Patient"** or **"Signing in as Clinic Staff"** with a **"Change"** text button on the right that returns to the chooser, removes the URL parameter, and restores focus to the previously selected option.
   - The browser Back button (`popstate`) also returns cleanly to the chooser step.
   - In demo mode, the credentials directory is displayed filtered strictly to that audience.
   - Card footer displays the text-only security notice: `"Demo environment. Do not enter real patient data."`.

3. **Sign-Up Flow**:
   - Clicking **"Create account"** opens registration for that specific audience (**"Creating a Patient account"** or **"Creating a Clinic Staff account"**) with **"Change"** and **"Back to sign in"** links.
   - Changing audience preserves typed name, email, phone, and sign-in identifier while clearing password inputs.

### Portal Security Invariants & Cross-Portal Routing
- **Segregated Access**: An account can only authenticate into the system through its designated audience option.
- **Password-First Verification**: The password is authenticated first. If the password is incorrect, a generic error (`Incorrect username, email, or password.`) is displayed without revealing whether the account exists or which audience it belongs to.
- **Wrong Portal Detection (`wrongPortal`)**: When a user inputs valid credentials on the opposite option (e.g. entering doctor credentials on the Patient form), the system returns a polite guidance notice (`This is a clinic staff account. Use the Clinic Staff option.` or `This is a patient account. Use the Patient option.`) with a 1-click **Switch to Clinic Staff** / **Switch to Patient** button. Cross-portal attempts never increment failed attempt counters or trigger account lockouts.
- **Direct Portal Deep Linking**: The active audience form can be opened directly via query parameter (`?as=patient` or `?as=staff`) or route paths (`/login/patient`, `/login/staff`, `/signup/patient`, `/signup/staff`).

---

## 2. Persona Accounts and Credentials Directory (Split by Audience)

### A. Clinic Staff Accounts

Select the **Clinic Staff** option on the chooser step for the following clinical and administrative accounts:

| Role | Persona / Full Name | Username | Password | Primary Workstations | What to Inspect in Persona |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Managing Director & Admin** | Dr. Marcus Vance | `md` | `Doctor@123` | Executive Dashboard, Access Control, Clinic Governance, Attendance, Consultation Desk, Billing Master Ledger | Full clinic governance; 8 executive summary cards; inline SVG trend and grouped charts; live module management; staff clearance approvals; supervisory read-only desk inspection; immutable security ledger. |
| **Staff Consulting Physician** | Dr. Nathan Hayes | `doctor` | `Doctor@123` | Consultation Desk, E-Prescriptions, Consulting Calendar, Attendance | Scoped outpatient consultations; triage vitals entry; electronic prescribing with formulary and allergen safety validation; isolated personal caseload and assigned patient directory. |
| **Outpatient Consulting Physician** | Dr. Sophia Reed | `doctor2` | `Doctor@123` | Consultation Desk, E-Prescriptions, Consulting Calendar, Attendance | Independent outpatient family medicine caseload; consultation desk with triage vitals; cross-coverage patient care. |
| **Lead Front Desk Coordinator** | Priya Sharma | `receptionist` | `Reception@123` | Front Desk Reception (Waiting Lounge, Appointments, Patient Directory, Intake Registry), Billing Collections | Daily token queue dispatch; walk-in and booked arrival check-in; demographics-only registration; fee collection with minor-unit accuracy; printable receipts. |
| **Front Desk Intake Specialist** | David Kim | `receptionist2` | `Reception@123` | Front Desk Reception, Intake Registry, Daily Billing Collections | Patient arrival check-in; priority queue triage; intake audit log inspection; fee collection recording. |

### B. Patient Accounts

Select the **Patient** option on the chooser step for registered patient accounts:

| Role | Persona / Full Name | Username | Password | Primary Workstations | What to Inspect in Persona |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Registered Outpatient** | Eleanor Wright | `patient` | `Patient@123` | Patient Portal (Health Summary, Appointments, Active Prescriptions, Billing and Invoices) | Self-service appointment booking with primary physician; active prescription regimen instructions; online invoice settlement and printable certified receipts. |

---

## 3. Interactive Step-by-Step Walkthroughs

### Walkthrough 1: Front Desk Intake to Completed Visit and Paid Invoice

1. **Sign in under Clinic Staff option**: Select the **Clinic Staff** option. Sign in as Priya Sharma (`receptionist` / `Reception@123`). Navigate to **Reception** in the sidebar and select the **Waiting Lounge** tab.
2. **Patient Arrival Check-In**: Locate patient Clara Thornton in the queue and click **Check In**, or click **Check In Walk-In** to register a new arrival. Verify that a sequential token is generated and the status changes to **Checked In**.
3. **Admit to Consultation Desk**: Switch persona to Dr. Nathan Hayes (`doctor` / `Doctor@123`). Navigate to **Consultation Desk**. In the arrival queue, click **Admit to Desk** for the admitted patient. Enter clinical vitals (systolic/diastolic blood pressure, heart rate, O2 saturation, temperature) and save vitals.
4. **Prescribe and Conclude Visit**: Click **Issue Electronic Prescription**, select an indicated medicine from the formulary, review the regimen dosage, and sign the prescription. Click **Conclude Visit** to complete the encounter. An invoice is automatically generated based on the physician consultation fee (₹90.00 / 9000 paisa/cents).
5. **Collect Fee and Print Receipt**: Switch back to Priya Sharma (`receptionist`) and navigate to **Billing** > **Invoices**. Locate the newly generated invoice, click **Record Payment**, choose payment method (Card or Cash), and record payment in full. Inspect the generated official receipt.

---

### Walkthrough 2: Out-of-Formulary Prescription with Clinical Justification

1. **Sign in as Consulting Physician**: Under the **Clinic Staff** option, sign in as Dr. Nathan Hayes (`doctor` / `Doctor@123`) and open an active encounter on the **Consultation Desk**.
2. **Open E-Prescribing Interface**: Click the **Issue Electronic Prescription** button above the clinical notes area.
3. **Select Custom Non-Formulary Drug**: In the medicine search combobox, type a non-standard medication name not present in the clinic formulary, or choose **Custom / Non-Formulary Medicine**.
4. **Provide Mandatory Clinical Justification**: When a non-formulary item is selected, the application requires an explicit justification. Enter the clinical rationale (for example: "Patient demonstrated adverse response to first-line formulary beta-blockers; specialist second-line therapy indicated").
5. **Sign and Audit Regimen**: Specify dose, frequency, administration route, and duration, then click **Sign Prescription**. Navigate to the **e-Prescriptions** tab to confirm the prescription is logged with its non-formulary justification and immutable audit ledger entry.

---

### Walkthrough 3: Access Module Membership and Live Capability Re-Derivation

1. **Sign in as Clinic Administrator**: Under the **Clinic Staff** option, sign in as Managing Director Dr. Marcus Vance (`md` / `Doctor@123`). Navigate to **Administrative** > **Access Control** > **Modules** tab.
2. **Create New Module**: Click **Create Module**. Enter the module name "Billing Operations", description "Permission to record and review patient payments", and select the `paymentRecording` capability checkbox. Click **Save Module**.
3. **Assign Staff Member**: In the newly created module card, click **Add Member**, select Dr. Nathan Hayes (`acc-doc-2`), and confirm. Observe the member count immediately increment.
4. **Verify Live Privilege Elevation**: Open another browser tab or switch persona to Dr. Nathan Hayes (`doctor` / `Doctor@123`). Notice that **Billing** immediately appears in his navigation sidebar, granting fee collection capabilities without requiring a manual re-login or session reset.
5. **Verify Live Privilege Revocation**: Return to Dr. Vance's administrator view, open the "Billing Operations" module, and click **Remove** next to Dr. Hayes. Switch back to Dr. Hayes: the Billing navigation item and associated screens are immediately removed from his view live.

---

### Walkthrough 4: Storage Backup Export, Modification, and Snapshot Restoration

1. **Sign in as Clinic Administrator**: Under the **Clinic Staff** option, sign in as Dr. Marcus Vance (`md` / `Doctor@123`). Navigate to **Administrative** > **Data Management** tab.
2. **Export Baseline Storage**: Under Backup Operations, click **Export System Backup**. The browser downloads a complete JSON snapshot file formatted as `cms-backup-YYYY-MM-DD.json` containing all schema-validated collections.

---

### Walkthrough 5: Responsive Sidebar, Floating Desktop Rail, and Outside-Click Interaction (M10.8)

1. **Desktop Rail Behavior**: In any clinical role at 1024px or wider, observe the collapsed sidebar rail (3.5rem width, 44px minimum touch targets). Click the toggle button to expand the sidebar (16rem). Notice that the expanded panel floats over the page content without shifting page cards or buttons.
2. **One-Click Dismissal**: With the sidebar expanded, click any action button on the underlying page. In a single click, the sidebar closes and the underlying action triggers immediately with no layout shift or second click required.
3. **No Stray Focus Bars**: Click throughout the interface using a mouse: observe that no focus outlines or stray vertical bars appear on sidebar items or toggle buttons. Switch to keyboard navigation using Tab and observe the static 1px high-contrast outline on active elements.
4. **Mobile Drawer Navigation**: Below 1024px, the header button toggles between 'Open menu' and 'Close menu' with synchronized Menu and X icons. Tapping the dimmed backdrop or pressing Escape dismisses the drawer, and off-screen drawer items are strictly inert.
3. **Introduce a State Change**: Navigate to **Administrative** > **Clearances** and approve or reject a pending clearance, or record a sample payment in Billing.
4. **Restore Previous Snapshot**: Return to **Administrative** > **Data Management**. Click **Import Backup**, select the previously exported JSON file, and type **RESTORE** into the safety confirmation dialog.
5. **Verify Reversion and Safe Undo**: The system restores all collections in-place, invalidates stale memory caches, and displays a prominent "Restore Undo Snapshot" option allowing immediate rollback if needed.

---

### Walkthrough 5: Patient Portal Online Invoice Settlement

1. **Sign in as Registered Patient**: Under the **Patient** option, sign in as Eleanor Wright (`patient` / `Patient@123`). The **Patient Portal** opens with her personal health dashboard.
2. **Review Medical Invoices**: Navigate to the **Billing** tab within the Patient Portal. Observe the list of clinical consultation charges and payment receipts.
3. **Identify Outstanding Balance**: Locate any invoice with an unpaid balance (for example, the specialist consultation charge). Click **Pay Invoice**.
4. **Authorize Simulated Payment**: In the checkout modal, review the itemized service breakdown, select the payment method (Credit/Debit Card or Health Savings Account), and click **Authorize Payment**.
5. **Review Certified Receipt**: The invoice status immediately transitions to **Paid**, the remaining balance drops to zero, and an official printable receipt (`RCT-YYYY-XXXX`) is issued. Switch to receptionist or MD view on the Clinic Staff option to verify the payment is credited in the clinic ledger.

---

### Walkthrough 6: Cross-Portal Guidance and Portal Routing Check

1. **Wrong Option Attempt**: Under the **Patient** option, enter Dr. Nathan Hayes' credentials (`doctor` / `Doctor@123`) and submit.
2. **Guidance Display**: The system verifies the password, rejects the login, and renders: `"This is a clinic staff account. Use the Clinic Staff option."` with a **Switch to Clinic Staff** button.
3. **One-Click Option Switch**: Click **Switch to Clinic Staff**. The active form transitions to Clinic Staff, preserves the username `doctor`, clears the password, and focuses the field. Re-enter the password to enter the Medical Station immediately.

---

### Walkthrough 7: My Profile and Accessible User Menu Navigation (M10.1)

1. **Access User Menu**: Sign in as any persona (e.g. Dr. Nathan Hayes or Eleanor Wright). Click the user avatar in the top navigation bar or press Enter while the avatar button is focused.
2. **Accessible Keyboard Navigation**: Navigate menu options using `ArrowDown` and `ArrowUp` (with cyclic boundary wrapping), jump to start/end using `Home` / `End`, or dismiss with `Escape` (returning focus to the avatar button). Note the single, unified `"Theme"` row.
3. **Open My Profile**: Activate the `"My Profile"` menu item. The menu closes and immediately routes to `/profile`, automatically moving keyboard focus to the `#profile-heading` title. Notice that the menu item displays `aria-current="page"` while on `/profile`.
4. **Inspect Patient Portal Tabs**: Sign in as Eleanor Wright and observe the Patient Portal navigation tabs: `Appointments`, `Records`, `Prescriptions`, and `Invoices`. The redundant Profile tab is removed; all profile actions are unified at `/profile`.
5. **Inspect Role-Specific Layout**:
   - **For Staff**: The Contact Details card displays read-only rows for Name, canonical Staff ID, Job Title, Department, and Roles, with the plain guidance line `"To change these details, ask an administrator."`, followed by editable phone and email.
   - **For Patients**: The Contact Details card provides residential address and emergency contact fields (name, relationship, phone).
6. **Form Behavior & Safety Guard**:
   - Edit any contact field: note that the **Save Contact Details** button enables only upon detecting changes.
   - Click another tab or link while edits are uncommitted: the system presents a **Discard changes?** modal with **Keep editing** and **Discard** options.
   - Attempt changing your email address: observe the mandatory **Current password** verification requirement before updates are committed.
7. **Security & Password Management**: Inspect the **Security & Password** card featuring 44px show/hide toggle controls, standard autocomplete semantics, and password policy guidance derived directly from platform constants. All successful mutations write to the security ledger without storing or exposing passwords.

---

### Walkthrough 8: Patient Dashboard Prominent Actions & Booking Limits (M10.2)

1. **Sign in as Registered Patient**: Under the **Patient** option, sign in as Eleanor Wright (`patient` / `Patient@123`).
2. **Inspect Prominent Book Appointment Action**: Observe that the filled primary **Book Appointment** button is immediately visible at the very top of the content area, placed directly under the page heading and above the summary metric cards. On screens under 640px, the button spans full width; on desktop, it is left-aligned.
3. **Inspect Contextual Pay Balance Action**: Notice the outline **Pay Balance** button rendered beside Book Appointment when an outstanding balance is present. Clicking it immediately opens the simulated payment modal for Eleanor's oldest unpaid invoice.
4. **Test Booking Modal Lifecycle**: Click **Book Appointment**. The Book Consultation modal appears. Press Escape or click Cancel: the modal dismisses and keyboard focus immediately returns to the Book Appointment trigger button.
5. **Inspect Upcoming & Past Partitioning**: Notice the clean layout without redundant subheader counts. The Upcoming Appointments table holds open consultations for today or later, while the Past Appointments table lists completed records and past open appointments with the status text `"Not concluded"`.
6. **Inspect Booking Limit & Unlinked Account**: When a patient account has 2 active upcoming bookings (`MAX_ACTIVE_BOOKINGS = 2`), the Book Appointment button remains visible but is disabled with the helper message `"You already have 2 upcoming appointments."`. For unlinked self-registered accounts, the button is disabled with `"Your account is waiting to be linked to your clinic record."`.

---

## 4. System Reset and Baseline Recovery

To restore all demonstration data back to its original factory state at any time:
1. Sign in under the **Clinic Staff** option as Managing Director Dr. Marcus Vance (`md` / `Doctor@123`).
2. Navigate to **Administrative** > **Data Management**.
3. Under the **Factory Reset** section, click **Reset Demo Data**.
4. Type **RESET** into the confirmation modal and click **Confirm Reset**.
5. All collections are re-seeded using the dynamic scenario generator relative to the current calendar date.
