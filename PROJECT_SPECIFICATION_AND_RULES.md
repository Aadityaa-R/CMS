# CLINIC MANAGEMENT SYSTEM (CMS) - MASTER ARCHITECTURE, RULES & CHANGELOG

## 1. PROJECT OVERVIEW & CORE IDENTITY

- **Project Name**: Clinic Management System (CMS)
- **Domain Definition**: Medical Practice & Outpatient Clinic Operations (Strictly **Clinic Management System**, NOT Content Management System).
- **Clinic Scale & Profile**: Small Outpatient Clinic practice. The clinic operates consultations, patient intake, triage vitals, appointment scheduling, access governance, and billing. It does **not** operate an in-house pharmacy, bulk medicine warehouse, or pathology laboratory facility.
- **Development Strategy**: **Frontend First**. The entire user experience, responsive workstations, state management, inter-role workflows, and interactive clinical controls are fully engineered and validated on the frontend with rich TypeScript domain models and local reactive state before backend or database deployment.
- **Repository Location**: `c:\Users\raadi\Downloads\CMS`
- **Active Git Branch**: `multi-agent-working` (local offline repository).
- **Core Technology Stack**:
  - **Framework**: React 18.3+ with TypeScript 5.5+
  - **Bundler & Tooling**: Vite 6.4+
  - **Styling**: Tailwind CSS 3.4+ with custom clinical color palette
  - **Iconography**: Lucide React (clean SVG icons)
  - **State Architecture**: React Context API (`AuthContext`, `ClinicContext`, `ThemeContext`) with realistic interconnected datasets

---

## 2. STRICT USER RULES & ARCHITECTURAL CONSTRAINTS

Every feature and line of code in this project strictly adheres to the governing rules specified by the user throughout development:

### 2.1 The Zero Emoji Rule
- **Rule**: **ABSOLUTELY NO EMOJIS UNDER ANY CIRCUMSTANCES**.
- **Scope of Enforcement**:
  - Zero emojis in UI components, headers, labels, buttons, cards, modals, or notifications.
  - Zero emojis in source code comments, variable names, or string literals.
  - Zero emojis in Git commit messages and branch references.
  - Zero emojis in markdown documentation files.
  - Zero emojis in assistant messages, explanations, and handoff reports.

### 2.2 Small Clinic Scope & Module Decommissioning
- **Rule**: The clinic is a small outpatient practice that does not stock or dispense medicines, nor maintain complex hospital supply chains or lab testing suites.
- **Enforced Actions**:
  - **Removed Clinic Overview & Supplies / Inventory Modules**: Completely purged all inventory types, stock ledgers, reorder alert cards, supply categories, and sidebar links.
  - **Decommissioned Roles**: Eliminated Nurse, Pharmacist, Lab Technician, and Accountant roles. Streamlined to 4 core operational roles: Managing Director (MD) / Admin, Staff Doctor, Receptionist, and Patient.
  - **Removed Dispense Tracking**: Removed Weekly Schedule and e-Prescriptions Dispense Status modules from the doctor and patient interfaces.
  - **Removed Laboratory Facilities**: Pathology worklists and sample collection workflows decommissioned.

### 2.3 Global 10-Records-Per-Page Table Pagination Rule
- **Rule**: All data tables across the entire project must display only 10 records at a time. Extra records must transition to subsequent pages, and the user must be able to switch smoothly between pages using dedicated pagination controls.
- **Standardized Pagination Architecture**:
  - Component: `src/components/ui/Pagination.tsx`
  - Fixed page size: `PAGE_SIZE = 10`
  - Current page, total records count, records range indicator (e.g., `Showing 1 to 10 of 24 records`), page number buttons, previous/next controls, and disabled state handling.
  - Applied across:
    1. Doctor Consultation Desk: Patient appointments queue and outpatient directory.
    2. Reception Desk: Waiting lounge token queue and patient check-in table.
    3. Patient Portal: My Appointments table, My Prescriptions table, and My Invoices table.
    4. Administrative Console: All Users directory table and Security Audit Ledger.
    5. Billing & Revenue View: Invoice ledger and payment settlement table.

### 2.4 Interactive Search Bar Specification
- **Rule**: Provide a unified, fast interactive search bar across all views with keyboard autofill and zero popup clutter.
- **Enforced Actions**:
  - **Component**: `src/components/ui/InteractiveSearchBar.tsx`
  - **Removed Suggestion Dropdown Dialogue Box**: Eliminated the popup menu list that formerly dropped down beneath the input field.
  - **Removed Autofill Label/Symbol**: Removed text or badge symbols stating "Autofill".
  - **Removed Visual Tab / Enter Pill Button**: Removed the visual pill button that read `Tab / Enter` from the search bar interior.
  - **Inline Ghost Completion**: When the user begins typing, matching suggestions appear inline as muted ghost text immediately following the user's cursor.
  - **Keyboard Autofill**: Pressing `Tab` or `Enter` automatically accepts the suggestion and completes the text input.
  - **Clear Button**: A single right-aligned `X` button appears only when text is present to clear the input.

### 2.5 Workstation Header Subtitles Purge
- **Rule**: Eliminate descriptive subtitle paragraphs beneath headers across all workstations.
- **Enforced Actions**:
  - Stripped explanatory subtitle `<p>` tags located directly beneath headers in `DoctorView.tsx`, `ReceptionistView.tsx`, `PatientView.tsx`, `AccessControlView.tsx`, and `AdminView.tsx`.
  - Maintained clean, professional headers containing only the title, primary status badge, and functional action controls.

### 2.6 Metric StatCards Removal
- **Rule**: Remove unnecessary KPI metric stat card rows to maximize clinical workspace density and reduce visual noise.
- **Enforced Actions**:
  - Removed the 4-card metric grid (`REGISTERED OUTPATIENTS`, `ACTIVE IN CARE`, `ALLERGY RISK FLAGGED`, `CHRONIC CARE TRACKED`) from the Patient Directory view.
  - Removed KPI summary cards from `AccessControlView.tsx`.
  - Removed the 4-card metric grid (`Consultation Queue`, `Active Consultation`, `e-Prescriptions Logged`, `Assigned Patients`) from the Doctor Consultation Desk (`DoctorView.tsx`).
- **Dashboard Front Page Exception**:
  - The front page (role-aware landing DashboardView) may display exactly ONE outlined summary card containing role-scoped plain label/value figures in a 4-column (2-column on 1366x768) responsive grid without icons, without colored numbers, and without badge wrappers. The legacy multi-card `StatCard` component stays deleted from clinical workstations.

### 2.7 Receptionist Multi-Staffing
- **Rule**: Provide full multi-receptionist operational support.
- **Enforced Actions**:
  - Added second receptionist **David Kim** (`receptionist2`, `REC-302`, `d.kim@beaconclinic.com`) alongside **Priya Sharma** (`receptionist`, `REC-301`, `receptionist@beaconclinic.com`).
  - Integrated both receptionists into credentials table, demo user authentication, individual access control records, and the front desk duty roster.

### 2.8 Design System & Input Rules
- **Zero Native Select Elements**: Never use standard HTML `<select>`. Always use the custom design-system dropdown `src/components/ui/Select.tsx` with chevron icons, custom backdrop handling, and keyboard support.
- **Zero Native Date Inputs**: Never use standard HTML `<input type="date">`. Always use the custom design-system calendar `src/components/ui/DatePicker.tsx`.
- **Zero Number Spinner Arrows**: All numeric input fields must suppress increment and decrement arrow marks via CSS utility classes (`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`).
- **Zero Pills, Chips, Badges, or Rounded Boxes Around Text (No-Bubble Rule)**: Never wrap text in rounded boxes, pill backgrounds, or filled chip badges. Content must be displayed as clean, unboxed plain text rows with natural typographic hierarchy.
- **Zero Focus Glows & Animated Effects (No-Flashing-Focus Rule)**: Suppress focus rings, glows, pulsing animations, and animated hover/focus transitions (`ring-0`, `shadow-none`, no animated transitions). Only static keyboard-only 1px outline in the existing accent color is permitted.
- **Plain-Text Navigation Tabs**: Active tabs must be styled with bold text and a static 2px underline in the existing accent color (`border-b-2 border-teal-600 -mb-px`), sitting on the tab row's bottom line. Inactive tabs have no underline at all (`border-transparent` removed).
- **Worklist Fixed-Width Table Layout**: Consultation worklist renders inside a semantic table (`table`, `thead`, `tbody`, `th scope="col"`) with non-wrapping headers (`whitespace-nowrap`), standardized column widths (`#`: ~56px, `Time`: ~80px, `Patient`: ~180px, `Appt ID`: ~140px, `Status`: ~140px, `Actions`: sized to content). The `Complaint` column expands to absorb all remaining table width (`w-full`) eliminating empty gaps, clamping to 2 lines with a full hover title attribute. Queue numbering under `#` displays plain integers ('1', '2', '3') without `#` prefixes in table cells.
- **Patient Summary Card**: In the right column of the Consultation Desk tab, the executive Patient Summary card displays the patient's comprehensive Last Visit details (visit date, previous visit triage vitals with BP/HR/SpO2/Temp, last visit reason for visit, and consulting physician), chronic conditions, and current medications (derived from active prescriptions), with clean fallbacks ("None recorded" / "No active consultation"). The muted "Last visit:" baseline references under the active consultation vitals inputs remain.
- **Vitals Reference Markers & Baseline**: Active consultation vitals display the patient's previous visit vitals beneath each field as muted helper text (`Last visit: ...`). Entered values outside standard clinical display ranges display plain-text reference markers (`High` or `Low`) beside the label without color changes or badges.
- **Flattened Content Containers**: Card contents must not contain nested bordered boxes (`p-3 bg-slate-50 border rounded-xl`). Information must be organized into plain text rows directly inside the card with subtle divider rules where appropriate.
- **Frameless Seamless Layout & Outlines**: Card outlines and outlined section boxes inside cards are allowed. The frameless rule applies to header shadows and divider lines between panels only.
- **Muted Text Contrast Compliance**: All muted text (labels such as "Last visit:", table headers, pagination counters like "Showing 1-3 of 3 records", and search placeholders) must achieve at least 4.5:1 contrast against light and dark backgrounds. On light backgrounds (white and slate-50), use `text-slate-500` or `text-slate-600` (4.55:1 - 7.58:1); on dark backgrounds (slate-900 and slate-800), use `text-slate-400` or `text-slate-300` (5.71:1 - 12.02:1). Never use `text-slate-400` on light backgrounds or `text-slate-500` on dark backgrounds.
- **Restricted Palette**: Monochromatic slate base with calm clinical accents (teal, emerald, amber, rose). Maximum of 3 accent colors simultaneously.
- **Search Bar Layout Alignment**: On table cards featuring search bars (Patients Medical Directory, e-Prescription Master Ledger), the search bar's left edge is flush with the table's left edge (`CardContent` uses `p-5 pt-3.5` and the search wrapper uses `mb-3.5`), maintaining a consistent 14px vertical gap between the card header line and the search bar, and 14px between the search bar and the table header.
- **Worklist Table Edges**: Worklist table cells have no colored left border line (`border-l-2`) on the first column, matching the clean edges of all other data tables. Active in-consultation row highlighting is maintained strictly via subtle row background tinting (`bg-teal-50/50 dark:bg-teal-950/30`).
- **Condition, Allergy, and Medication Deduplication**: A standardized deduplication helper (`deduplicateList`) strips whitespace and case-insensitive duplicates across chronic conditions, allergies, and current medications across the Patient Summary card, Patients directory, and prescription modals.

### 2.9 Clinical Governance & Medical Workflows
- **Managing Director (MD) Supervisory Isolation**:
  - Dr. Marcus Vance possesses supervisory oversight over the clinic.
  - When the MD inspects another doctor's consultation desk (`isReadOnlyView === true`), all inputs are disabled, all action buttons (Prescribe, Start Consultation, Conclude Visit, Record Notes, Save Vitals) are hidden, and **no** "View Only" text boxes or badge clutter are rendered.
  - The MD Clinical Queue Inspector bar is positioned cleanly below the active desk.
- **Editable Clinical Triage Vitals**:
  - Vitals in the Doctor Consultation Desk are directly editable input fields (Systolic BP, Diastolic BP, Heart Rate, Temperature, O2 Saturation) bound to local component state with a dedicated "Save Vitals" persistence trigger.
- **Editable Allergy Warnings**:
  - Patient allergy badges feature inline interactive management with persistent context updates.
- **Administrative Console Sub-Modules**:
  - The Administrative module (`AccessControlView.tsx`) is organized into 3 sorted sub-modules:
    1. `Add New Users`: Form to onboard staff doctors, receptionists, or patients with auto badge/MRN generation.
    2. `Edit Users`: Directory of users with role filtering (`Doctors`, `Receptionists`, `Patients`), search, and direct selection. Selecting a user isolates their clearance management console with a back button, granular permissions toggle, status grant/revoke, and account deletion with confirmation.
    3. `Security Ledger`: Immutable chronological timeline tracking all security clearance actions, grants, revocations, and account deletions.

### 2.10 Offline Git Discipline
- **Rule**: Strictly local offline Git repository in `c:\Users\raadi\Downloads\CMS`.
- **Constraint**: **NEVER** run `git push`. All commits are local on `multi-agent-working` or `main`.
- **Verification**: Every commit must be verified with `npm run build` (`tsc && vite build`) with 0 errors.

---

### 2.11 Role Permissions, Patient Assignment & Admin Promotion Architecture
- **Roles & Single Source of Truth for Admin**:
  - **Single Source of Truth**: Admin status is evaluated strictly via `isAdmin(subject)`: `admin = the original admin (isOriginalAdmin: true / MD-001 / usr-1 / acc-doc-1), OR an active doctor who holds an active administrativeAccess capability (or enabled perm-admin)`. Loose role string checks (`role === 'admin'`, `role === 'md'`) are prohibited.
  - **MD (Managing Director)**: Original clinic administrator (`isOriginalAdmin: true`), supervisory oversight over all doctors, cannot be revoked or deleted.
  - **Doctor**: Active consulting physician, assigned specific primary patients, can be promoted to administrator.
  - **Receptionist**: Dedicated front-desk staff; alone registers patients, checks them in, and collects billing payments. Doctors and MD never register or check in patients.
  - **Patient**: Outpatient portal user with scoped access to own records.
- **Data Scoping & Selectors**:
  - All data reads must flow through `src/lib/selectors.ts` (`getScopedPatients`, `getScopedAppointments`, `getScopedPrescriptions`, `getScopedInvoices`, `getDoctorPatients`); views never filter patient data inline.
  - **Staff Doctors**: Scoped strictly to currently assigned patients, plus authored historical visits and prescriptions of former patients as read-only.
  - **Receptionists**: Scoped to demographic, appointment, and billing records only. All clinical fields (`allergies`, `chronicConditions`, `currentMedications`, `previousVisitVitals`) are stripped at the selector layer via `scopePatientForReceptionist`.
  - **Patients**: Scoped strictly to their own patient record, appointments, prescriptions, and invoices.
  - **Clinic Administrators**: Scoped clinic-wide across all patients (including unassigned patients), appointments, prescriptions, invoices, and audit logs.
  - **Dashboard Metrics**: `calculateDashboardMetrics` enforces `isAdmin(actingUser)` to prevent data leakage of clinic finances or other physicians' patients to staff doctors.
- **Patient Assignment & Care Transfer Rules**:
  - Each outpatient is assigned to exactly one primary doctor at a time (`PatientAssignment` tracking `id`, `patientId`, `doctorId`, `doctorName`, `from`, `to`, `transferredBy`, `reason`).
  - Active assignment has `to === null`.
  - **In-Consultation Lockout**: Transfer is strictly blocked if the patient has an active appointment `in_consultation`, with the user-facing notice: "Conclude the current consultation before transferring."
  - **Open Appointments Transfer**: On transfer, ONLY `scheduled` and `checked_in` appointments are reallocated to the receiving doctor; historical concluded visits and active consultations remain untouched. The transferred count and appointment IDs are recorded in the Security Audit Ledger.
  - **Receiving Doctor Validation**: The receiving doctor must be an active physician possessing the `consultationWorkstation` capability and must differ from the currently assigned doctor.
  - **Unassigned Patients**: Outpatients without an active physician (e.g., `pat-16` Rachel Green) are visible only to clinic administrators. The action and modal are explicitly labeled "Assign" instead of "Transfer", allowing administrators to assign initial primary care.
  - **Authored-by Rule**: Former doctors retain read-only access to historical visits and prescriptions they authored for past patients, but cannot view subsequent visits or prescribe for patients transferred to other physicians.
- **Handler-Level Enforcement**:
  - All state mutation handlers in `ClinicContext` (`transferPatient`, `addPatient`, `updateAppointmentStatus`) and `AuthContext` (`grantStaffAccess`, `revokeStaffAccess`, `deleteStaffAccount`, `updateStaffCapabilities`) invoke permissions checks from `src/lib/permissions.ts` before acting.
- **Admin Promotion & Protection Guards**:
  - Doctors promoted to admin gain the `administrativeAccess` capability (`perm-admin`), opening the Administrative module in navigation and granting Access Console clearance authority.
  - The original MD (`isOriginalAdmin: true`) and the last remaining administrator can never have their administrative access revoked or their accounts deleted.
  - Revoking administrative access from a promoted doctor immediately removes the Administrative module from navigation and redirects the user away from `access_control`.

### 2.12 Access Modules & Capability Bundling Architecture (Milestone M2)
- **Module Definition & Access Union**:
  - A module is a named bundle of accesses with an assigned member list.
  - A staff member's effective access is the mathematical union of the accesses of all modules they belong to.
  - Inactive, revoked, or suspended staff members receive zero effective access regardless of module membership.
- **Fixed Access Catalog**:
  - Access capabilities originate from a strictly fixed catalog in code (`src/data/accessCatalog.ts`) containing eight standard accesses: `administrativeAccess`, `consultationWorkstation`, `emrRecordsAccess`, `prescriptionAuthoring`, `consultingCalendar`, `patientRegistration`, `patientCheckIn`, and `paymentRecording`. Administrators cannot invent or alter accesses.
- **Free Assignment & Patient Invariance**:
  - Any staff member can be assigned to any module.
  - Patients are never module members; patient access is invariant and fixed exclusively to their own records.
- **Role Defaults**:
  - The clinic principle "Doctors do not register or check in patients" holds as a default because doctors start in Clinical (`mod-clinical`) and receptionists start in Front Desk (`mod-frontdesk`). If an administrator assigns a doctor to Front Desk, they can register and check in patients.
- **Patient Scoping Protection**:
  - Module membership never widens patient clinical visibility.
  - Viewing clinical data requires both the `emrRecordsAccess` capability and an active care assignment (or historical visit authorship) for non-administrators.
  - Non-EMR staff members receive a redacted demographic-only view. Clinic administrators see all patients clinic-wide.
- **Prescription Authoring License Restriction**:
  - `prescriptionAuthoring` takes effect only for personnel whose staff type is Doctor (professional medical licence), regardless of which modules they belong to. Non-doctor staff members in a module with prescription authoring cannot issue prescriptions.
- **Access Dependency Guards**:
  - `prescriptionAuthoring` cannot be included in any module that lacks `emrRecordsAccess`.
  - `emrRecordsAccess` cannot be removed from any module while `prescriptionAuthoring` is present.
- **System Module & Admin Protection Guards**:
  - System modules (`Clinical`, `Front Desk`, `Administration`) cannot be deleted.
  - Custom modules cannot be deleted while they contain members; only empty custom modules may be deleted.
  - Deleting a custom module requires typing its exact name in a confirmation modal.
  - The `Administration` module must always retain `administrativeAccess`.
  - The original MD (`isOriginalAdmin: true`) and the last remaining administrator cannot be removed from `Administration`.
  - Adding a member to `Administration` requires typing the member's full name and providing an operational reason.
- **Sidebar Navigation Mapping**:
  - Navigation visibility is governed by a single mapping from module accesses:
    - Consultation Desk requires `consultationWorkstation`.
    - Consulting Calendar requires `consultingCalendar`.
    - Reception requires `patientRegistration` OR `patientCheckIn` OR `paymentRecording`.
    - Administrative requires `administrativeAccess`.
    - A staff member in no module sees only the Dashboard.
- **Administrative UI Architecture**:
  - AccessControlView incorporates a dedicated "Modules" tab with a paginated module catalog table and "Create Module" action.
  - Selecting a module opens an isolated Module View with breadcrumb back navigation, name/description editor, deletion dialog (for empty custom modules), access inclusion/removal matrix with confirmation dialogs, and member directory with an "Add Person" searchable modal and removal actions.
  - Edit Users tab replaces individual capability counts with a comma-separated list of assigned modules.
  - Access Console provides a module membership table, direct add-to-module action, and a read-only "Effective accesses" list attributing each access to its originating module.
  - Direct staff provisioning and onboarding clearance approval automatically assign the standard default module (Clinical for doctors, Front Desk for receptionists) with ledger entry logging.

### 2.13 Staff Time, Attendance, and Leave Management (Milestone M3)
- **Universal Staff Attendance (No Access Required)**:
  - Every staff account (physicians, receptionists, administrators; never patients) has personal time and attendance functionality: clocking in, clocking out, reviewing their own monthly records, and requesting leave.
  - Exactly one clock-in and clock-out are allowed per staff member per calendar day; clock-out time must be after clock-in time.
  - Clock-in on an approved leave day is disallowed unless overridden by an administrator holding `attendanceManagement`.
- **Administrative Capability & Governance**:
  - The `attendanceManagement` capability is cataloged in `src/data/accessCatalog.ts` and included in the default `Administration` role (`mod-admin`).
  - Holders of `attendanceManagement` can view clinic-wide attendance, inspect the real-time daily roster, audit the full monthly attendance sheet, approve or reject leave requests, configure shift schedules, and correct records.
- **Client Timestamp Production Notice**:
  - Timestamps derive from the local device clock for demo operation. Production deployment requires cryptographically verified server-side timestamps to comply with clinical audit regulations and prevent client time manipulation.
- **Shift & Engine Data Models**:
  - **Shift**: `id`, `staffId`, `days` (Mon through Sun), `start` (HH:mm), `end` (HH:mm), `graceMinutes` (defaults to 15 min; configured from existing physician duty hours).
  - **AttendanceRecord**: `id`, `staffId`, `date` (YYYY-MM-DD), `clockIn`, `clockOut`, `note`, `correctedBy`, `correctionReason`, `correctedAt`.
  - **LeaveRequest**: `id`, `staffId`, `type` (Casual, Sick, Other), `fromDate`, `toDate`, `reason` (mandatory), `status` (pending, approved, rejected, cancelled), `requestedAt`, `decidedBy`, `decidedAt`, `decisionNote`.
- **Pure Attendance Engine (`src/lib/attendance.ts`)**:
  - `now: Date` is explicitly passed into all engine functions to ensure deterministic unit testing and pure evaluation.
  - `hoursWorked(record)` calculates duration rounded to two decimal places.
  - `lateMinutes(record, shift)` calculates late arrival minutes past the shift start and grace threshold.
  - `earlyMinutes(record, shift)` calculates departure prior to scheduled shift end.
  - `isOutsideShift(record, shift)` identifies unscheduled duty days or clock-ins outside scheduled hours.
  - `missingClockOut(record, now)` identifies past shift days that lack a clock-out.
  - `sheetCode(...)` resolves status codes: `P` (present), `A` (absent on past scheduled day), `LV` (approved leave), `OFF` (scheduled off day), `-` (future date or today before/during shift).
  - `validateLeave(...)` enforces `fromDate <= toDate`, non-empty reason, maximum 7-day backdating (`MAX_LEAVE_BACKDATE_DAYS = 7`), and prevents overlapping active requests.
  - `decideLeave(...)` enforces `attendanceManagement`, requires a rejection note for rejections, and forbids self-decision unless the actor is the sole administrator in the clinic.
  - `cancelLeave(...)` allows only the original requester to cancel their own request while in `pending` status.
  - `correctRecord(...)` requires `attendanceManagement` and a mandatory correction reason.
- **Doctor Availability & Care Transfer Integration (`src/lib/availability.ts`)**:
  - Exports `isDoctorAvailable(doctorId, date?)` (defaults to today).
  - In DoctorView Transfer Care modal, candidate receiving physicians are filtered using `isDoctorAvailable`.
  - If a selected doctor is on leave or off-duty, plain text `"Doctor is not available today"` is displayed and transfer is disabled.
  - If no doctors are available, plain text `"No doctors available"` is displayed and the transfer action is disabled.
- **Monthly Attendance Sheet & Plain-Text CSV Export**:
  - Month and year selection grid showing status codes across all days of the month with summary totals (Present, Absent, Leave, Off, Total Hours).
  - "Export CSV" generates `attendance-YYYY-MM.csv` using client-side plain-text generation with zero external libraries.
- **Security Ledger Audit Logging**:
  - Ledger audit entries recorded for leave approvals (`leave_approved`), leave rejections (`leave_rejected`), record corrections (`attendance_record_corrected`), shift schedule updates (`shift_updated`), and clock-in overrides (`attendance_clock_in_override`).
- **UI & Responsive Specifications**:
  - Sidebar includes "Attendance" navigation item for all staff accounts.
  - Navigation provides "My Attendance" tab for all staff, and 4 admin tabs ("Today", "Attendance Sheet", "Leave Requests", "Shifts") gated by `attendanceManagement`.
  - All tables utilize design-system `Table` with `stackBelow="lg"`, 10 rows per page with `Pagination`, zero monospace, and responsive layout across 360px to 1920px.

### 2.14 Reception Workstation, Patient Intake & Token Flows (Milestone M4)
- **Front Desk Permissions & Operational Capabilities**:
  - The receptionist workstation requires the `patientRegistration`, `patientCheckIn`, or `paymentRecording` capabilities (present in the Front Desk module `mod-frontdesk`).
  - Patient registration requires `patientRegistration`. Patient check-in requires `patientCheckIn`. Appointment booking requires booking capability (or `patientRegistration` / `patientCheckIn` / `administrativeAccess`).
  - State mutation handlers in `ClinicContext` (`registerPatient`, `checkInAppointment`, `checkInWalkIn`, `bookAppointment`) enforce capability checks via `hasCapability` and reject unauthorized attempts without mutating state.
- **Demographics-Only Registration and Scoping**:
  - Registration collects outpatient demographic and contact details only: first name, last name, date of birth, age, phone number, email address, physical address, and emergency contact details.
  - Clinical fields (allergies, chronic conditions, triage vitals, and blood group) are strictly never collected or shown at reception.
  - `scopePatientForReceptionist` in `src/lib/permissions.ts` strips all clinical fields and blood group from patient records accessed by front desk personnel.
- **Three Outpatient Arrival Flows**:
  - **Flow A: New Walk-In**: Collects demographic details, assigns an available physician (`isDoctorAvailable(doctorId, today)`), schedules an immediate walk-in appointment (`source: 'walk_in'`), issues the next unique daily token, sets status to `checked_in`, records `checkedInAt` and `checkedInBy`, and records an audit log entry in the security ledger (`patient_registered`, `walkin_checked_in`).
  - **Flow B: Registered Walk-In**: Pre-selects a registered outpatient, automatically locking physician selection to their assigned doctor. If their assigned physician is unavailable today, check-in is disabled with plain text: *"Assigned doctor is not available today. Reassignment requires an administrator."* Receptionists cannot transfer patient doctor assignments. If available, schedules an immediate walk-in appointment (`source: 'walk_in'`), issues the next unique daily token, sets status to `checked_in`, records `checkedInAt` and `checkedInBy`, and logs to the security ledger (`walkin_checked_in`).
  - **Flow C: Booked Arrival**: Checks in an existing scheduled appointment (`scheduled`). Doctor availability is re-verified (`isDoctorAvailable(apt.doctorId, today)`). If the physician is unavailable, check-in is disabled with plain text: *"Doctor unavailable today"*. When available, transitions appointment to `checked_in`, assigns the next unique daily token, records `checkedInAt` and `checkedInBy`, and logs to the security ledger (`patient_checked_in`).
- **Daily Unique Token Numbering**:
  - Token numbers reset daily (1, 2, 3...) based on the calendar date (`YYYY-MM-DD`).
  - Tokens remain strictly sequential and unique per date.
  - Calculated deterministically via `getNextTokenNumberForDate(appointments, dateStr)` in `src/lib/reception.ts`.
- **Intake Metadata & Accountability**:
  - `Appointment` records `source` (`walk_in`, `reception`, `web`), `checkedInAt` (ISO timestamp), and `checkedInBy` (`{ id, name }`).
  - `Patient` records `registeredAt` (ISO timestamp) and `registeredBy` (`{ id, name }`).
  - Intake registry displays formatted accountability strings ("Priya Sharma", "David Kim", or fallback "Not recorded").
- **Four Workstation Tabs with 10-per-Page Pagination & Stacked Tables**:
  - **Waiting Lounge**: Live queue of today's checked-in, in-consultation, and completed arrivals ordered chronologically; 4 top metric cards (Total Checked In, Currently Waiting, In Consultation, Completed Today); "Call Next" and "Mark Completed" actions; plain text statuses without badges or dots; shared `Table` with `stackBelow="lg"`.
  - **Appointments**: Date-filtered agenda with design-system `DatePicker`; "Book Appointment" modal; doctor availability checking with plain-text notice if unavailable; "Check In" action.
  - **Patient Directory**: Registered outpatients listing demographics only (Name, MRN, DOB/Age, Phone, Assigned Doctor); "Check In" (opening Flow B modal with locked physician) and "Book" actions.
  - **Intake Registry**: Chronological audit log of today's registrations and check-ins; filterable by event type ("All Events", "Registration", "Check-in"); displays timestamp, event type, patient name, operator name, and details (Token number and doctor, or MRN).

### 2.15 Sign-Up, Data Persistence & Repository Architecture (Milestone M5)
- **Demo Platform & Unencrypted Storage Notice**:
  - The application operates as a demonstration clinical management environment.
  - All operational data is stored locally in client-side browser storage (localStorage) or an in-memory session.
  - Browser storage is unencrypted and accessible to anyone with access to the physical device. Real patient data must never be entered into the system.
- **Unified Repository Abstraction Layer**:
  - All application contexts read, mutate, and persist entities exclusively through an asynchronous repository interface (`Repository<T>`) exporting `list`, `get`, `create`, `update`, `remove`, and `replaceAll`.
  - Implemented via `BrowserRepository<T>` (versioned key prefix `cms_v1_<collection>`, debounced writes, try/catch error wrapping, and plain-text quota error "Could not save changes") and `MemoryRepository<T>` (in-memory mode for tests and reset-on-reload sessions).
  - Storage collections: accounts, staff, patients, assignments, appointments, visits, prescriptions, invoices, payments, attendance, leave, shifts, roles, approvals, claimRequests, ledger, and settings.
  - `SCHEMA_VERSION = 1`: automatic migration support, seed population on empty initialization, and robust recovery: corrupted JSON displays a plain-text recovery message with an outline "Reset demo data" action without crashing.
  - Contexts load through the repository on startup (rendering plain-text "Loading" without animations), write through on mutations, and synchronize cross-tab state via the browser `storage` event.
- **Cryptographic Authentication Service**:
  - Passwords are encrypted using Web Crypto PBKDF2-SHA256 with per-user cryptographically random 16-byte salts and stored as `{ salt, hash, iterations }`. Plain-text passwords are never persisted.
  - Password policy requires a minimum of 10 characters containing at least one letter and at least one number.
  - Account lockout: after 5 consecutive failed login attempts, the account is temporarily locked for 5 minutes with plain-text notification.
  - Sessions store `{ userId, expiresAt, lastActiveAt }`: 8-hour standard duration, 7-day duration when "Remember session" is checked, and automated sign-out after 30 minutes of inactivity.
  - Status guards prevent login for suspended, revoked, pending, or rejected accounts with plain-text status explanations.
- **Account Sign-Up & Claim Requests**:
  - Login screen includes a plain-text "Create account" link opening the sign-up workflow.
  - Role selection: Patient or Clinic staff. Admin access cannot be requested or created via sign-up.
  - Patient self-registration creates a patient portal account and a Patient demographic record (`MRN-XXXXX`, source `online`, registeredBy `self`). If an existing patient matches by phone or by name and date of birth, an account link claim request is generated and the patient is held in pending status until approved by a receptionist.
  - Front desk Receptionist workstation includes an "Account Link Requests" queue on the Intake Registry tab to approve or reject patient account link claims, recording ledger entries for both actions.
  - Staff registration creates a pending application in the existing onboarding approvals queue (`pendingApprovals`) with role restricted to Doctor or Receptionist. Upon approval by an administrator, the staff account is activated and enrolled into its default module.
- **Login Demo Helpers & Environment Variable Control**:
  - The authorized credentials directory and auto-fill buttons are controlled by the `VITE_DEMO_MODE` environment variable.
  - The directory and helper controls render only when `VITE_DEMO_MODE` is `"true"`. When not `"true"`, the directory is not rendered and excluded from production builds.
  - Login view includes an outline "Reset demo data" action with a confirmation dialog: *"Restore the demo data? All changes made in this browser will be lost."*
- **Administrative Data Management & Backups**:
  - Administrative module incorporates a dedicated "Data" tab gated by `administrativeAccess`.
  - Displays storage location, last saved timestamp, per-collection record counts, approximate storage size, and an 80% quota warning.
  - Storage mode selector allows switching between "Save data in this browser" and "Do not save: data resets on reload".
  - Backup export downloads a structured `cms-backup-YYYY-MM-DD.json` file.
  - Backup import validates version and schema structure, requires typing `RESTORE` to confirm, and preserves a snapshot for undo capability.
  - Reset demo data action requires typing `RESET` to restore baseline seeded state.
  - All data operations (export, import, reset, mode change) log immutable entries to the security audit ledger.

### 2.16 Billing, Invoicing & Payments Architecture (Milestone M6)
- **Monetary Storage & Formatting**:
  - Money is stored strictly as integer minor units (cents) throughout all types, state, calculation engines, and persistence.
  - Conversion to formatted display currency (`$X.XX`) occurs exclusively at presentation time using pure formatting functions.
  - No real payment gateway integration; no credit card numbers or banking secrets are ever collected, processed, or persisted.
- **Automated Invoice Generation on Visit Conclusion**:
  - When an attending physician concludes an outpatient consultation, an invoice is generated automatically through the billing engine using that doctor's stored consultation fee.
  - Invoices are linked idempotently to the appointment/visit (`visitId` / `appointmentId`), ensuring exactly one invoice per completed visit.
  - If a doctor record lacks a designated consultation fee, the engine falls back to `DEFAULT_CONSULTATION_FEE_CENTS = 10000` ($100.00).
  - Doctors receive zero billing data back and have no visibility into invoices, keeping the clinical workstation strictly isolated from financial records.
- **Billing Entity Models**:
  - **Invoice**: `id`, `number` (`INV-YYYY-XXXX`, sequential), `patientId`, `visitId`, `appointmentId`, `doctorId`, `issuedAt` (ISO timestamp), `items: InvoiceItem[]`, `status` (`unpaid`, `partially_paid`, `paid`, `void`), `createdBy` (`{ id, name }`).
  - **InvoiceItem**: `id`, `description`, `amount` (cents), `kind` (`consultation`, `charge`, `discount`).
  - **Payment**: `id`, `invoiceId`, `amount` (cents), `method` (`cash`, `card`, `upi`, `portal`), `kind` (`payment`, `reversal`), `reversesPaymentId`, `receivedAt` (ISO timestamp), `receivedBy` (`{ id, name }` or `"Patient portal"`), `reference` (short reference for card/upi/portal), `note`, `reason` (mandatory for reversals), `receiptNumber` (`RCT-YYYY-XXXX`, sequential).
- **Pure Calculation Engine & Ledger Integrity**:
  - `invoiceTotal(invoice)` calculates net total: consultation + charges minus discounts.
  - `amountPaid(payments, invoiceId)` calculates settled amount: sum of payments minus reversals for that invoice.
  - `balanceDue(invoice, payments)` calculates remaining outstanding amount (`max(0, invoiceTotal - amountPaid)`).
  - `deriveStatus(invoice, payments)` computes `void`, `paid` (balance = 0), `partially_paid` (paid > 0 and balance > 0), or `unpaid` (paid = 0).
  - Payments are immutable and cannot be edited or deleted. Corrections require an administrative reversal with a mandatory plain-text reason. Reversals cannot reverse another reversal and cannot over-reverse original payments.
  - Adding charges (`addCharge`) is allowed for any holder of `paymentRecording` on unpaid or partially paid invoices.
  - Applying discounts (`applyDiscount`) and voiding invoices (`voidInvoice`) require `administrativeAccess` with a mandatory reason. Invoices with recorded payments cannot be voided.
  - Idempotency key tracking in `applyPayment` prevents double submissions from creating duplicate transactions.
- **Receipts & Clinical Scoping**:
  - Receipts (`makeReceipt`) include clinic branding, receipt number, patient name, MRN, invoice number, amount, payment method, date/time, and receiving operator.
  - Receipts strictly contain zero clinical information, diagnoses, medications, or vitals.
- **Permissions & Workstation Access**:
  - Sidebar displays "Billing" navigation item for users with `paymentRecording` or `administrativeAccess`.
  - Viewing invoices and recording payments requires `paymentRecording` (or `administrativeAccess`).
  - Voiding invoices, applying discounts, and reversing payments require `administrativeAccess`.
  - Scoping: Receptionists and administrators see all clinic invoices; patients see only their own invoices, payments, and receipts; physicians receive an empty list (`[]`).
  - Reception workstation displays plain-text `"Outstanding balance: $X.XX"` with an invoice link on check-in workflows without blocking intake.
  - Patient portal includes an Invoices section with balance due, responsive table, and simulated "Pay Now" modal (Card or UPI) producing immediate portal receipts.

### 2.17 Patient Portal and Online Booking Architecture (Milestone M7)
- **Patient Privacy & Scoping**:
  - A patient can see and change only their own data. They never see other patients, other patients' appointments, doctors' notes, billing of others, or staff data.
  - Availability shown to patients contains free slots only.
  - A patient can see: personal details, allergies and conditions (read-only, with plain-text note: "Contact your doctor to update clinical records"), latest clinical vitals, visit history (date, doctor, department, reason), prescriptions, invoices and payments, and their own appointments. They cannot see consultation notes.
  - Patients can edit only contact details (phone, email with current password verification, address, emergency contact); clinical data is changed exclusively by doctors.
- **Unified Scheduling Constants & Engine (`src/lib/scheduling.ts`)**:
  - `SLOT_MINUTES = 20`: Consultation slot duration in minutes.
  - `BOOKING_LEAD_MINUTES = 120`: Minimum advance notice required (2 hours before slot).
  - `BOOKING_WINDOW_DAYS = 30`: Maximum forward booking window in calendar days.
  - `CANCEL_CUTOFF_MINUTES = 120`: Cutoff window within which appointments cannot be cancelled or rescheduled (2 hours).
  - `MAX_ACTIVE_BOOKINGS = 2`: Maximum concurrent active scheduled appointments per patient.
  - Pure scheduling functions (`now` always passed as parameter):
    - `getAvailableSlots(doctorId, date, appointments, shifts, leaves, now)`: Generates free 20-minute slots inside the doctor's shift for that date, excluding days off, approved leaves, past times, slots closer than `BOOKING_LEAD_MINUTES`, and slots with existing non-cancelled appointments. Returns `[]` if no shift, on leave, or outside `BOOKING_WINDOW_DAYS`.
    - `validateBooking(doctorId, date, time, patientId, appointments, shifts, leaves, now)`: Enforces booking lead, window, doctor availability, slot availability, and patient active booking limit (`MAX_ACTIVE_BOOKINGS`). Returns `{ allowed: boolean, reason?: string }`.
    - `bookAppointment(params, appointments, now)`: Pure helper returning new Appointment with source (`web` or `reception`), status `scheduled`, and token 0.
    - `cancelAppointment(appointment, actor, now, reason?)`: Updates appointment status to `cancelled`, recording `cancelledBy`, `cancelledAt`, and `cancelReason`. Fails if within `CANCEL_CUTOFF_MINUTES`.
    - `rescheduleAppointment(appointment, newDate, newTime, actor, appointments, shifts, leaves, now)`: Atomically cancels old appointment and creates new appointment with `rescheduledFrom` reference.
    - `appointmentsAffectedByLeave(doctorId, fromDate, toDate, appointments)`: Returns non-cancelled appointments scheduled with that doctor in that date range needing rescheduling.
- **Single Source of Truth across Patient Portal and Reception**:
  - Reception Book Consultation tab uses the exact same `getAvailableSlots` and `validateBooking` logic from `src/lib/scheduling.ts`.
  - When an unassigned patient books online with a doctor, they remain unassigned until intake. When they arrive and are checked in at reception (Flow C), reception automatically assigns them to that booked doctor.
- **Doctor Leave Impact & Patient Reschedule Notifications**:
  - When an administrator approves a doctor's leave request in `AttendanceView`, the system computes `appointmentsAffectedByLeave`, presents a plain-text count ("X appointments are affected"), marks those appointments `needsReschedule: true`, and generates in-app notifications for each affected patient.
- **Phone-First Patient Portal Architecture (`PatientView.tsx`)**:
  - Responsive sub-tab navigation (Appointments, Records, Prescriptions, Invoices, Profile) tested at 360px before 1920px.
  - **Appointments Tab**: Upcoming and Past sections with shared Table (`stackBelow="lg"`) and Pagination. "Book Appointment" button opens modal (full-width on mobile) with doctor selection, bookable DatePicker, minimum 44px time slot touch buttons, reason for visit, and emergency disclaimer. Actions on upcoming appointments: "Reschedule" and "Cancel" (disabled within `CANCEL_CUTOFF_MINUTES` with clear plain-text explanation).
  - **Records Tab**: Personal demographics, emergency contact, read-only medical profile (allergies, chronic conditions with disclaimer), latest vitals, and visit history table (date, doctor, department, reason; zero consultation notes).
  - **Prescriptions Tab**: Active and past prescriptions with details modal and print-ready single prescription view.
  - **Invoices Tab**: Complete M6 billing workstation interface with simulated Pay Now modal.
  - **Profile Tab**: Contact details editing with password confirmation for email change, and password update form enforcing the system password policy and cryptographic PBKDF2 hashing.
- **In-App Notification Center (`Navbar.tsx`)**:
  - Real-time notification store persisted in browser repository under collection `notifications`.
  - Accessible via bell icon in Navbar: shows unread counter, notification list with timestamp and context, "Mark all as read", "Dismiss", and deep links.

### 2.18 E-Prescribing, Formulary, Allergy Checks and Medication Management (Milestone M8)
- **Clinical Governance & Access Rules**:
  - Notice: The formulary, medication dosages, and allergy rules contained in this application are demonstration data only and do not constitute clinical guidance.
  - Only a staff member whose staff type is Doctor, possessing both Prescription Authoring (`prescriptionAuthoring`) and EMR Records Access (`emrRecordsAccess`), and who is the active assigned physician for the patient, can issue prescriptions.
  - Prescriptions are immutable once issued. Corrections cannot be made by editing or deleting records; a mistake is resolved by cancelling the prescription with a mandatory clinical reason and issuing a replacement.
  - Cancellations are restricted to the original issuing physician or a clinic administrator with `administrativeAccess`.
  - Receptionists have zero access to prescriptions or medication data. Patients can view only their own prescriptions and active medications through the Patient Portal.
  - Allergy and duplicate warnings are clinical decision support aids: they warn the prescriber and require an explicit clinical rationale to override, but they do not replace physician judgment.
- **Formulary Architecture (`src/types/prescribing.ts`, `src/data/formularySeed.ts`)**:
  - `Medicine`: Unique identifier (`id`), case-insensitively unique generic name (`genericName`), optional brand names list (`brandNames`), fixed drug category (`drugClass`: analgesic, antibiotic, antihypertensive, antidiabetic, lipid_lowering, gastric, respiratory, antihistamine, vitamin, other), dosage form (`form`: Tablet, Capsule, Syrup, Inhaler, Cream, Drops, Injection), approved strengths list (`strengths`), default route of administration (`defaultRoute`), and active status (`active`).
  - Seed catalog contains 43 essential clinic medications spanning the 9 primary classes, including all 8 medications present in existing seeded patient records.
  - Persisted in the browser repository under the `formulary` collection, synchronizing across tabs and persisted through backups.
- **Pure Prescribing Engine (`src/lib/prescribing.ts`)**:
  - `formatRegimen(item)`: Formats structured dosage regimens into standardized natural language sentences (e.g. "Amlodipine Besylate 5 mg tablet, 1 tablet, once daily in the morning, for 30 days, 0 refills.").
  - `calculateQuantity(doseAmount, frequency, durationDays)`: Computes dispense package quantities based on daily dose frequency and duration days, rounded up to the nearest whole unit. For ongoing regimens, a standardized 30-day supply baseline is calculated.
  - `validatePrescription(prescription)`: Validates that prescriptions contain between 1 and 10 items, positive dosage quantities, durations not exceeding 365 days (or "Ongoing"), refill counts between 0 and 3, and mandatory custom generic names (3 to 80 characters) when using the unlisted "Other" formulary option.
  - `ALLERGEN_RULES`: Seeded demonstration rules covering Penicillin (cross-reactivity with penicillin and amoxicillin derivatives), Sulfa (sulfonamides and cross-reactivity warnings), and Aspirin/NSAID (cross-reactivity with ibuprofen, naproxen, celecoxib, diclofenac). Clearly labeled: "Demo allergy rules. A clinician should review them."
  - `checkAllergies(patientAllergies, items, formulary)`: Cross-references patient allergy records against planned medication classes, generic names, and brand names. Warns prescriber on cross-reactivity matches and surfaces manual review advisories for unmapped reported allergens.
  - `checkDuplicates(items, activePrescriptions, formulary, now)`: Detects and warns against duplicate medications or concurrent prescriptions within the same therapeutic drug class actively taken by the patient.
  - `activeMedications(patientId, prescriptions, now)`: Computes the current active medication list for a patient based on prescription issue date and regimen duration. Cancelled prescriptions and expired courses are cleanly excluded, while ongoing regimens remain active until cancelled.
  - `migrateLegacyPrescription(legacy)`: Safely upgrades unstructured legacy text prescriptions to structured M8 items, ensuring backward compatibility.
- **Prescribing Workstation Flow (`DoctorView.tsx`)**:
  - Accessible via "Prescribe" actions on the Active Consultation desk card and Patient Summary table (both disabled with clear attribution when the patient is not assigned to the signed-in physician or the physician lacks `prescriptionAuthoring`).
  - Phone-first full-screen modal on mobile devices (max 720px on desktop) with a persistent, sticky patient banner displaying MRN, age, blood group, and allergy list across the top.
  - Common diagnosis combobox with free-text "Other" support.
  - Dynamic medication items builder (1 to 10 rows) featuring searchable combobox with muted brand name and strength sublabels, automated dosage form and route prefilling, numeric dose input without spinners, frequency and timing selects, duration select, live computed quantity readouts, refill count selects, and optional 200-character instructions.
  - Real-time inline amber warning banners beneath each item for allergy cross-reactivity matches and duplicate class/medication alerts.
  - "Repeat last prescription" action to populate the form from the patient's previous prescription with one click.
  - Unsaved changes confirmation dialog preventing accidental modal dismissal.
  - Two-step safety issue gate: if any allergy warnings exist, the system requires a mandatory clinical override reason (minimum 10 characters) logged permanently to the security ledger.
  - Post-issue confirmation screen showing the generated Rx number with immediate "View Prescription" and "Print" actions.
- **e-Prescriptions Master Ledger (`DoctorView.tsx`)**:
  - Full clinic prescription ledger with search (Rx number, patient name, diagnosis) and status filtering (All, Active, Cancelled).
  - Columns: Rx #, Patient, Date, Diagnosis, Regimen (formatted by `formatRegimen`), Status (plain text: "Active" or "Cancelled"), and Actions.
  - Printable modal view presenting formal outpatient prescription layout, formatted regimens, plain-text status, and a "Signed: Dr. <Name>" closing line.
  - Cancellation dialog requiring a mandatory clinical reason.
- **Patient Portal Integration (`PatientPortal.tsx`)**:
  - Prescriptions tab upgraded to display formatted regimens, plain-text status ("Active" or "Cancelled by the clinic"), and printable prescription view modal with window.print invocation. Internal doctor notes are strictly excluded from patient-facing views.
  - Medical Profile card displays "Current Medications" dynamically computed by `activeMedications`.
- **Administrative Formulary Management (`FormularyTab.tsx` in `AccessControlView.tsx`)**:
  - Dedicated "Formulary" sub-tab in the Admin Console, gated by `administrativeAccess`.
  - Title count displaying total registered medications: `Formulary (43)`.
  - Search by generic and brand name, and filter by drug class.
  - Shared Table displaying Medicine, Class, Form, Strengths, Status (plain text "Active" or "Inactive"), and Actions ("Edit", "Deactivate" / "Activate"). Deletion is prohibited to preserve historical prescription integrity.
  - Add / Edit Medicine modal validating unique generic names, comma-separated brand names and strengths, dosage forms, and routes.
  - Read-only review section displaying all active `ALLERGEN_RULES` with explicit demo disclaimer.
- **Security Ledger Audit Tracking**:
  - `prescription_issued`: Logs Rx number, patient ID, doctor ID, item count, and allergy override flag.
  - `prescription_cancelled`: Logs Rx number, patient ID, doctor ID, and cancellation reason.
  - `allergy_override`: Logs Rx number, patient ID, doctor ID, allergen, medication, and clinical rationale.
  - `formulary_medicine_created`, `formulary_medicine_updated`, `formulary_medicine_status_changed`: Logs administrator ID and formulary modifications.

### 2.19 Dashboard Architecture, Access-Gated Widgets, and Daily Summary (Milestone M9)
- **Access-First Governance & Role Decoupling**:
  - Dashboard widgets, figures, charts, and quick actions are gated strictly by capabilities/accesses, never by job title or role strings.
  - Each widget declares its required accesses (any one match is sufficient for display). A user sees every widget they qualify for based on their effective module memberships.
  - When an account gains cross-functional capabilities (e.g. a doctor assigned Front Desk check-in or a receptionist granted Administrative access), the dashboard automatically reflects the newly unlocked widgets and actions without any title changes.
  - Patients possess their own simplified dashboard displaying next appointment, balance due, active prescriptions, and visits this year, with zero charts or administrative clutter.
- **Pure Metric Figure Definitions**:
  - All "today" and "now" calculations receive an explicit `now` parameter and never read from system clocks internally.
  - `New Patients`: Count of patients registered within the active date range (`p.registeredDate` within range).
  - `Visits`: Count of completed clinical appointments within the range (`status === 'completed'` and `dateTime` within range).
  - `Appointments`: Count of appointments dated in the range, strictly excluding cancelled appointments.
  - `Missed Appointments`: Count of past appointments within the range that were never checked in (`dateTime < now` and status was never checked in or completed, or marked `no_show`).
  - `Billed`: Sum of invoice total amounts issued in the range, strictly excluding void invoices (`issuedAt` within range, minor unit integer math).
  - `Collected`: Payments received in the range minus reversals received in the range (`receivedAt` within range).
  - `Outstanding now`: Total balance due across all non-void invoices clinic-wide as of today, independent of the selected range filter (labeled "Outstanding now").
  - `Staff present`: Real-time count of staff currently present, derived from the attendance engine (`staffPresentToday`).
- **Widget Registry Architecture (`src/lib/dashboardWidgets.ts`, `src/lib/dashboardMetrics.ts`)**:
  - `dashboardWidgets.ts`: Definitive registry containing widget identifiers, titles, required capability accesses, and selector bindings.
  - Clinic Summary Card:
    - `administrativeAccess`: Clinic-wide visibility across New Patients, Visits, Appointments, Missed Appointments, Billed, Collected, Outstanding now, and Staff present.
    - `consultationWorkstation`: Scoped exclusively to the doctor's assigned patients for New Patients, Visits, Appointments, Missed Appointments, and Staff present. Financial metrics are strictly blocked.
    - Front Desk accesses (`patientRegistration`, `patientCheckIn`): Scoped to appointment activity (Appointments, Missed, Waiting, Checked In Today).
  - Financial Metrics & Fees and Payments Chart:
    - Gated to `paymentRecording` or `administrativeAccess`. Doctors without billing access never see billing figures or charts.
  - Patients and Visits Chart:
    - Gated to `administrativeAccess` (clinic-wide data) or `consultationWorkstation` (physician's own patient data).
  - Today's Appointments List:
    - Visible to `consultationWorkstation` (doctor's own patients), `patientCheckIn` or `patientRegistration` (all scheduled patients, clinical fields excluded), or `administrativeAccess` (all patients).
  - Needs Attention List:
    - Rows are dynamically rendered only when the user holds the access required to act on them:
      - Pending Clearances (`administrativeAccess`)
      - Leave Requests (`administrativeAccess` or `attendanceManagement`)
      - Account Link Requests (`patientRegistration` or `patientCheckIn`)
      - Needs Rescheduling (`patientRegistration` or `patientCheckIn`)
      - Unpaid Invoices over 30 days (`paymentRecording` or `administrativeAccess`)
    - Displays Item, Count, and "Review" navigation link. Rows with a count of 0 are omitted; if all counts are 0, displays plain text "Nothing needs attention."
  - Staff Presence:
    - Gated to `attendanceManagement` or `administrativeAccess`. Displays plain-text summary counts ("X in, Y out, Z on leave, W not in yet") and a table of staff who are late or not in yet (Name, Shift start, Status).
  - My Attendance:
    - Visible to every staff account. Displays today's Clock In / Clock Out action control, shift status, and cumulative hours worked today.
  - Front Desk Today:
    - Gated to `patientCheckIn` or `patientRegistration`. Displays Waiting, In Consultation, Booked Today, Checked In Today, and "Outstanding now" (only if the user also holds `paymentRecording`).
  - Omitted Widget Report:
    - The "Follow-ups Due" widget is omitted from the registry because neither appointments nor completed visits contain a structured target follow-up date data source in the clinical domain model.
- **Quick Action Button Governance**:
  - Action buttons derive purely from capabilities:
    - "Register Patient" and "Walk-in Check-In": Gated to `patientRegistration` or `patientCheckIn`.
    - "Consultation Desk": Gated to `consultationWorkstation`.
    - "Add Staff": Gated to `administrativeAccess`.
    - "Clock In": Gated to staff accounts.
  - Physicians and administrators without front desk capabilities never see patient intake action buttons.
- **Overview Layout (`DashboardView.tsx`)**:
  - Two persistent physician-style tabs with static underline: "Overview" and "Daily Summary". The "Daily Summary" tab is conditionally rendered only to accounts qualifying for at least one of its sub-sections.
  - Overview displays greeting, date range Select (Today, Last 7 days, This month default, Last 30 days), single outlined summary card (4 columns on desktop, 2 on tablet/mobile), static SVG charts, and 10-per-page paginated tables.
  - Empty periods display plain text "No data for this period." inside widgets, avoiding blank cards.
- **Daily Summary Tab (`DashboardView.tsx`)**:
  - Features custom DatePicker (default today, future dates disabled), outline "Print" button with dedicated print stylesheet scoped to clinic name, date, and summary data, and outline "Export CSV" button generating `daily-summary-YYYY-MM-DD.csv`.
  - Sections rendered according to access permissions:
    - Patients: Registrations, check-ins, completed visits, cancellations, no-shows, and online bookings for the chosen date (`administrativeAccess` or any patient access).
    - By Doctor: Table of Doctor, Booked, Checked In, Completed, Prescriptions issued (`administrativeAccess`; individual doctors see only their own row).
    - By Receptionist: Table of Receptionist, Registrations, Check-ins, Bookings made, Payments recorded (`administrativeAccess`, or `patientCheckIn` for own row only).
    - Collections: Totals per payment method (Cash, Card, UPI, Portal), reversals, net total, and daily billed (`paymentRecording` or `administrativeAccess`). Front desk staff see only their own collections ("My collections") and a plain-text line "Cash to hand over: <amount>".
    - Attendance: Present, Late, On leave, Absent counts, names of late/absent staff, and total hours worked (`attendanceManagement` or `administrativeAccess`; individual staff see only their own line).
    - Displays plain text "No activity on this date." on days with zero activity across all accessible sections.

### 2.20 Consistency Fixes, Test Hardening, and Universal Verification Suite (Milestone M9.5)
- **Universal Verification Runner (`npm run verify`)**:
  - Unified one-command quality gate executing five automated steps: `npm run build` (type check + production rollup), `npm run typecheck` (`tsc --noEmit`), `npm run test:all-zones` (`vitest run` across `TZ=UTC`, `TZ=America/Los_Angeles`, and `TZ=Asia/Kolkata`), `npm run scan:emojis` (full codebase, docs, tests, and public assets scanner permitting registered legal symbols), and `npm run scan:commits` (scans last 100 git commit messages for emojis).
- **Single Source of Truth for Access & Dynamic Derivation**:
  - Deprecated and removed static `User.capabilities` caching, legacy `perm-*` aliases, and role-string shortcuts.
  - `hasCapability` and `isAdmin` evaluate strictly from active account status and live module membership (`AccessModule.memberIds`).
  - Access updates take effect instantaneously across the session when memberships are altered.
  - Hardened original Managing Director preservation: Dr. Marcus Vance (`acc-doc-1`) retains non-revocable administrative authority.
- **Canonical Staff Identifiers**:
  - Established canonical staff identifier standard (`acc-doc-1`, `acc-doc-2`, `acc-doc-3`, `acc-rec-1`, `acc-rec-2`) in `src/lib/staffIds.ts`.
  - Added resolver functions (`resolveStaffId`, `resolveDoctorId`, `isSameStaff`) to normalize legacy identifiers across permissions, selectors, scheduling, prescribing, attendance, and dashboard aggregation.
- **Strict Prescription Scoping**:
  - Non-administrative physicians see exclusively prescriptions for patients actively assigned to them, plus prescriptions they authored personally. Clinic-wide prescription ledger visibility is restricted to administrators.
- **Physician Names and Minor Currency Units**:
  - Created `src/lib/doctorNames.ts` providing `formatDoctorName` which unconditionally strips duplicate "Dr." prefixes, ensuring uniform formatting across intake logs, worklists, receipts, prescriptions, and dashboard tables.
  - Unified all monetary arithmetic in `src/lib/money.ts` using integer minor units (cents). Eliminated legacy floating-point dollars branches and converted doctor consultation fees to cents.
- **Clinic Local Calendar Time**:
  - Standardized local calendar day keys in `src/lib/time.ts` (`formatLocalDate`, `getClinicDayKey`, `parseLocalDateKey`) to eliminate time zone shifting across payments, collections, attendance logs, appointments, and dashboard queries.
- **Structured Allergy Warning Output**:
  - Upgraded `checkAllergies` in `src/lib/prescribing.ts` to return `{ matches, unchecked }`. Matches against defined cross-reactivity rules require clinical override rationale; unmapped reported allergies display plain-text informational advisories without blocking prescription issue.
- **Hand-Calculated Test Hardening**:
  - Converted loose `>= 0` assertions to exact hand-calculated expected figures derived from deterministic fixtures across dashboard aggregations, shared Table jsdom accessibility, vitals boundary validations, and attendance engine rules.
- **Dashboard Decision on Staff Presence**:
  - Documented design decision that front desk receptionists retain visibility into the "Staff present" figure to support walk-in triage, queue flow coordination, and doctor availability routing without exposing private HR or payroll data.

---

### 2.21 Payments Blank Screen Root Cause Fix, Storage Migration, and Error Boundary Hardening

- **Root Cause Elimination in Payments View**:
  - Resolved BillingView.tsx crash where payments with null or unpopulated receivedBy caused TypeError: Cannot read properties of null (reading "name"). Added unified actor formatter formatActor and canonical normalizer normalizeActor handling strings, objects, null, and undefined uniformly.
  - Hardened calculateDailyCollections in src/lib/billing.ts to parse receivedAt || date safely, use getActorId, and validate integer minor units without throwing on missing fields.
  - Eliminated crashes in invoice search suggestions and tables when older records had invoiceNumber or date instead of number or issuedAt. Missing invoice numbers or patients render plain text "Unknown".
  - Enforced strict signatures on all selectors in src/lib/selectors.ts (getScopedInvoices, getScopedPatients, getScopedAppointments, getScopedPrescriptions, getScopedPayments), removing optional and unused parameters to guarantee callers never pass undefined.
- **Storage Schema Migration (SCHEMA_VERSION = 2)**:
  - Bumped SCHEMA_VERSION from 1 to 2 in src/lib/authConstants.ts.
  - Implemented automatic, in-place storage schema migrations in src/data/storage.ts (runStorageMigrations, migrateInvoices, migratePayments, migratePrescriptions, migrateStaff, migrateAppointments) and integrated them into initialization (seedInitialData) and backup restoration (importBackupData).
  - Converts legacy dollar amounts to integer cents, resolves legacy prescription text to formulary regimens via migrateLegacyPrescription, upgrades staff consultation fees to minor units, and normalizes actor shapes without silent data loss.
- **Hierarchical ErrorBoundary Component**:
  - Created reusable ErrorBoundary class component (src/components/ui/ErrorBoundary.tsx) wrapped around the main page content area in AppLayout.tsx (preserving header and sidebar navigation) and around individual tab contents.
  - On render failure, displays plain text "Something went wrong on this page." with outline buttons "Reload page" and "Reset demo data" (confirmation modal), logging error and component stack to the console only with strictly zero stack traces in the UI.
- **Verification and Automated Tests**:
  - Authored tests/paymentsTab.test.tsx (testing seed data, orphan payments, polymorphic receivedBy, empty lists, and pre-migration shapes).
  - Authored tests/migration.test.ts (testing version-1 backup fixture upgrades, collection normalizers, and in-place localStorage migrations).
  - Authored tests/errorBoundary.test.tsx (testing error catching, fallback rendering, reload, and modal reset actions).
  - Authored tests/tabsAudit.test.tsx (testing all tabs across MD, Doctor, Receptionist, and Patient with seed and legacy v1 data).
  - 18 test files, 157 tests passing across UTC, America/Los_Angeles, and Asia/Kolkata; 0 TS errors; 0 lint warnings; 0 emojis.

---

### 2.22 Static Light-Mode Card and Modal Shadows (Milestone M10 Section 1)

- **Shadow Tokens & Architecture**:
  - Defined two centralized CSS shadow tokens in src/index.css and tailwind.config.js:
    - Card token (--shadow-card / shadow-card): 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08). Applied strictly to Cards and card containers in the light theme only.
    - Modal & Drawer token (--shadow-modal / shadow-modal): 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06). Applied strictly to Modals, drawers, and overlay popovers in the light theme only.
  - Card outlines (border border-slate-200/80 dark:border-slate-800) are preserved alongside the soft shadow.
- **Strict Shadow Boundaries & Prohibitions**:
  - Zero shadow in dark theme (dark:shadow-none, .dark .shadow-card { box-shadow: none !important; }).
  - Zero shadow in print media (@media print { .shadow-card, .shadow-modal { box-shadow: none !important; } }).
  - Zero shadow on the header, navigation bars, tables, table rows, inputs, buttons, or nested inner boxes.
  - Zero hover or focus shadow changes.
  - Zero animated transitions or transition-colors on shadows or components.

---

### 2.23 Universal Theme Contrast, Static Focus Outline, and Chart Tokens (Milestone M10 Section 2)

- **Contrast Ratios & Typography Standards**:
  - All text content strictly achieves at least 4.5:1 contrast against light and dark backgrounds (WCAG AA).
  - Light mode muted text utilizes text-slate-500 or text-slate-600 (4.60:1 to 7.00:1 contrast on white and slate-50).
  - Dark mode muted text utilizes dark:text-slate-400 or dark:text-slate-300 (5.34:1 to 8.87:1 contrast on slate-900).
  - Inverted text pairings (text-slate-400 dark:text-slate-500) are strictly prohibited and eliminated across all workstation navigation, form pickers, tables, and dialogs.
  - Form placeholders are standardized to placeholder:text-slate-500 in light mode and dark:placeholder:text-slate-400 in dark mode.
- **Static Keyboard Focus Outline**:
  - Focus rings, glowing halos, and animated focus transitions are suppressed (ring-0, shadow-none).
  - Keyboard navigation employs a static, non-animated 1px solid outline via :focus-visible with 1px outline offset (--focus-outline token: #0d9488 in light mode [4.53:1 contrast], #14b8a6 in dark mode [6.94:1 contrast], exceeding the 3:1 non-text requirement).
- **Chart Mark Tokens & Visual Accessibility**:
  - Raw hex and rgb colors in SVG charts and data visualizations are eliminated in favor of semantic CSS tokens defined in src/index.css:
    - --chart-primary: #0d9488 (light) / #2dd4bf (dark).
    - --chart-secondary: #475569 (light) / #cbd5e1 (dark).
    - --chart-hatch-rect: #64748b (light) / #94a3b8 (dark).
    - --chart-hatch-line: #334155 (light) / #f1f5f9 (dark).
    - --chart-grid: #94a3b8 (light) / #475569 (dark).
    - --chart-pattern: #64748b (light) / #cbd5e1 (dark).
  - All chart lines, markers, bars, and hatch patterns reach >= 3:1 contrast against chart canvas in both themes.
  - Data distinction maintains multi-channel accessibility: solid line with circles for billed fees, dashed line (strokeDasharray="5,4") with squares for collections, solid teal bars for new patients, and 45-degree hatch pattern for outpatient visits.
- **Automated Color Enforcement**:
  - Added automated color scanner scripts/scan-colors.ts and wired into npm run verify. The build fails if any raw hex (#...) or rgb(...) / rgba(...) color appears in code outside designated design token files.

---

### 2.24 Keyboard Navigation, Focus Management, and Screen Reader Hardening (Milestone M10 Section 3)

- **Landmarks & Skip Navigation**:
  - Implemented keyboard-accessible "Skip to main content" link at the top of AppLayout (<a href="#main-content">), visible upon focus with high contrast.
  - Enforced semantic document landmarks: <header> for workstation app header, <aside aria-label="Sidebar Navigation"> and <nav aria-label="Main Navigation"> for navigation, and <main id="main-content" tabIndex={-1}> for the primary view area.
  - Registered a global polite live region (#global-status-region, role="status", aria-live="polite", aria-atomic="true") for screen reader announcements alongside in-view status banners.
- **Heading Order & Hierarchy**:
  - Standardized exactly one <h1> per page/view across all workstation pages (Consultation Desk, Front Desk & Reception, Billing, Administrative & Security Governance, Staff Attendance, Dashboard, Patient Portal, and Auth screens).
  - Subsequent section titles strictly follow hierarchical order (<h2> for card headers, <h3> for modal dialog titles and card sub-sections).
- **Navigation & Tablist Roles**:
  - Sidebar navigation items dynamically set aria-current="page" when active.
  - All workstation sub-navigation tab bars utilize role="tablist" with descriptive aria-label attributes.
  - Individual tab triggers specify role="tab", aria-selected={isActive}, and aria-current={isActive ? "page" : undefined}.
- **Focus Trapping, Escape Closing, and Opener Focus Return**:
  - Modal dialogs (Modal.tsx) trap focus across focusable elements (button, input, select, textarea, [tabindex]), close on Escape, and return keyboard focus to the opening trigger button on dismissal.
  - Mobile phone drawer (Sidebar.tsx) traps keyboard focus when open, closes on Escape, and returns focus to the navigation toggle button.
- **Form Accessibility & Error Linkage**:
  - Form controls (Input.tsx, Textarea.tsx, Select.tsx, DatePicker.tsx) explicitly link error messages via aria-describedby ({id}-error) and set aria-invalid={true} upon error.
  - Error messages specify role="alert".
  - Design-system dropdown Select.tsx provides accessible combobox and listbox roles (role="combobox", aria-expanded, aria-haspopup="listbox", role="listbox", role="option", aria-selected).
  - Interactive search bar clear trigger includes explicit aria-label="Clear search".
- **Automated Verification**:
- **Automated Verification**:
  - Authored comprehensive test suite in tests/keyboardNav.test.tsx verifying skip link, landmarks, polite live region, modal focus trapping/return, form error linkage, tablist keyboard walking, and single <h1> rules.

---

### 2.25 Size, Scale, and Responsive Reflow Architecture (Milestone M10 Section 4)

- **Rem-Based Scale Compliance**:
  - The root font size is strictly preserved at 16px (1rem).
  - All hardcoded pixel font sizes (such as text-[10px] and text-[11px]) across all 23 component and view files were converted to relative rem units (text-[0.625rem] / 2xs and text-[0.6875rem] / xs-plus).
  - Extended tailwind.config.js fontSize scale with 2xs: '0.625rem' and xs-plus: '0.6875rem' to standardize sub-xs typography tokens.
  - Text scales proportionally when the user adjusts their browser root font size or activates browser zoom levels (100%, 125%, 150%, 200%).
- **Reflow and WCAG 1.4.10 Compliance (320 CSS Pixels)**:
  - Validated responsive layout at 320 CSS pixels width (equivalent to 400% zoom on a 1280px display per WCAG 2.1 Reflow 1.4.10).
  - Main content column reflows cleanly with strictly zero horizontal window scrolling (0 sideways scroll verified via automated viewport test).
  - Data tables and SVG visualizations scroll inside their own containers with indicators rather than causing sideways page overflow.
- **Full Viewport Visual Capture Suite**:
  - Captured full-screen 1440x900 screenshots across all 20 views and workstations in both light and dark themes into docs/final-screens/ using automated headless Chrome CDP capture.

---

### 2.26 Component States, Disabled Control Helper Text, and Vitest Warning Failures (Milestone M10 Section 5)

- **Loading, Empty, and Error States**:
  - Enhanced shared Table.tsx to natively support isLoading, error, emptyMessage, and emptyAction.
  - Empty states render a short plain-text explanation and, where an action is useful, a plain outline button to take the first step (e.g. Register a patient).
  - Exported reusable helper rows: TableLoadingRow, TableEmptyRow, and TableErrorRow for custom table layouts.
- **Visible Helper Text for Disabled Controls**:
  - Eliminated title attributes and tooltips on disabled interactive controls in favor of visible, permanent helper text:
    - AccessControlView.tsx: Added visible reason text when revoking administrator privileges or deleting staff accounts is disallowed.
    - AttendanceView.tsx: Added visible explanation ("Cannot decide own leave request") when an administrator attempts to decide their own leave.
    - DoctorView.tsx: Added visible explanation ("Not checked in yet") on disabled Start Consultation buttons, and visible reasons on Admit to Desk.
    - ReceptionistView.tsx: Added visible explanation ("Requires registration access") on disabled account claim approval/rejection actions.
    - RoleSwitcher.tsx: Replaced hover title with visible inline "(Suspended)" indicator and stripped animated transitions.
- **Strict Vitest Warning and Console Failure Hook**:
  - Configured global test setup hook in tests/setup.ts registered via setupFiles in vitest.config.ts.
  - The hook strictly fails any unit or component test that emits a console.error, console.warn, or unhandled promise rejection.
  - Refactored asynchronous lifecycle effects with isMounted cancellation guards and wrapped test renders in await act(async () => ...) with deterministic cleanup().

---

### 2.27 Comprehensive Audit Ledger Coverage and Mutation Tracking (Milestone M10 Section 6)

- **Universal Audit Coverage**:
  - Every state-changing mutation across the application writes an immutable entry to the Security Audit Ledger (ledger collection in browser storage).
  - Covered actions include:
    - Authentication and Access: user_login, account_locked, password_reset, access_granted, access_revoked, account_deleted, account_provisioned, clearance_approved, clearance_rejected, staff_clearance_requested.
    - Patient and Clinical Flow: patient_self_registered, patient_registered, patient_checked_in, walkin_checked_in, vitals_recorded, consultation_started, consultation_concluded, care_transferred, patient_assigned.
    - E-Prescribing: prescription_issued, prescription_cancelled, allergy_override.
    - Billing and Revenue: invoice_issued, charge_added, discount_applied, payment_recorded, portal_payment, payment_reversed, invoice_voided.
    - Time and Attendance: attendance_clock_in, attendance_clock_in_override, attendance_clock_out, leave_requested, leave_approved, leave_rejected, attendance_record_corrected, shift_updated.
    - Governance Modules: module_created, module_renamed, module_deleted, module_access_included, module_access_removed, module_member_added, module_member_removed.
    - System Storage and Backup: storage_mode_changed, data_exported, data_imported, data_restored_undo, demo_data_reset.
- **Documentation and Verification**:
  - Authored comprehensive matrix document in docs/LEDGER_COVERAGE.md detailing every action, primary actor, target entity, payload fields, and automated test status.
  - Authored dedicated test suite tests/ledgerCoverage.test.ts verifying ledger creation, field retention, and querying.

---

### 2.28 Demonstration Scenario Data Engine and Invariant Verification (Milestone M10 Section 7)

- **Dynamic Clinical Timeline and Offsets**:
  - Implemented dynamic seed scenario generator in src/data/demoScenario.ts relative to active execution time (now: Date = new Date()), wired directly into browser storage initialization (seedInitialData(force) in src/data/storage.ts).
  - Guarantees realistic calendar alignment across any execution date and timezone, eliminating stale hardcoded date fixtures.
- **Staff Accounts and Identity Constraints**:
  - Exactly 5 canonical staff accounts: Dr. Marcus Vance (Managing Director, acc-doc-1), Dr. Nathan Hayes (Staff Physician, acc-doc-2), Dr. Sophia Reed (Outpatient Physician, acc-doc-3), Priya Sharma (Lead Front Desk Coordinator, acc-rec-1), and David Kim (Front Desk Intake Specialist, acc-rec-2).
  - Strict name uniqueness: no two staff members share a name, and strictly zero patient accounts share any first or last name with staff members.
- **Patient Registry and Clinical Realism**:
  - Exactly 7 distinct outpatient records (pat-1 through pat-7), featuring Eleanor Wright (pat-1, Penicillin and peanut allergy, ongoing antihypertensives Amlodipine Besylate 5mg and Hydrochlorothiazide 12.5mg), James Miller (pat-2, Type 2 diabetes), Clara Thornton (pat-3, asthma), Arthur Dent (pat-4, preventive wellness), Fiona Gallagher (pat-5, acute triage), Robert Chen (pat-6, hyperlipidemia, 35-day-old unpaid invoice), and Maya Lin (pat-7, pending portal account link request).
- **Queue and Workstation Distribution**:
  - Today features realistic operational activity: exactly 1 waiting in lounge (Clara Thornton, token 2), 1 in consultation (Eleanor Wright, token 1), 1 completed with an electronic prescription and paid invoice (James Miller, Dr. Vance), 1 scheduled later today (Arthur Dent, 15:30), and 1 unexcused no-show from yesterday requiring rescheduling (Fiona Gallagher).
- **Operational Clearances, Leave Requests, and Financial Aging**:
  - Exactly 1 pending staff clearance request (Dr. Clara Oswald, Pediatrics, 11000 cents consultation fee).
  - Exactly 1 pending leave request (Priya Sharma, Casual leave for personal travel).
  - Exactly 1 unpaid invoice > 30 days old (Robert Chen, issued 35 days ago, 15000 cents balance due).
- **Needs Attention Widget Coverage**:
  - All 5 oversight categories in the Needs Attention dashboard widget (clearances, leaves, claims, reschedule, unpaid_30) report non-zero counts for clinic administrators.
- **Automated Business Invariant Test Suite**:
  - Added dedicated test suite tests/demoScenario.test.ts (17 tests) asserting:
    1. No unassigned patient has a completed visit.
    2. No doctor prescribes without an active primary patient assignment.
    3. Money is represented strictly in integer minor units (cents) everywhere with zero floating-point decimals.
    4. Zero emojis exist in any string property across the entire generated dataset.

---

## 3. CHRONOLOGICAL CHANGELOG OF USER REQUESTS & COMMITS

The table below outlines the evolution of the codebase from initial repository setup to current state:

| Commit Hash | Commit Message / Feature Description | User Intent & Key Actions |
| :--- | :--- | :--- |
| `f45ef64` | `feat(hardening): complete M9.5 hardening, drop User.capabilities, add duplicate patient detection and staff signup helpers, and extend test coverage to 171 tests` | User requested: "TASK: M9.5, Consistency fixes and test hardening. No new features. Branch: m9-5-hardening. Prerequisites: M1 to M9 and the Payments blank-page fix are merged...". Dropped User.capabilities from src/types/index.ts and cleaned residual capabilities in storage migration (migrateStaff). Extracted and unified pure duplicate patient detection (findMatchingPatient) and staff clearance application generation (createStaffSignupRequest) in src/lib/auth.ts and wired them into AuthContext.tsx. Extended BrowserRepository test suite with persistence, reload, quota exceeded error handling, and cross-tab storage event cache invalidation. Added Reception lounge waiting table definition test in tests/table.test.tsx. Added shift update and attendance record correction validation tests in tests/attendance.test.ts. Verified full suite across UTC, America/Los_Angeles, and Asia/Kolkata (18 test files, 171 tests passing). 0 TS errors, 0 lint warnings, 0 emojis across codebase and commits. |
| `3d33950` | `fix(billing): resolve payments blank screen, add storage migration, and error boundaries` | User requested: "TASK: Bug fix: the app goes blank when the Payments section is opened. Branch: fix-payments-blank. Fix the root cause, not the symptom...". Identified root causes (null receivedBy object check in BillingView.tsx:758, missing receivedAt in calculateDailyCollections, unmigrated invoiceNumber in search suggestions, unhandled React unmount). Fixed root causes with formatActor, normalizeActor, safe invoice/date fallbacks, and strict selector signatures. Bumped SCHEMA_VERSION to 2 with in-place storage migrations for invoices, payments, prescriptions, staff consultation fees, and appointments in src/data/storage.ts. Added ErrorBoundary around AppLayout page shell and tab contents with plain text fallback, outline buttons, and reset confirmation modal. Added comprehensive test suites: tests/paymentsTab.test.tsx, tests/migration.test.ts, tests/errorBoundary.test.tsx, and tests/tabsAudit.test.tsx. Audited all tabs across MD, Doctor, Receptionist, and Patient roles. 18 test files, 157 tests passing across all three time zones; npm run verify passes 100% with 0 TS errors, 0 lint warnings, and 0 emojis. |
| `f7cb9b0` | `feat(hardening): consistency fixes, canonical staff IDs, money minor units, and vitest verification (M9.5)` | User requested: "TASK: M9.5, Consistency fixes and test hardening. No new features. Branch: m9-5-hardening. Prerequisites: M1 to M9 merged...". Ported entire test suite to Vitest (14 test files, 133 tests). Added universal verify script npm run verify (build, typecheck, multi-timezone tests in UTC, LA, Kolkata, emoji scan, commit scan). Derived permissions strictly from module membership and active status. Replaced raw IDs with canonical staff ID resolver. Enforced doctor prescription scoping to assigned patients and authored scripts. Added formatDoctorName eliminating duplicate Dr. prefixes. Standardized money.ts to integer minor units (cents) with consultation fee migration. Added local time helper formatLocalDate. Upgraded allergy check to output matches and unchecked lists. Replaced weak tests with exact hand-calculated fixture assertions. Zero emojis across codebase; npm run verify passes 100%. |
| `6ab9904` | `feat(dashboard): implement capability-gated widgets, daily summary, and CSV export (M9)` | User requested: "TASK: M9, Dashboard update and daily summary. Prerequisites: M1 to M8 merged. Branch: m9-dashboard...". Implemented widget registry (src/lib/dashboardWidgets.ts) and pure aggregation selectors (src/lib/dashboardMetrics.ts). Gated all widgets by accesses. Created Daily Summary tab with DatePicker, print styles, and CSV export. 0 TS errors, 0 lint warnings, 0 emojis. |
| `aad92a9` | `feat(prescribing): implement medicine formulary, allergy checks, and e-prescriptions (M8)` | User requested: "TASK: M8, Prescribing: medicine dropdowns, allergy checks and formulary. Prerequisites: M1 to M7 merged. Branch: m8-prescribing...". Implemented formulary seed with 43 essential medicines, structured PrescriptionItem and Prescription types, pure prescribing engine (formatRegimen, calculateQuantity, validatePrescription, checkAllergies, checkDuplicates, activeMedications), prescribing modal in DoctorView with searchable comboboxes and allergy override justification, e-Prescriptions ledger with cancel reason, and FormularyTab in AccessControlView. 0 TS errors, 0 lint warnings, 0 emojis. |
| `ca820ff` | `feat(patient-portal): implement outpatient portal, pure scheduling engine, and in-app notifications (M7)` | User requested: "TASK: M7, Patient portal: appointments, doctor availability, notifications. Prerequisites: M1 to M6 merged. Branch: m7-patient-portal...". Implemented pure scheduling engine (src/lib/scheduling.ts) with 30-minute slots, 8am-6pm operating hours, 14-day booking horizon, buffer rules, and doctor availability integration. Built in-app notification center for booking, rescheduling, cancellations, and doctor leaves. Updated PatientView with Personal Health Hub, Appointment Booking Modal, and Cancel modal. 0 TS errors, 0 lint warnings, 0 emojis. |
| `dd472e4` | `feat(billing): implement billing workstation, payments engine, receipts, and minor unit calculations (M6)` | User requested: "TASK: M6, Billing and payments. Prerequisites: M1 to M5 merged. Branch: m6-billing...". Implemented minor-unit billing engine (src/lib/billing.ts) with pure functions. Built BillingView with Invoices and Payments tabs, collections summary, and 10-per-page Pagination. Automated invoice creation on visit conclusion using doctor's consultation fee. Receptionist outstanding balance alert on check-in. Simulated patient portal payment flow producing official printable receipts. Complete test suite in scripts/test-billing.ts (10 test groups; 100% passing). 0 TS errors, 0 lint warnings, 0 emojis. |
| `e0e3624` | `feat(persistence): implement sign-up, browser storage repository, and data persistence (M5)` | User requested: "TASK: M5, Sign-up and data persistence (browser storage, demo build)...". Implemented complete asynchronous Repository layer (BrowserRepository with versioned keys, debounced writes, and quota error handling; MemoryRepository for tests/in-memory mode). Added schema versioning (SCHEMA_VERSION = 1), empty-state seeding, and corrupted storage recovery fallback. Built cryptographic authentication service in src/lib/auth.ts using Web Crypto PBKDF2-SHA256 with 16-byte random salts, 100,000 iterations, 10-character password policy, 5-attempt lockout for 5 minutes, and session lifecycle tracking (8h standard, 7d remember, 30m inactivity auto-logout). Created patient self-registration with duplicate detection creating account link claim requests held in pending state, and receptionist workstation Account Link Requests table on Intake Registry tab with Approve/Reject actions and Security Ledger logging. Added staff sign-up (Doctor or Receptionist; Admin prohibited) creating pending applications in pendingApprovals for administrator review and default module assignment. Controlled login demo directory and autofill helpers via VITE_DEMO_MODE environment variable. Built Administrative Data Management tab in AccessControlView gated by administrativeAccess featuring storage telemetry, mode switching ('Save in browser' vs 'Do not save'), structured JSON backup export (cms-backup-YYYY-MM-DD.json), import with RESTORE confirmation and undo snapshot, and demo reset with RESET confirmation. Full automated test suite in scripts/test-storage.ts (51 tests; all 6 test suites passing 100% with 228 total tests). 0 TypeScript errors, 0 lint warnings, 0 emojis across codebase and logs. Responsive verification screenshots captured at 1920x1080 and 360x800 in docs/responsive-check/. |
| `8da8904` | `feat(reception): implement reception workstation and patient intake flows (M4)` | User requested: "TASK: M4, Reception workstation. Prerequisites: M1 to M3 merged...". Built reception workstation with 4 tabs (Waiting Lounge, Appointments, Patient Directory, Intake Registry). Enforced demographics-only intake and scoping (zero clinical fields, allergies, conditions, vitals, or blood group at reception). Implemented three arrival flows: Flow A (new walk-in with demographics registration, available doctor assignment, and immediate check-in), Flow B (registered walk-in locked to assigned physician with doctor availability validation and admin reassignment notice), and Flow C (booked appointment check-in with doctor availability verification). Implemented daily unique token numbering resetting to 1 each day. Added intake metadata tracking (source: walk_in, reception, web; checkedInAt, checkedInBy, registeredAt, registeredBy). Wired permission guards via hasCapability across registerPatient, checkInAppointment, checkInWalkIn, and bookAppointment. Shared Table with stackBelow="lg" and 10-per-page Pagination across all workstation views. Comprehensive automated test suite in scripts/test-reception.ts with 45 unit tests. 0 TypeScript errors, 0 lint warnings, 0 emojis; 12 responsive verification screenshots captured at 1920x1080, 768x1024, and 360x800. |
| `3227772` | `feat(attendance): implement staff time, attendance, and leave management (M3)` | User requested: "TASK: M3, Attendance and Leave (staff Time and Attendance). Prerequisites: M1, M1.5, M1.6, M1.7 and M2 are merged. Branch: m3-attendance...". Built full staff time and attendance engine in src/lib/attendance.ts (clock-in, clock-out, hours worked, late and early minutes, missing clock-out, sheet code resolution, leave validation, decisions, record correction, shift setting, and monthly summary with pure now parameters). Added attendanceManagement access to accessCatalog.ts and mod-admin. Created AttendanceContext with sessionStorage persistence, permission checks, and Security Ledger logging (leave_approved, leave_rejected, attendance_record_corrected, shift_updated, attendance_clock_in_override). Seeded 14 rolling days of realistic attendance, 1 approved leave, 1 pending leave, and baseline physician/receptionist shifts. Implemented isDoctorAvailable in src/lib/availability.ts and integrated into DoctorView Transfer Care modal with availability checks, plain text messages ("Doctor is not available today", "No doctors available"), and disabled transfer submit when unavailable. Created AttendanceView with 5 tabs (My Attendance for all staff, and Today, Attendance Sheet with plain-text attendance-YYYY-MM.csv export, Leave Requests with mandatory rejection notes and self-decision guards, and Shifts with shift editor modal). Added Attendance nav item to Sidebar for staff accounts. Automated test suite in scripts/test-attendance.ts added to npm test (42 new tests; total 177 tests passing 100%). Zero emojis found across codebase; production build passes with 0 TS errors and 0 lint warnings; responsive verification screenshots captured at 1920x1080 and 360x800. |
| `2ffbbd0` | `feat(responsive): implement M1.7 responsive fixes and style alignment` | User requested: "TASK: M1.7, Responsive fixes and style alignment. Do not change behavior or permissions, except the read bug in item 5. Branch: m1-7-fixes...". Upgraded shared Table with stackBelow="lg" on tables with > 5 columns (Patients, e-Prescriptions, Reception tables, Edit Users, Security Ledger, Approvals, Roles, Worklist), sticky right-aligned action column, and no nested outline box. Subtitle hidden below 640px; removed dotted scroll widget from administrative tabs. Fixed patient portal selector so patients view all their prescriptions (evaluating patient role prior to staff capability checks) with cleanId matching. Renamed Edit Users role filter to "All staff types", removed Roles instruction text, and deduplicated Department line. Dashboard summary figures aligned to a single outlined card with clean 4-col/2-col grid without boxes or monospace digits, and non-mono chart axes. Receptionist visual cleanup: removed stat cards, added counts to headers, underline tab styling, no status dots or monospace, single primary Walk-in Check-In button, and outline secondary buttons. Patient Portal visual cleanup: moved name/MRN into Personal Record, removed subtitles, replaced tinted boxes with plain label/value rows, removed status dots and monospace vitals. Login: credentials directory bundled and rendered exclusively when import.meta.env.DEV is true. Patient Summary: added Last Visit, Last Visit Vitals, Last Reason, Consulting Doctor, Chronic Conditions, and Current Medications with fallback to "None recorded". All test suites pass (135 tests); 0 TypeScript errors; 0 lint warnings; 0 emojis; 44 responsive screenshots updated at 360x800, 768x1024, 1024x768, and 1920x1080 with 0 horizontal overflow. |
| `040b651` | `feat(ui): make all dropdown options universally typeable and searchable` | User requested: "anywhere there is a drop down option i want there to be the ability to type also there". Upgraded the universal design-system Select component (src/components/ui/Select.tsx) to default searchable={true} with direct trigger input typing, real-time label/value filtering, clear query button, and complete keyboard navigation (ArrowDown, ArrowUp, Enter to select, Escape to cancel, Tab to cycle focus). Converted custom priority queue dropdown in ReceptionistView.tsx to the standard Select component. Verified that every dropdown in the application across all roles (Dashboard, Physician worklist, Doctor selection, Patient portal, Reception, and Administration) supports direct typing, instant search, and keyboard control. 0 TypeScript compiler errors; 112 unit tests pass; 0 emojis found. |
| `be117a9` | `feat(doctor): display comprehensive last visit details in patient summary card` | User requested: "i want the last visit details of the paitents to be shown in the patient summary itself". Enhanced Patient Summary card in DoctorView to display comprehensive Last Visit details: previous visit date, previous triage vitals (systolic/diastolic BP, heart rate, SpO2, temperature), last reason for visit, and consulting physician derived from completed appointments and patient medical records. Updated summaryPatient resolution to stay synchronized with active desk selections. Zero emojis; 0 TypeScript errors; 112 unit tests pass. |
| `879ebd5` | `docs(responsive): complete M1.6 responsive verification audit across 11 screens and 3 breakpoints` | User requested: "Run npm run build (0 TypeScript errors, 0 lint warnings), npm test, and the emoji scan. For each screen as the role that uses it, take screenshots at 360x800, 768x1024 and 1920x1080 into docs/responsive-check/ and list any remaining issues. Check that no screen scrolls sideways and nothing is cut off. Add a changelog entry, make one local commit, and report the files changed and any issue found." Completed automated CDP responsive layout and horizontal overflow audit using headless Edge across all 11 workstation screens (Login, MD Dashboard, Admin Roles, Admin Edit Users/Access Console, Doctor Consultation Desk, Doctor Patients Worklist, Doctor e-Prescriptions, Reception Waiting Lounge, Reception Check-In Directory, Reception Booking Calendar, Patient Portal) across 7 viewport widths (320px, 360px, 480px, 768px, 1024px, 1280px, 1920px). Confirmed zero horizontal scroll overflow (scrollWidth <= clientWidth) across all screens. Updated full screenshot suite in docs/responsive-check/ at 360x800, 768x1024, and 1920x1080. Build passes with 0 TS errors and 0 lint warnings; test suite passes with 112 unit tests and 0 emojis. |
| `b8e381f` | `feat(dashboard): render summary figures as individual card blocks across all roles` | User requested: "make each as a seperate block and do the changes accordingly everythwere". Refactored role-aware Dashboard summary metrics from a single outer card into individual distinct Card blocks with rounded-xl borders and responsive grid (grid-cols-2 lg:grid-cols-4). Standardized personal record information cards in PatientView.tsx to rounded-xl. |
| `273f019` | `feat(ui): unify combobox search directly into select trigger across forms and modals` | User requested: "and here instead of there being a drop down below the option make it with the select staff and change at places accordingly". Refactored Select.tsx searchable combobox pattern so the primary trigger input itself serves as the search query field when open, eliminating redundant nested search bars inside dropdown menus. Removed placeholder option rows across assignment modals in AccessControlView.tsx. |
| `6d93172` | `style(ui): standardize rounded-xl borders across select triggers and form controls` | User requested: "make this also round edges and make sure it is followed everywhere". Standardized rounded corners to rounded-xl across custom dropdown triggers in Select.tsx (using dedicated trigger size classes preserving rounded-xl across small and large sizes), InteractiveSearchBar.tsx, Input.tsx, DatePicker.tsx, Textarea.tsx, and global control styles in index.css. |
| `bdf8595` | `feat(access): add custom access privilege creation across roles directory and modals` | User requested: "let there also be an option to add new access's also". Extended StandardCapability union and AccessCatalog with dynamic privilege creation and session persistence (cms_custom_accesses_v1). Added createAccess action and accessCatalog to ClinicContext. Integrated "Add New Access" action button in the Roles table header, in the Create Role modal access section, and in the Configure Role panel accesses card. Created Create New Access Privilege modal with name validation, description input, duplicate checking, audit logging, and automatic selection/inclusion in active roles upon creation. Build passes with 0 TS errors; 112 unit tests pass; 0 emojis found. |
| `d0066f6` | `feat(access): remove duplicate create role button and allow direct access assignment upon role creation` | User requested: "there are 2 create role please remove the one near the search bar and while giving an option to create role make it such that they can also give the respective access there itself insteaad of having to go all the way to configure role panel let them be able to add the access there itself and later if they want they can edit the access via the configure role panel". Removed the redundant Create Role action button from the search toolbar row, preserving the single primary Create Role action in the Roles table card header. Enhanced Create Role modal with an access assignment section displaying all cataloged system capabilities with checkboxes, Select All / Clear shortcuts, automated dependency synchronization (auto-coupling EMR Records Access with Prescription Authoring), and helper notes. Updated ClinicContext createModule to support initialAccessIds with validation and persistence. Build passes with 0 TS errors; 112 unit tests pass; 0 emojis found. |
| `1f6607f` | `feat(ui): enlarge selection modals and add searchable select menus across role assignments` | User requested: "increase the size of this and allow it to be searched also do the same for when assigning roles also directly anywhwere whree such an option isplease fix it". Enlarged Add Person to Role and Assign Role modals in AccessControlView, Directly Provision modal, Transfer / Assign Care modal in DoctorView, and Book Consultation modal in ReceptionistView to maxWidth="lg" / "xl" with overflowVisible={true} and bodyClassName="min-h-[280px]" to permanently eliminate dropdown popover clipping. Added size="lg", sticky instant search input (searchable={true}), label/value filtering, auto-focus, keyboard navigation, and custom search placeholders across all role and care assignment selection menus. Build passes with 0 TS errors; 112 unit tests pass; 0 emojis found. |
| `4f45626` | `fix(tables): distribute proportional column widths and eliminate cell voids across all workstations` | User requested: "resize the data in the table like cell width and evreything to fill up the gaps and do the same for any such tables". Distributed proportional percentage column widths across all workstations (Dashboard, Physician worklist, Patients directory, e-Prescriptions, Access Control modules, approvals, staff directory, security ledger, Reception waiting lounge, check-in directory, and Patient portal). Eliminated horizontal voids and awkward cell wraps while maintaining responsive column stacking below 768px (`md`). Build and tests pass 100%. |
| `f12c268` | `feat(responsive): complete mobile and tablet responsive screen pass across all workstations (M1.6)` | User requested: "TASK: M1.6, Responsive screen pass. Prerequisite: M1.5 is merged. Adapt every existing screen to work from 360px to 1920px using the shared components from M1.5. Branch: m1-6-screens." Adapted all application screens and portals to support viewports from 320px to 1920px with zero horizontal scroll and full touch accessibility. Enhanced Table with stackBelow and hideBelow column support. Enhanced Modal with fullScreenOnMobile. Dashboard: 4 summary cols -> 2 cols on phones; charts stack below 1024px with wrapping legends and alternating mobile ticks; lists use Table stack mode. Physician Consultation Desk: reordered Active Consultation first, Patient Summary second, and Worklist third on screens under 1024px; vitals grid collapses 5 -> 3 -> 2 cols; action row wraps with full-width buttons on phones and Conclude Visit placed last; Worklist, Patients, and e-Prescriptions use Table stack mode with low-priority columns hidden on mobile; prescription View modal opens full screen on phones. Administrative: tab bar scrolls horizontally; direct provision form collapses to single column; Roles, Edit Users, Approvals, and Security Ledger use Table stack mode; Access Console action buttons wrap and close X remains reachable. Reception: converted Waiting Lounge, Patient Check-In directory, and Intake Registry to Table stack mode; transformed Consultation Booking on phones into a day-by-day agenda list with design-system DatePicker at top; refreshed StatCard padding and responsive layout for 2-column mobile KPI cards. Patient Portal: dedicated stacked sections (Personal Record, Prescriptions, Invoices) with full-width 44px payment buttons. Login: single-column layout with 44px touch targets, labels above inputs, and stacked role credentials directory. Captured 33 responsive verification screenshots at 360x800, 768x1024, and 1920x1080 into docs/responsive-check/. Automated CDP audit confirmed 0 horizontal scroll overflow down to 320px. Build passes with 0 TS errors and 0 lint warnings; test suite passes with 76 permission tests, 36 dashboard metrics tests, and 0 emojis. |
| `7810b42` | `style(access): revert selection menu container width to standard layout` | User requested: "can you revert the 4th change done above back to normal the expanded selection to 70% width". Restored standard clean container width on the role selection menu in AccessControlView while preserving instant search and dropdown capabilities. |
| `f4771da` | `feat(access): rename modules to roles, reposition tab, and add 70% search and dropdown selection menu` | User requested: "rename module as Roles,replace its postition with add new users, and the selection menu should haveboth drop down and search option so make the changes according, and increase the size of the selection menu to fit 70%of the webapp page". Renamed module to Roles, repositioned tab before Add New Users, and added searchable select menu. |
| `6a83945` | `feat(auth): implement access modules, capability bundling, and module management UI (M2)` | User requested: "TASK: M2, Modules. Replace per-person capability toggles with modules: named bundles of accesses that an admin can add people to." Replaced per-person capability switchboard with access modules model. Created fixed catalog of 8 capabilities (src/data/accessCatalog.ts). Seeded initial system modules (Clinical, Front Desk, Administration) and mapped staff records in mockData.ts. Implemented getEffectiveAccesses union resolution with doctor license check on prescriptionAuthoring, single source of truth for admin via Administration membership, and handler guards (canDeleteModule, canIncludeAccess, canRemoveAccess, canAddMember, canRemoveMember, canDeleteStaff, canGrantAdmin, canRevokeAdmin). Hardened ClinicContext with module state persistence (cms_modules_v2) and mutation handlers. Updated AuthContext dynamic capability resolution and single sidebar navigation mapping. Replaced capability switchboard in AccessControlView with Modules tab, isolated Module View (accesses matrix, member directory, name-typing delete modal, reason-gated admin promotion), updated Edit Users tab with comma-separated modules, Access Console with module membership and effective accesses source attribution, and auto default-module assignment on direct provisioning and onboarding clearance. Filtered staff migration equivalence check in test suite (100% equivalence, 0 exceptions). Built test suite with 76 permission tests, 36 dashboard metrics tests, and 0 emojis. Production build passes with 0 errors and 0 warnings. |
| `a358bee` | `feat(auth): verify permissions architecture, selector scoping, and test integrity` | User requested: "TASK: Step 1b. Verify and finish the Step 1 permissions work. Do not build new features." Created src/lib/selectors.ts for pure role-scoped filtering (getScopedPatients, getScopedAppointments, getScopedPrescriptions, getScopedInvoices, getDoctorPatients). Eliminated all inline patient filtering across DoctorView, ReceptionistView, PatientView, DashboardView, and AccessControlView. Enforced single source of truth for admin in permissions.ts and dashboardMetrics.ts: admin = original MD or active doctor holding administrativeAccess / perm-admin. Hardened ClinicContext (transferPatient, addPatient, updateAppointmentStatus) and AuthContext (grantStaffAccess, revokeStaffAccess, deleteStaffAccount, updateStaffCapabilities) handlers with permissions checks. Hardened transfer edge cases: blocked transfer while in consultation with message "Conclude the current consultation before transferring.", moved only scheduled and checked_in appointments recording count and IDs in Security Ledger, enforced active receiving doctor with consultationWorkstation capability, and configured "Assign" modal/action for unassigned patient pat-16 (Rachel Green). Converted test suites to real TypeScript imports using tsx (scripts/test-permissions.ts and scripts/test-dashboard-metrics.ts), added Unicode emoji scanner (scripts/scan-emojis.ts), and configured npm test running all three suites (77 tests passed, 0 failures, 0 emojis). Build passes with zero errors and zero warnings. |
| `dae42e3` | `feat(auth): implement permissions foundation, patient assignment transfer, and admin promotion` | User requested: "TASK: Step 1 of the role and workflow rebuild: permissions foundation, patient assignment and transfer, admin promotion." Discovery completed auditing role checks, registration/check-in points, patient reads, and seeded patient assignments (including Sophia Chen transfer history and unassigned patient Rachel Green pat-16). Added Section 2.11 to specification. Created pure permissions module (src/lib/permissions.ts) with 42 unit tests (scripts/test-permissions.js) passing 100%. Implemented PatientAssignment model with INITIAL_PATIENT_ASSIGNMENTS in mockData.ts, ClinicContext transferPatient action, and AuthContext dynamic capabilities. Scoped patient and prescription data reads in DoctorView and DashboardView. Removed registration/check-in from doctors and MD, disabled Start Consultation on scheduled appointments with "Patient has not been checked in" tooltip, and added transfer care modal and assigned doctor column in DoctorView Patients tab. Built admin promotion in AccessControlView with perm-admin capability, protection guards preventing revocation or deletion of original MD and last remaining admin, immediate sidebar removal on admin revocation, and receptionist capabilities display (Patient Registration, Patient Check-in, Payment Recording). Build passes with zero errors. |
| `51e5c7c` | `feat: add role-aware dashboard as default landing page with seed history and svg charts` | User requested: "Build a role-aware Dashboard as the front page (landing page after login) of the Clinic Management System. Borrow the layout idea only (greeting, summary figures, two charts, three lists); do not copy any third-party styling or assets. Frontend-first with seed data." Implemented pure aggregation layer in src/lib/dashboardMetrics.ts with 37 unit tests covering presets, day/week bucketing, and role scoping. Extended mockData with 30-day historical seed data (appointments, visits, invoices, and patients). Role-scoped summary figures: MD (8 figures with revenue), Staff Doctor (5 figures, isolated to own visits), Receptionist (4 figures, front desk only), Patient (3 figures). Rendered exactly ONE outlined summary card in 4-column responsive grid without icons or colored numbers. Built inline SVG charts for MD & Staff Doctor (Patients & Visits grouped bars with hatch pattern; Fees & Payments line chart with dashed collected series; Visits trend line) with Day/Week/Month underline tabs, static gridlines, and screen-reader accessibility tables. Built 3 role-scoped semantic Table list cards (Today's Appointments, Follow-ups Due, Pending Clearances / Upcoming Appointments / Recent Prescriptions) with 10-records-per-page Pagination. Configured Dashboard as top item in Sidebar for every role and default landing page upon login and clinic brand click. |
| `ae1a4f7` | `style: replace person cards with shared table and align Edit Users tab with design system` | User requested: "Fix 9 on the Administrative module, Edit Users tab". Aligned Clearance Governance bar with Physician Queue Inspector layout, removing instruction sentence, setting search placeholder to "Search by name or ID" (filtering name, badge ID, and MRN with instant page 1 reset), and defaulting role filter dropdown to "All roles". Cleaned role section cards (Doctor / Physician Access, Receptionist Workstation, Patient Portal Access) by removing explanatory subtitles, preserving titles and "N Personnel" counts, and converting "Directly Add Doctor" and "Directly Add Receptionist" buttons to standard outline variant. Replaced person card grids with shared semantic Table component matching Physician module: Doctors and Receptionists columns (Name with bold text and muted title, Department with muted specialization second line, ID, Status, Permissions, Actions); Patients columns (Name bold, MRN, Status, Permissions, Actions, removing redundant portal and outpatient labels). Rendered Status as plain text ("Active", "Revoked") without colored dots, and Permissions as plain text ("4 of 4 granted", "5 of 5 granted"). Removed avatar initial squares, role color tints, green dots, and all monospace text. Configured "Manage Access" as compact outline button with persona-specific aria-label, preserving original handler and focus restoration to opener. Added 10-per-page Pagination (hidden at 10 or fewer items), hiding sections with no matches, and displaying plain-text "No personnel found" empty state when zero matches exist across all sections. Completed data check reporting clinic-wide scope of Patient Portal Access and separate identities of David Kim (receptionist vs outpatient). |
| `bf56822` | `style: align search bar layout, deduplicate patient conditions, and clean worklist edges` | User requested: "Fix 7b on DoctorView.tsx and the seed data". Flush-aligned the search bar's left edge with the table's left edge (`leftEdgeDiff: 0`) on Patients and e-Prescriptions tabs, with consistent 14px vertical spacing between card header, search bar, and table header. Removed Eleanor Wright's duplicate condition ('Essential Hypertension') from `INITIAL_PATIENTS` in `mockData.ts` while preserving 'Mild Hypertension'. Added `deduplicateList` helper to normalize and deduplicate chronic conditions, allergies, and current medications across `DoctorView.tsx`. Cleaned worklist table cell borders by removing `border-l-2` from the `#` column while maintaining row-level in-consultation background highlight. |
| `cdeb2e2` | `style: align Administrative header, tabs, direct provision card, and approvals table with design system` | User requested: "Fix 8 on the Administrative module (page header, tab row, and the Add New Users tab, including the approvals section)". Removed gradient banner, eyebrow text "Supreme Administrative Authority", and "MD Non-Revocable Authority" label from page header, retaining only the page title "Administrative & Security Governance" matching the Physician page title style. Converted tab row to plain-text underline tabs matching Physician tabs with 2px static accent underline sitting on the bottom border (`border-b-2 border-teal-600 -mb-px`), plain-text counts without amber or monospace ("Add New Users (2 pending)", "Edit Users (13)", "Security Ledger (4)"), and static keyboard-only 1px outline without mouse-click focus rings. Redesigned Directly Provision Staff Member form card: removed title icon and subtitle, normalized row gaps by eliminating stray horizontal line, added required markers (`*`) on Full Name and Department, removed boxed notice and teal dot, placed right-aligned unboxed Provision & Grant Clearance button disabled until valid, implemented inline plain-text validation with touch tracking, duplicate Badge ID check ("Badge ID already in use"), numeric fee without spinner arrows, and Modal confirmation dialog before account provisioning. Converted Onboarding & Role Clearance Approvals section from boxed rows to shared semantic Table (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`) with 7 columns: Applicant (bold name, muted title second line), Role ("Doctor" or "Receptionist"), Department (specialization as muted second line where present), Badge ID (standard font, no monospace), Applied (standard font, no monospace), Notes (2-line clamp with full text in title attribute, plain text, no italics), and Actions (compact outline Approve and Reject buttons of equal size with applicant aria-labels). Added Modal confirm dialogs for Approve and Reject (with optional reason input), plain-text "No pending clearances" empty state, and 10-per-page Pagination (hidden when 10 or fewer). Updated `src/components/ui/Input.tsx` to accept `React.ReactNode` labels. |
| `09ac528` | `style: cross-tab cleanup, accessibility audit, and data restorations` | User requested: "Fix 7 on DoctorView.tsx and shared components". Made Complaint column take all remaining table width (`w-full`) with 2-line clamp and title tooltip, and rendered queue numbers as "1", "2", "3" without "#" prefix. Updated navigation tabs to 2px static accent underline sitting on the tab row's bottom line (`border-b-2 border-teal-600 -mb-px`) with inactive tabs showing no underline across Consultation Desk, Patients, and e-Prescriptions. Aligned search bar left edge with table left edge (`px-4`) and matched Queue Inspector vertical spacing (`py-3.5`) on Patients and e-Prescriptions tabs. Removed Previous Visit Vitals row and its recorded date line from Patient Summary card, keeping Last Visit, Chronic Conditions, Current Medications, and muted "Last visit:" helper text under vitals inputs. Restored Arthur Pendleton (`pat-4`) chronic conditions to Coronary Artery Disease, Osteoarthritis, and Dyslipidemia, and restored Eleanor Wright (`pat-1`) chronic conditions to Mild Hypertension and Essential Hypertension. Reported Eleanor Wright visit date (`12 Aug 2026`) vs prescription date (`2026-10-13`) data check. Added unit test in `scripts/test-vitals-markers.js` confirming systolic 160 -> High, heart rate 50 -> Low, normal values -> no marker. Added aria-label and title to all sidebar icons, added Expand sidebar / Collapse sidebar to toggle button, and updated muted text contrast tokens to achieve >= 4.5:1 ratio across themes. Audited shared components for residual pill styles, glows, transitions, or monospace fonts. Updated Section 2.8 with card outline clarification, no-bubble, and no-flashing-focus rules. |
| `0cdeadc` | `style: add prescription search, format regimen, and add view details modal` | User requested: "Fix 6 on DoctorView.tsx (e-Prescriptions tab)". Removed subtitle under e-Prescription Master Ledger while adding right-aligned prescription count text. Added left-aligned InteractiveSearchBar inside the card directly above the table with "Search prescriptions" placeholder, filtering by patient name, RX number, diagnosis, and drug name, and resetting to page 1 on every search query change. Standardized fonts for RX number (regular weight, no monospace) and issue date (ISO format, no monospace). Formatted prescribed regimens with bold drug names and comma-separated dose and frequency in muted styling without wrapping parentheses. Added an Actions column with compact outline "View" button with RX-specific aria-label, opening an accessible modal displaying RX number, issue date, patient name and MRN, allergies, diagnosis, issuing doctor, and full regimen with a Close button only. Reported data audit regarding Sophia Chen's prescription attribution in mockData.ts. |
| `3eba6db` | `style: extract Table component, add patient search, and polish Patients directory` | User requested: "Fix 5 on DoctorView.tsx (Patients tab)". Removed subtitle under Patients Medical Directory while preserving patient count indicator. Added left-aligned InteractiveSearchBar inside the card directly above the table with "Search patients" placeholder, filtering by patient name, MRN, and phone, and resetting to page 1 on every search change. Extracted worklist table header style, row height, padding, and no-hover behavior into shared design-system components under src/components/ui/Table.tsx and reused across the consultation worklist, Patients directory, and e-Prescriptions master ledger. Normalized MRN and phone fonts to standard font and weight (no monospace, no bold), retained bold patient names with muted email subline, cleaned allergy badges to plain text without red dots matching chronic conditions ("None recorded" fallback), styled Admit to Desk and Prescribe buttons in outline style with patient-specific aria-labels, and added "No patients found" empty state. |
| `21582b5` | `style: convert worklist to fixed table layout and replace physician profile with patient summary` | User requested: "Fix 3b and Fix 4 on DoctorView.tsx (Consultation Desk tab)". Converted consultation worklist table headers to non-wrapping with shortened labels ("#" and "Appt ID"), established fixed column widths with flexible complaint column, right-aligned compact outline action buttons, and ensured only active tab has a static thin underline with inactive tabs having no underline. Replaced the Consulting Physician Profile card in the right column with a Patient Summary card displaying Last Visit date, Chronic Conditions, Current Medications (from active prescriptions), and Previous Visit Vitals with recorded timestamp, falling back to "None recorded" or "No active consultation". Seeded previous vitals for Eleanor Wright, James Miller, and Arthur Pendleton. Added muted previous vitals reference under Active Consultation vitals fields ("Last visit: ...") and added plain-text clinical reference markers ("High" / "Low") next to vitals labels outside normal display ranges. Preserved physician credentials in Access Control, session bars, and reception booking. |
| `efd9d3c` | `style: convert consultation worklist to semantic table and clean up leftovers` | User requested: "Fix 3 on DoctorView.tsx". Converted consultation worklist from stacked card rows into a semantic table (table, thead, tbody, th scope="col") with columns (Queue (#), Time, Patient, Appointment ID, Complaint with 2-line clamp and title tooltip, Status as plain text without dots, Actions). Renamed buttons to View File and Start Consultation using uniform outline styling with aria-labels, rendered Current patient as plain text for the active in-consultation patient, eliminated tab row overflow scroll widget, removed repeated role in doctor filter dropdown, and normalized empty section spacing between Save Vitals and action row. |
| `9b83520` | `style: redesign active consultation desk layout and interaction` | User requested: "Fix 2 on DoctorView.tsx". Redesigned Active Consultation card layout and interaction: removed action buttons from header, converted allergy warning to plain text with inline Edit/Add and Save/Cancel handling, unboxed chief complaint into plain text lines, removed monospace from vitals, enforced plausible numeric range validation with inline error text disabling Save Vitals, moved Save Vitals below inputs with static "Vitals saved" notification, added bottom right-aligned action row (Record Notes, Prescribe, Conclude Visit) with uniform button heights, added Conclude Visit confirmation modal warning of unsaved vitals changes, and rendered plain-text patient allergies at top of prescribe modal. |
| `978327a` | `style: polish DoctorView tabs, worklist metadata, and physician profile layout` | User requested: "Fix 1b on DoctorView.tsx". Widen search bar with Search patients placeholder, converted tabs to plain text with static thin underline, rendered worklist metadata as plain text without colored dots, rendered Viewing state as plain text, removed inspector dot, and flattened physician profile card boxes into clean plain text rows. |
| `e89a1c4` | `Remove stat cards and subtitles from Doctor Consultation Desk and fix search placeholder` | User requested: "Fix 1 of the Doctor Consultation Desk page (DoctorView.tsx)". Purged 4-card metric row from Doctor Consultation Desk, stripped explanatory subtitles under Consulting Physician Profile and Worklist, removed instruction sentence from MD Clinical Queue Inspector, and expanded search bar width with complete placeholder. |
| `85df7e5` | `style: replace native html5 form validation bubbles with custom design system ui` | User requested: "make this to the custom ui we are using dont just use the native". Replaced browser-native validation bubbles with design system UI, added form-level noValidate, and added global invalid event listener. |
| `03f78f7` | `style: remove managing director console heading across views` | User requested: "remove the managing director console heading". Stripped managing director console heading across workstation views. |
| `051358c` | `style: eliminate bubble and badge enclosures across all views in favor of clean typography` | User requested: "remove the bubble like structure from everywhere". Eliminated bubble-like structures and badge enclosures across views. |
| `8cd4be1` | `Remove visual tab and enter pill from search bar while preserving keyboard autofill` | User requested: "remove the small dialoge box with tab or enter also". Stripped visual pill button element from `InteractiveSearchBar.tsx` while keeping keyboard autofill. |
| `852a2f8` | `Add inline Tab and Enter autofill to search bar without popup dialogue box` | User requested: "and make it such that it autofill when clicked on either tab or enter and remove the symbol saying autofil". Implemented inline ghost completion and pure keyboard completion. |
| `c0fa0fe` | `Remove suggestion dropdown dialogue box from interactive search bar` | User requested: "for the search interactive option remove that dialoge box". Removed suggestion dropdown menu from `InteractiveSearchBar.tsx`. |
| `e155bfe` | `Remove metric stat cards row from Patient Directory view` | User requested: "remove these also" (referring to Patient Directory StatCard row). Removed the 4-card KPI metric grid and unused imports. |
| `1ca4c81` | `Remove workstation header subtitles across all module views` | User requested: "remove the subtitle there and remove it in all places accordingly". Stripped descriptive `<p>` subtitles across all views. |
| `56f8aaf` | `Add second receptionist David Kim to credentials, access control directory, and reception desk roster` | User requested: "add another receptionist". Added David Kim (`receptionist2`, `REC-302`), updated credentials table, access control, and duty roster. |
| `1634459` | `Remove clinic overview and supplies inventory modules for small outpatient clinic profile` | User requested: "remove the clinic overview and supply and inventory modules my clinic is soo small it cannot provide medicines so remove the modules and data accordingly". Purged all inventory types, data, and views. |
| `0109085` | `Implement 10-records-per-page pagination across all data tables` | User requested: "for the tables accross my project i want to make it such that they can display only 10 data at a time and extra data will go to next page and the user can switch between pages". Created `Pagination.tsx` and updated all tables. |
| `2dedaad` | `Redesign Patient Directory into executive console modeled on AccessControlView` | Aligned Patient Directory with clean executive console architecture, table view, and 10-record pagination. |
| `1225883` | `Remove Weekly Schedule and e-Prescriptions Dispense Status` | Removed outpatient dispensing tracking and weekly schedules to match small clinic reality. |
| `e47cde4` | `Convert allergy warning to editable control with context persistence` | Enabled doctors to edit, add, and remove allergy warnings inline with state persistence. |
| `c61ac06` | `Fix alignment and overflow in MD Clinical Queue Inspector bar` | Fixed layout and horizontal alignment in supervisory queue inspector. |
| `3953116` | `Enforce typing-only name search, MD view-only reception desk, and expanded queue inspector` | Improved search behavior and reinforced supervisory read-only permissions for MD inspecting other desks. |
| `e2a00fe` | `refactor(doctor): relocate MD queue inspector below active desk and make triage clearance view-only` | Positioned MD queue inspector below active desk and removed interactive buttons in read-only inspection. |
| `6fe6242` | `feat(ui): add InteractiveSearchBar with autofill suggestions and dropdown across all modules` | Introduced unified search bar component across Doctor, Receptionist, Patient, Administrative, and Billing views. |
| `6089193` | `fix(navbar): remove search option from top nav bar` | Removed global top navbar search to avoid clutter and delegate search to module-specific toolbars. |
| `94760c9` | `style: remove number input increment and decrement arrow marks` | Applied Tailwind utilities to remove up/down spinner arrows on all number inputs. |
| `517cae6` | `feat(doctor): make consultation desk triage vitals editable input fields` | Converted static triage vital displays into editable input fields with Save Vitals action. |
| `10201d8` | `fix: remove explanatory callout boxes and clean up unused imports` | Removed verbose instructional banners and cleaned up dead code. |
| `13a07b8` | `fix(doctor): update tab and directory titles from Patient to Patients` | Standardized pluralization across navigation tabs and section titles. |
| `88ff895` | `fix(doctor): remove view only label boxes` | Stripped intrusive "View Only" badges from supervisory inspection screens. |
| `41fcb46` | `feat(doctor): make MD consultation desk view-only when inspecting other doctors` | Enforced strict supervisory isolation so MD does not accidentally alter colleague consultation state. |
| `6fcbecc` | `fix(doctor): remove write prescription buttons from header and ledger` | Consolidated prescription authoring strictly inside the active consultation desk card. |
| `8c07959` | `fix(doctor): update tab title from My Patients to Patient` | Polished tab typography. |
| `c3928ec` | `refactor(doctor): align MD clinical queue inspector with clearance governance` | Integrated queue inspection with MD clearance permissions. |
| `e096725` | `refactor(admin): apply no-clutter clearance governance to MD modules` | Cleaned up administrative clearance cards and streamlined user permissions. |
| `89fa565` | `feat: position search next to filter with equal authority, show role data first, and position onboarding clearance notification box downward` | Enhanced layout hierarchy in access control. |
| `493e09b` | `feat: position filter icon inside select box, eliminate secondary status filter, and display clearance data only upon role selection` | Streamlined filter controls in access control. |
| `93eee6c` | `feat: implement custom DatePicker and Select UI components, eliminate bubble badges and decorative icons, and assign patient authorities` | Replaced native selects and date inputs with custom UI components. |
| `d38b300` | `feat: isolate admin views per sidebar module, add role dropdown filter and delete account option in access control` | Added delete account capability and role isolation. |
| `c7705e1` | `feat: sort staff access control into 3 role modules (doc, receptionist, patient) with clickable names and delete account option` | Segmented staff directory into Doctor, Receptionist, and Patient modules. |
| `d4acfc1` | `feat: add MD role, staff doctor role with 3 patients each, and staff access control module with Option 1 work order` | Introduced MD (Managing Director) role and dual doctor setup. |
| `f56216f` | `feat: eliminate lab facilities and technician role, prioritize doctor navigation, and neutralize alert boxes with red dot indicators` | Decommissioned lab technician role and lab facilities for small clinic profile. |
| `e8bd1a4` | `feat: make doctor the clinic administrator, streamline to 4 operational roles, and enable multi-patient transition controls` | Consolidated clinic administration under chief doctor. |
| `3fd3a21` | `feat: streamline admin sidebar to single flat list of roles under Navigation Pane and incorporate role workstations with in-page navigation` | Reorganized sidebar navigation. |
| `ad393f1` | `feat: align doctor and receptionist modules with lab technician workstation architecture, enforce single doctor and receptionist scope, and standardize monochromatic palette` | Standardized layout design and component structure across all modules. |
| `6917813` | `feat(admin): redesign admin workstation matching lab technician architectural patterns, reactive feedback, and sub-module workstations` | Overhauled admin views. |
| `b164654` | `refactor: decommission nurse, pharmacy, accountancy roles and rename clinic admin to admin` | Purged hospital-scale roles for small outpatient practice. |
| `db8409a` | `feat(ui): set sidebar nav buttons to h-10 square and streamline settings modal to 2 lineless categories` | Standardized square sidebar buttons and settings layout. |
| `7e6c5b9` | `feat(settings,sidebar): shift sidebar to w-14 equalizing active box padding, unbox settings menu into categorized nested list with expanded clinical options` | Refined compact w-14 sidebar rail. |
| `f7fe3d4` | `feat(layout): apply Option C removing panel divider borders, header shadow, and matching background for seamless frameless design` | Implemented borderless seamless layout. |
| `6aed2b1` | `feat(ui): resize sidebar toggle icon, remove outer margin structure, and harmonize color palette to 3 colors max` | Harmonized design system palette to maximum 3 accent colors. |
| `931532c` | `feat: show isolated access console when user is selected in edit_users` | Provided focused individual clearance screen with back button. |
| `12f7fb2` | `feat: add 3 sorted sub-modules for Administrative: Add New Users, Edit Users, and Security Ledger` | Reorganized Administrative view into 3 distinct operational tabs. |
| `58c912d` | `rename: change Staff Access Control to Administrative in sidebar and view header` | Renamed module to "Administrative". |

---

## 4. SYSTEM ARCHITECTURE & FILE STRUCTURE

```
c:\Users\raadi\Downloads\CMS\
├── package.json                    # Project configuration, dependencies, and build scripts
├── tsconfig.json                   # Strict TypeScript compiler options with bundler resolution
├── tailwind.config.js              # Custom Tailwind configuration (colors, fonts, animations)
├── vite.config.ts                  # Vite build settings and '@/' path alias to 'src/'
├── index.html                      # Root HTML entry with Inter font
├── src/
│   ├── main.tsx                    # React DOM client entry point
│   ├── App.tsx                     # Root application container wrapping state providers
│   ├── index.css                   # Global Tailwind directives, scrollbar rules, spinner removal
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript domain models (User, Patient, Doctor, Vitals, Rx, Invoice, Access)
│   │
│   ├── data/
│   │   └── mockData.ts             # Realistic outpatient demo datasets, credentials, and audit logs
│   │
│   ├── context/
│   │   ├── AuthContext.tsx         # User authentication, role clearance, session state, 1-click switcher
│   │   ├── ClinicContext.tsx       # Domain CRUD state: patients, appointments, vitals, prescriptions, invoices
│   │   └── ThemeContext.tsx        # Dark / light theme management
│   │
│   ├── lib/
│   │   └── dashboardMetrics.ts     # Pure metric aggregation, role scoping, and date bucketing
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Main layout orchestrator (Navbar, Sidebar, dynamic view router)
│   │   │   ├── Navbar.tsx          # Top bar with clinic branding, active user info, notifications, settings
│   │   │   ├── Sidebar.tsx         # Collapsible w-14 rail / w-64 panel with role-based navigation links
│   │   │   └── RoleSwitcher.tsx    # 1-click development bar to toggle active role
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx          # Design-system button with variants (primary, secondary, outline, danger)
│   │       ├── Card.tsx            # Structural card components (Header, Title, Description, Content)
│   │       ├── Badge.tsx           # Status indicators with semantic color accents
│   │       ├── StatCard.tsx        # KPI metric cards with icons and trend badges
│   │       ├── Modal.tsx           # Accessible modal dialog with backdrop blur and escape key listener
│   │       ├── Input.tsx           # Clean input fields with label, error states, and number spinner suppression
│   │       ├── Select.tsx          # Custom design-system dropdown (replaces native select)
│   │       ├── DatePicker.tsx      # Custom design-system calendar picker (replaces native date input)
│   │       ├── InteractiveSearchBar.tsx # Clean search bar with inline ghost text and Tab/Enter keyboard autofill
│   │       ├── Pagination.tsx      # 10-records-per-page pagination component with page controls
│   │       ├── Table.tsx           # Shared design-system table components with non-wrapping headers and no-hover rows
│   │       └── Textarea.tsx        # Multiline text input for clinical notes and complaints
│   │
│   └── views/
│       ├── DashboardView.tsx       # Role-aware landing dashboard (summary card, SVG charts, paginated lists)
│       ├── LoginView.tsx           # Common login portal with credentials directory table
│       ├── DoctorView.tsx          # Doctor Consultation Desk, Queue Inspector, Vitals, Rx Authoring, Patient Directory
│       ├── ReceptionistView.tsx    # Waiting Lounge, Token Dispatch, Patient Check-In, Walk-In Registration
│       ├── PatientView.tsx         # Outpatient Portal (Appointments, Prescriptions, Diagnostic Reports, Invoices)
│       ├── AccessControlView.tsx   # Administrative Console (Add Users, Edit Users, Security Ledger)
│       ├── AdminView.tsx           # Billing & Financial Management (Invoice Ledger, Payment Settlements)
│       └── BillingView.tsx         # Billing Workstation (Invoices, Payments, Receipts, Collections)
```

---

## 5. USER ROLES & DEMO CREDENTIALS

The system defines 4 operational roles across 5 test personas:

| Role | Username | Password | Full Name | Title & Department | Responsibilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MD** (Managing Director) | `md` | `Doctor@123` | Dr. Marcus Vance | Managing Director & Chief Physician (Executive Clinic Governance) | Full supervisory authority, consultation desk, administrative access governance, revenue oversight. |
| **Doctor** (Staff Physician) | `doctor` | `Doctor@123` | Dr. Nathan Hayes | Staff Consulting Physician (General Medicine & Triage) | Outpatient consultations, vitals assessment, clinical history, e-prescription generation. |
| **Receptionist 1** (Lead Front Desk) | `receptionist` | `Reception@123` | Priya Sharma | Lead Front Desk Coordinator (Front Desk & Triage) | Patient check-in, token queue management, walk-in registration, doctor appointment booking. |
| **Receptionist 2** (Admissions Specialist) | `receptionist2` | `Reception@123` | David Kim | Front Desk Intake Specialist (Front Desk & Admissions) | Admissions, patient onboarding, token queue dispatch, intake records. |
| **Patient** (Outpatient) | `patient` | `Patient@123` | Eleanor Wright | Registered Outpatient (Patient Portal) | View personal appointments, electronic prescriptions, health records, and billing invoices. |

---

## 6. MODULE WORKSTATION SPECIFICATIONS

### 6.0 Role-Aware Landing Dashboard (`DashboardView.tsx`)
- **Default Landing Page**: Appears immediately upon login for all 4 roles and when clicking the clinic brand in the top navigation bar.
- **Header & Controls**: Dynamic greeting based on time of day ("Good morning/afternoon/evening, <name>") with zero subtitle paragraphs. Date range selector using custom `Select.tsx` with 4 presets (`Today`, `Last 7 days`, `This month` [default], `Last 30 days`). Outline quick action buttons scoped per role.
- **Summary Figures Card**: Exactly ONE outlined summary card displaying role-scoped metrics in a 4-column responsive grid (2-column on 1366x768). Large bold values with small muted labels underneath. No icons, no colored numbers.
  - MD: 8 figures (New Patients, Visits, Appointments, Missed Appointments, Billed, Collected, Outstanding, Pending Clearances).
  - Staff Doctor: 5 figures (New Patients, Visits, Appointments, Missed Appointments, Follow-ups Due). Zero billing figures.
  - Receptionist: 4 figures (Appointments Today, Checked In, New Registrations, Outstanding Payments). Zero clinical data.
  - Patient: 3 figures (Next Appointment, Active Prescriptions, Balance Due).
- **Inline SVG Charts Row**: Rendered for MD and Staff Doctor only. Zero animation on load or hover, low-contrast static gridlines, screen-reader accessibility tables and SVG `<title>` elements.
  - Card 1: "Patients and Visits" grouped bar chart with solid teal bars for New Patients and slate diagonal hatched bars for Visits (`url(#bar-hatch)`). Day / Week / Month tab switcher in Physician static underline style.
  - Card 2 (MD): "Fees and Payments" trend chart with solid teal line for Billed and dashed slate line (`strokeDasharray="5,4"`) for Collected. Day / Week / Month tab switcher.
  - Card 2 (Staff Doctor): "Visits" trend chart with solid teal line for doctor's own visits. Day / Week / Month tab switcher.
- **Semantic Tables Lists Row**:
  - MD: 3 cards (Today's Appointments, Follow-ups Due, Pending Clearances with "Review" action linking to Access Control).
  - Staff Doctor: 2 cards (Today's Appointments [own], Follow-ups Due [own]).
  - Receptionist: 2 cards (Today's Appointments with inline "Check In" action, Follow-ups Due).
  - Patient: 2 cards (Upcoming Appointments, Recent Prescriptions).
  - All lists use shared `Table.tsx` components with 10-records-per-page `Pagination.tsx` when exceeding 10 items.

### 6.1 Doctor Consultation Desk (`DoctorView.tsx`)
- **Active Consultation Desk**: Displays current patient MRN, age, blood group, chief complaint, clinical notes, and interactive plain-text allergy management.
- **Triage Vitals Editor**: Directly editable numeric fields for Systolic BP, Diastolic BP, Heart Rate, Temperature, and Oxygen Saturation with reference markers ("High"/"Low" plain text), previous visit vitals baseline ("Last visit: ..."), plausible range blocking validation, and "Save Vitals" trigger.
- **Patient Summary**: Executive clinical overview card in the right column detailing the in-consultation patient's last visit date, chronic conditions, current active medications (derived from active prescriptions), and previous visit vitals with recorded timestamp, with clean fallback to "None recorded" or "No active consultation".
- **Doctor Workstation Parity**: Staff Doctor (`Dr. Nathan Hayes`, `doc-2`, `role: 'doctor'`) workstation layout and capabilities fully match the MD reference:
  - **Queue Inspector Bar**: Clean "Doctor Clinical Queue Inspector" header matching MD typography (`text-[10px] uppercase font-bold text-slate-400 tracking-wider block`), zero subtitle paragraphs (Spec 2.5), interactive search bar, and standardized `w-full sm:w-64` filter scope selector.
  - **Patient History & Vitals Baselines**: Seeded outpatient cohort (Sophia Chen `pat-3`, Liam Bennett `pat-5`, Maya Patel `pat-6`) with realistic previous vitals, last visit dates, and current medications, rendering vitals baseline helper texts ("Last visit: ...") and Patient Summary card identically to MD.
  - **e-Prescription Master Ledger**: Attributed prescriptions (`rx-3` for Sophia Chen, `rx-4` for Liam Bennett) giving Staff Doctor an authentic, searchable e-Prescription ledger with modal inspection matching MD.
  - **Consultation Notes Persistence**: Wired `updateAppointmentNotes` through `ClinicContext` so clinical notes recorded in the consultation notes modal persist directly to appointment state and display in the EMR.
- **Semantic Worklist Table**: 10-records-per-page paginated worklist table with fixed column widths (`#`, `Time`, `Patient`, `Appt ID`, `Status`, `Actions`), flexible complaint column with 2-line clamp and full-text hover title, clean cell borders without vertical left border lines (`border-l-2`), in-consultation background row highlight, and right-aligned compact outline action buttons (`View File`, `Start Consultation`).
- **Patients Medical Directory**: Integrated with left-aligned `InteractiveSearchBar` flush with the table's left edge and with consistent 14px vertical gaps, filtering by name, MRN, and phone with instant pagination reset to page 1. Semantic `Table` layout with standard fonts for MRN and phone, deduplicated plain text allergy and chronic condition summaries ("None recorded" fallback, zero red dots), right-aligned content-sized action buttons ("Admit to Desk", "Prescribe") with patient-specific aria-labels, and "No patients found" empty state.
- **e-Prescription Master Ledger**: Integrated with left-aligned `InteractiveSearchBar` flush with the table's left edge and with consistent 14px vertical gaps, filtering by patient name, RX number, diagnosis, and drug name with instant pagination reset. Semantic `Table` layout with non-wrapping headers, standard fonts for RX number (regular weight) and issue date (ISO format). Clean regimen lines displaying bold drug names followed by comma-separated dose and frequency in muted styling without wrapping parentheses. Actions column with compact outline "View" button opening an accessible modal displaying complete prescription details and a Close button.
- **Prescription Authoring**: Prescribe medications with dosage, frequency, and duration controls with plain-text allergy warnings.
- **MD Supervisory Inspection**: When Dr. Marcus Vance inspects Dr. Nathan Hayes' desk, all inputs are disabled, action buttons are hidden, and zero intrusive "View Only" labels appear.
- **Patients Directory & Queue**: 10-records-per-page paginated tables with interactive search.

### 6.2 Reception Desk Workstation (`ReceptionistView.tsx`)
- **Workstation Header & Quick Actions**: Clean header "Front Desk and Patient Reception Workstation" without subtitle paragraphs. Two quick-action buttons: "Register patient" (outline) and "Walk-in check-in" (primary teal).
- **Navigation Tabs**: Physician-style plain-text tabs with static 2px accent underline sitting on the bottom border (`border-b-2 border-teal-600 -mb-px`): "Waiting Lounge", "Appointments", "Patient Directory", "Intake Registry".
- **Waiting Lounge Tab**: Live token dispatch with daily unique numbering resetting each day. Top summary cards display 4 plain metrics: Total Checked In, Currently Waiting, In Consultation, Completed Today. Shared Table with `stackBelow="lg"` and 10 rows per page with `Pagination`. Actions include "Call Next" (moves to `in_consultation`) and "Mark Completed".
- **Appointments Tab**: Date-filtered agenda with design-system `DatePicker` and quick "Book Appointment" modal. Gated "Check In" action re-verifying attending doctor availability (`isDoctorAvailable(doctorId, date)`). If the doctor is unavailable, check-in is disabled with plain text: "Doctor unavailable today".
- **Patient Directory Tab**: Registered outpatient roster displaying demographic data only (Name, MRN, DOB / Age, Phone, Assigned Doctor) with all clinical fields, allergies, and vitals stripped. Actions include "Check In" (opening Flow B modal with locked physician) and "Book" (scheduling appointment).
- **Intake Registry Tab**: Unified chronological audit log of today's registrations and check-ins. Filterable by event type (All Events, Registration, Check-in). Displays time, event type, patient name, operator name (Priya Sharma, David Kim), and details.
- **Interactive Search**: Integrated `InteractiveSearchBar` with ghost text autofill filtering across patients, tokens, and appointments across all workstation views.
- **Strict Permission Checks**: Reception actions enforce `patientRegistration`, `patientCheckIn`, and booking capabilities through `hasCapability` and reject unauthorized mutations.

### 6.3 Administrative Console (`AccessControlView.tsx`)
- **Page Header**: Clean header matching Physician module style displaying only "Administrative & Security Governance" with zero banners, eyebrow text, or non-revocable authority labels.
- **Navigation Tabs**: Physician-style plain-text tabs with static 2px accent underline sitting on the bottom border (`border-b-2 border-teal-600 -mb-px`), no background fills, no icons, no rounded shapes, and plain-text counts ("Add New Users (2 pending)", "Edit Users (13)", "Security Ledger (4)") with keyboard-only static outline.
- **Direct Staff Member Provisioning**: Clean form card without title icon or subtitle, uniform field row spacing without stray horizontal dividers, asterisks on required fields (Full Name, Department), inline plain-text validation, duplicate Badge ID check, numeric fee without spinner arrows, right-aligned unboxed Provision button, and Modal confirmation dialog before account provisioning and ledger entry generation.
- **Onboarding & Role Clearance Approvals**: Shared semantic Table with 7 standardized columns (Applicant, Role, Department, Badge ID, Applied, Notes with 2-line clamp and title attribute, Actions with compact outline Approve and Reject buttons of equal size and applicant aria-labels), Modal confirmation dialogs (Reject with optional reason), plain-text "No pending clearances" empty state, and 10-per-page Pagination (hidden when 10 or fewer).
- **Edit Users**: Clearance Governance bar laid out like the Physician Queue Inspector with label, search bar ("Search by name or ID" filtering name, badge ID, and MRN with instant page 1 reset), and role dropdown defaulting to "All roles". Role sections rendered as cards (Doctor / Physician Access, Receptionist Workstation, Patient Portal Access) with title, "N Personnel" count, no subtitles, and outline "Directly Add Doctor" / "Directly Add Receptionist" buttons. Personnel listed in shared semantic Tables matching Physician module style: Doctors and Receptionists columns (Name bold with muted title, Department with muted specialization, ID, Status, Permissions, Actions); Patients columns (Name bold, MRN, Status, Permissions, Actions without repeated portal/outpatient labels). Plain-text Status ("Active", "Revoked") without dots/colors, plain-text Permissions ("4 of 4 granted", "5 of 5 granted"), no initial avatar squares, no color tints, and no monospace text. Compact outline "Manage Access" action button with persona-specific aria-label opening isolated Access Console view with focus trap and focus return. 10 rows per page with Pagination hidden at 10 or fewer items, hiding sections with no matching personnel, and displaying plain-text "No personnel found" when zero matches exist across all roles.
- **Access Console Close & Esc-Key**: Standard X close icon button in top-right corner (`aria-label="Close console"`, title="Close"). Pressing `Esc` closes the console; if a modal is open on top (e.g. capability confirm dialog), `Esc` closes only that dialog first.
- **Unsaved Changes Protection**: If changes are unsaved, closing via X or Esc prompts with: *"You have unsaved changes. Discard and close?"* ("Discard" / "Keep editing"). Closes immediately if clean.
- **Focus Trap & Return**: Focus is trapped within the Access Console while open, and focus is automatically returned to the opening button upon closing.
- **Security Ledger**: Read-only audit log table in the shared Physician table style replacing the vertical timeline, rendered newest first. Header displays "Managing Director Security Audit Ledger" without subtitles and with a plain-text count (e.g. "4 Entries") replacing the monospace Immutable Ledger label. Standardized 6 columns: Timestamp (standard font in existing format), Action (plain text in standard font and weight Title Case, e.g. "Access Granted", without capitals, teal coloring, or monospace), Subject (bold), Role (standard font and capitalization), Details (wrapped to at most two lines with full text in title attribute), and Authorized By ("Dr. Marcus Vance (Managing Director)"). Interactive controls aligned to the table's left edge using standard spacing: InteractiveSearchBar ("Search ledger", filtering subject, action, and details) and Select ("All actions" plus action types). 10 rows per page with Pagination hidden at 10 or fewer items, resetting to page 1 on search or filter change. Strictly read-only with zero edit/delete controls and plain-text "No ledger entries found" empty state. Full administrative coverage ensuring all actions (provision user, approve or reject clearance, revoke access, restore access, delete account, and grant or revoke capabilities) record complete ledger entries with timestamp, action, subject, role, details, and authorized by.
- **Pagination**: 10-records-per-page navigation across users directory, approvals table, and audit ledger.

### 6.4 Billing & Financial Administration (`AdminView.tsx`)
- **Financial Ledger**: Tracks outpatient invoices, billing categories (consultations, diagnostics, procedures), invoice numbers, and payment status (`paid`, `unpaid`, `partially_paid`).
- **Payment Settlement**: Interactive modal allowing one-click payment processing via Cash, Card, Insurance, Bank Transfer, or UPI.
- **Pagination**: 10-records-per-page pagination for invoice tables.

### 6.5 Outpatient Health Portal (`PatientView.tsx`)
- **Personal Health Hub**: Eleanor Wright's personal medical summary.
- **Upcoming Consultations**: Displays doctor, room number, scheduled time, and booking modal.
- **Active Prescriptions**: Medication list with dosages and doctor instructions.
- **Billing History**: Invoices and receipts with status indicators.
- **Pagination**: 10-records-per-page pagination on all lists.

### 6.6 Billing Workstation (`BillingView.tsx`)
- **Workstation Header**: Clean header "Billing" without subtitle paragraphs. Accessible to accounts with `paymentRecording` or `administrativeAccess`.
- **Navigation Tabs**: Physician-style plain-text tabs with static 2px accent underline sitting on the bottom border (`border-b-2 border-teal-600 -mb-px`): "Invoices" and "Payments".
- **Invoices Tab**:
  - Top collections summary lines showing today's collections for the signed-in operator (Cash, Card, UPI, Portal, and Total), plus clinic-wide collections for administrators.
  - Active filter totals row ("Billed $X.XX, Collected $Y.YY, Outstanding $Z.ZZ").
  - Search by patient name, MRN, or invoice number.
  - Status filter dropdown (`Select.tsx`: All, Unpaid, Partially paid, Paid, Void).
  - Shared Table (`stackBelow="lg"`) with 10 rows per page (`Pagination`).
  - Actions: outline "View", and outline "Record Payment" for rows with an outstanding balance (requires `paymentRecording`).
- **Record Payment Modal**:
  - Invoice summary lines, amount input (prefilled with balance due, numeric, no spinners), payment method dropdown (Cash, Card, UPI), short reference input for Card and UPI, non-editable operator attribution ("Received by <signed-in staff name>").
  - Confirmation dialog with disabled submission state while processing.
  - On success: displays receipt modal with "Print" action (scoped print styles) and "Close".
- **View Invoice Modal**:
  - Invoice header, line items table, and payments history table (Date, Amount, Method, Received By, Receipt Number) with "View Receipt" action.
  - Holders of `paymentRecording` can click "Add Charge" (description, amount).
  - Administrators also have "Apply Discount" (amount, reason), "Void Invoice" (reason; only if zero payments recorded), and "Reverse" payment (reason; cannot over-reverse).
- **Payments Tab**:
  - Full audit log of all payments and reversals (Date, Receipt, Invoice, Patient, Amount, Method, Received By).
  - Filterable by payment method and date range with custom `DatePicker`. 10 records per page with `Pagination`.

---

## 7. VERIFICATION, BUILD & RUN GUIDE

### 7.1 Running the Development Server
```powershell
cd "c:\Users\raadi\Downloads\CMS"
npm run dev
```
Access the application in your browser at `http://localhost:3000`.

### 7.2 Verifying Production Build & Type Checking
```powershell
cd "c:\Users\raadi\Downloads\CMS"
npm run build
```
This runs `tsc && vite build`. A valid build completes with **0 TypeScript errors** and **0 lint warnings**.

### 7.3 Testing Checklist
- [x] All data tables display maximum 10 items per page with working next/previous page controls.
- [x] Search bar has zero popup dialog boxes, zero `Tab / Enter` button pills, and autofills on Tab or Enter with ghost text.
- [x] No emojis present anywhere in the UI or codebase.
- [x] All select elements use custom `Select.tsx` (no native `<select>`).
- [x] All date inputs use custom `DatePicker.tsx` (no native `<input type="date">`).
- [x] Number inputs have no arrow mark spinners.
- [x] All module view headers have no subtitle text.
- [x] Both receptionists (Priya Sharma and David Kim) can authenticate and operate the front desk.
- [x] Managing Director supervisory read-only inspection renders without "View Only" boxes or enabled buttons.
- [x] Vitals and allergy warnings are interactively editable with context persistence.
- [x] Role-aware Dashboard serves as default landing page with summary card, inline SVG charts, and paginated lists.
- [x] Proportional column width distribution across all tables (TableHead and TableCell), eliminating horizontal voids and awkward line wrapping.
- [x] Uniform rounded edges (`rounded-xl`) across all Select triggers, InteractiveSearchBar, Input, DatePicker, and Textarea controls.
- [x] Unified Combobox pattern for searchable Select controls: main field is directly searchable with inline query typing and clean options-only dropdowns.
- [x] Individual Card blocks for all Dashboard summary figures, replacing single large multi-metric card with clean separate cards.

