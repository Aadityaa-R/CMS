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

### 2.7 Receptionist Multi-Staffing
- **Rule**: Provide full multi-receptionist operational support.
- **Enforced Actions**:
  - Added second receptionist **David Kim** (`receptionist2`, `REC-302`, `d.kim@beaconclinic.com`) alongside **Priya Sharma** (`receptionist`, `REC-301`, `receptionist@beaconclinic.com`).
  - Integrated both receptionists into credentials table, demo user authentication, individual access control records, and the front desk duty roster.

### 2.8 Design System & Input Rules
- **Zero Native Select Elements**: Never use standard HTML `<select>`. Always use the custom design-system dropdown `src/components/ui/Select.tsx` with chevron icons, custom backdrop handling, and keyboard support.
- **Zero Native Date Inputs**: Never use standard HTML `<input type="date">`. Always use the custom design-system calendar `src/components/ui/DatePicker.tsx`.
- **Zero Number Spinner Arrows**: All numeric input fields must suppress increment and decrement arrow marks via CSS utility classes (`[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`).
- **Frameless Seamless Layout**: Removed panel divider borders and header shadows for a clean, borderless clinical layout.
- **Restricted Palette**: Monochromatic slate base with calm clinical accents (teal, emerald, amber, rose). Maximum of 3 accent colors simultaneously.

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

## 3. CHRONOLOGICAL CHANGELOG OF USER REQUESTS & COMMITS

The table below outlines the evolution of the codebase from initial repository setup to current state:

| Commit Hash | Commit Message / Feature Description | User Intent & Key Actions |
| :--- | :--- | :--- |
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
│   │       └── Textarea.tsx        # Multiline text input for clinical notes and complaints
│   │
│   └── views/
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

### 6.1 Doctor Consultation Desk (`DoctorView.tsx`)
- **Active Consultation Desk**: Displays current patient MRN, age, blood group, chief complaint, clinical notes, and interactive allergy management.
- **Triage Vitals Editor**: Directly editable numeric fields for Systolic BP, Diastolic BP, Heart Rate, Temperature, and Oxygen Saturation with a "Save Vitals" trigger.
- **Prescription Authoring**: Prescribe medications with dosage, frequency, and duration controls.
- **MD Supervisory Inspection**: When Dr. Marcus Vance inspects Dr. Nathan Hayes' desk, all inputs are disabled, action buttons are hidden, and zero intrusive "View Only" labels appear.
- **Patients Directory & Queue**: 10-records-per-page paginated tables with interactive search.

### 6.2 Reception Desk Workstation (`ReceptionistView.tsx`)
- **Waiting Lounge Queue**: Live token dispatch (`#101`, `#102`, etc.) with status indicators (`waiting`, `checked_in`, `in_consultation`, `completed`).
- **Priority Filter**: Filter queue by All, Waiting, or Urgent.
- **Walk-in Check-In & Registration**: Modals powered by design-system `Input`, `Select`, and `DatePicker` with automatic MRN generation.
- **Terminal Operator Card**: Displays currently logged-in receptionist (Priya Sharma or David Kim) and full receptionist duty roster.
- **Pagination**: 10-records-per-page table navigation.

### 6.3 Administrative Console (`AccessControlView.tsx`)
- **Add New Users**: Onboard staff physicians, receptionists, and outpatient accounts with custom authorities.
- **Edit Users**: Filter by Doctors, Receptionists, or Patients. Selecting any user displays an isolated clearance management view with back button, permission toggles, status grant/revoke, and account deletion with confirmation.
- **Security Ledger**: Immutable audit log recording all access changes, grants, revocations, and account deletions with timestamp and authorizer name.
- **Pagination**: 10-records-per-page navigation across both users directory and audit ledger.

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
