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
- **Patient Summary Card**: In the right column of the Consultation Desk tab, the former physician profile card is replaced with an executive Patient Summary card for the patient currently in consultation (or selected doctor during MD inspection). Content is rendered as plain text label/value rows for Last Visit, Chronic Conditions, and Current Medications (derived from active prescriptions), with clean fallbacks ("None recorded" / "No active consultation"). The Previous Visit Vitals row was removed in Fix 7, while the muted "Last visit:" baseline references under the active consultation vitals inputs remain.
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

---

## 3. CHRONOLOGICAL CHANGELOG OF USER REQUESTS & COMMITS

The table below outlines the evolution of the codebase from initial repository setup to current state:

| Commit Hash | Commit Message / Feature Description | User Intent & Key Actions |
| :--- | :--- | :--- |
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
│       └── AdminView.tsx           # Billing & Financial Management (Invoice Ledger, Payment Settlements)
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
- **Waiting Lounge Queue**: Live token dispatch (`#101`, `#102`, etc.) with status indicators (`waiting`, `checked_in`, `in_consultation`, `completed`).
- **Priority Filter**: Filter queue by All, Waiting, or Urgent.
- **Walk-in Check-In & Registration**: Modals powered by design-system `Input`, `Select`, and `DatePicker` with automatic MRN generation.
- **Terminal Operator Card**: Displays currently logged-in receptionist (Priya Sharma or David Kim) and full receptionist duty roster.
- **Pagination**: 10-records-per-page table navigation.

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

