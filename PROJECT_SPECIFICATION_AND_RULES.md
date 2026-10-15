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

## 3. CHRONOLOGICAL CHANGELOG OF USER REQUESTS & COMMITS

The table below outlines the evolution of the codebase from initial repository setup to current state:

| Commit Hash | Commit Message / Feature Description | User Intent & Key Actions |
| :--- | :--- | :--- |
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
- **Active Consultation Desk**: Displays current patient MRN, age, blood group, chief complaint, clinical notes, and interactive plain-text allergy management.
- **Triage Vitals Editor**: Directly editable numeric fields for Systolic BP, Diastolic BP, Heart Rate, Temperature, and Oxygen Saturation with reference markers ("High"/"Low" plain text), previous visit vitals baseline ("Last visit: ..."), plausible range blocking validation, and "Save Vitals" trigger.
- **Patient Summary**: Executive clinical overview card in the right column detailing the in-consultation patient's last visit date, chronic conditions, current active medications (derived from active prescriptions), and previous visit vitals with recorded timestamp, with clean fallback to "None recorded" or "No active consultation".
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
- **Security Ledger**: Immutable audit log recording all access changes, grants, revocations, and account deletions with timestamp and authorizer name.
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
