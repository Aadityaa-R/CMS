# CLINIC MANAGEMENT SYSTEM (CMS) - MASTER ARCHITECTURE, SPECIFICATION AND RULES

## 1. PROJECT OVERVIEW & CORE IDENTITY

- **Project Name**: Clinic Management System (CMS)
- **Domain Definition**: Medical Practice and Outpatient Clinic Operations (Strictly **Clinic Management System**, NOT Content Management System).
- **Clinic Scale & Profile**: Small outpatient ambulatory practice. The clinic operates clinical consultations, front desk intake, triage vitals, appointment scheduling, access governance, and minor-unit billing. It does **not** operate an in-house pharmacy, bulk medicine warehouse, or pathology laboratory facility.
- **Development Strategy**: **Frontend First with Pure Business Domain Logic**. The entire user experience, responsive workstations, state management, inter-role workflows, and interactive clinical controls are fully engineered with rich TypeScript domain models and local reactive state before backend deployment.
- **Repository Location**: `c:\Users\raadi\Downloads\CMS`
- **Active Git Branch**: `m10-final` (local offline repository).
- **Core Technology Stack**:
  - **Framework**: React 18.3+ with TypeScript 5.5+
  - **Bundler & Tooling**: Vite 6.4+
  - **Styling**: Tailwind CSS 3.4+ with custom clinical design tokens
  - **Iconography**: Lucide React (clean SVG icons)
  - **State Architecture**: React Context API (`AuthContext`, `ClinicContext`, `BillingContext`, `AttendanceContext`, `ThemeContext`, `NotificationContext`) with repository persistence (`BrowserRepository`, `MemoryRepository`) and schema migrations.
  - **Testing Engine**: Vitest with Testing Library and JSDOM, verified across UTC, America/Los_Angeles, and Asia/Kolkata timezones.

---

## 2. GOVERNING ARCHITECTURAL INVARIANTS & "NEVER DO" RULES

Every feature, component, test, and line of code in this project strictly obeys these mandatory governing rules:

### 2.1 The Zero Emoji Rule
- **Rule**: **ABSOLUTELY ZERO EMOJIS UNDER ANY CIRCUMSTANCES**.
- **Scope of Enforcement**:
  - Zero emojis in UI components, headers, labels, buttons, cards, modals, or notifications.
  - Zero emojis in source code comments, variable names, or string literals.
  - Zero emojis in Git commit messages and branch references.
  - Zero emojis in markdown documentation files.
  - Zero emojis in terminal logs, scripts, and assistant responses.
  - Enforced continuously via automated scanner `scripts/scan-emojis.ts` and `scripts/scan-commits.ts` in `npm run verify`.

### 2.2 Offline Git Discipline
- **Rule**: Strictly local offline Git repository.
- **Constraint**: **NEVER RUN GIT PUSH**. All commits remain local on the working branch.
- **Verification**: Every commit must be verified with `npm run verify` (build, typecheck, multi-timezone tests, emoji scan, commit scan, color scan) with 0 errors.

### 2.3 Visual Design Invariants (The "Never Do" Design Rules)
- **Never use pills, chips, badges, or rounded boxes around short text**: Statuses, roles, departments, and counts must render as clean, unboxed plain text rows with natural typographic hierarchy.
- **Never use focus glows, pulsing animations, or transitions**: Suppress focus rings, glows, pulsing animations, and animated hover/focus transitions (`ring-0`, `shadow-none`, no animated transitions). Only static keyboard-only 1px outline in the existing accent color is permitted. (Note: The single deliberate exception to the no-animation rule is Login and Sign-Up Motion documented in Section 10; the rest of the app stays completely static, and static keyboard focus outline stays exactly as it is).
- **Never remove card outlines**: Card outlines (`border border-slate-200 dark:border-slate-800`) must remain on all cards and outlined sections.
- **Never use toggle switches**: Checkboxes or plain buttons only.
- **Never use monospace fonts for data**: Clinical and financial figures, MRNs, appointment IDs, invoice numbers, timestamps, and amounts must use standard proportional sans-serif typography.
- **Never use hard-coded colors**: All component styling must utilize semantic CSS design tokens or Tailwind color classes referencing theme variables. Raw hex and rgb colors outside token definition files strictly fail the build via `scripts/scan-colors.ts`.
- **Never use native HTML select or native date input**: Always use custom design-system `Select.tsx` (with searchable combobox pattern) and `DatePicker.tsx`.
- **Never display number spinner arrows**: Numeric inputs must suppress increment/decrement spinners via CSS utilities.
- **Never display subtitle text under workstation headers**: Keep clean headers with title, essential status, and functional actions only.
- **Never display metric stat card rows on clinical workstations**: Clinical density is prioritized. The front page (role-aware landing DashboardView) is the only screen permitted to display an outlined summary card in a 4-column responsive grid.
- **Never exceed 10 records per page on data tables**: All tables across all views enforce `PAGE_SIZE = 10` with dedicated `Pagination` controls.

### 2.4 Clinical Safety & Data Invariants
- **Never permit an unassigned patient to have a completed visit**: Every completed consultation encounter must be associated with an outpatient who possesses an active primary physician assignment.
- **Never allow a doctor to prescribe without an active assignment**: Physicians can only prescribe electronic medications for outpatients currently assigned to their care.
- **Never store money as floating-point dollars**: Financial calculations and database records strictly represent money in integer minor units (cents). Floating-point arithmetic for currency is strictly prohibited.
- **Never wipe user data silently during migrations**: Schema version bumps in `src/data/storage.ts` normalize data in-place without deleting or resetting existing user records.
- **Never hardcode static dates in seed scenario generators**: All dates in `src/data/demoScenario.ts` are dynamically generated relative to execution time (`now: Date = new Date()`), guaranteeing that "today" is always today, "yesterday" is yesterday, and aging records maintain accurate relative days.
- **Never display raw stack traces in the UI**: Unhandled render exceptions are caught by `ErrorBoundary`, which logs full details to the console only and renders a plain-text recovery screen with "Reload page" and "Reset demo data" options.

---

## 3. CHRONOLOGICAL CHANGELOG OF PAST TASKS & COMMITS

| Commit Hash | Commit Message / Feature Description | User Intent & Key Actions |
| :--- | :--- | :--- |
| (M9.6) | `feat(motion): implement login and sign-up screen motion, ECG background, and test suite (M9.6)` | Implemented deliberate exception for sign-in and sign-up screens: motion tokens (loginMotion.css/ts), staggered entrance sequence (<=700ms), 200ms view crossfade, decorative EcgBackground heartbeat wipe with tab visibility pausing, show-password toggle crossfade (150ms), credentials accordion (250ms), button pressed state scale(0.98), failed sign-in card shake (350ms) with polite live region, success exit transition (250ms), prefers-reduced-motion fallback, and updated footer text warning. Added tests/loginMotion.test.tsx (6 tests). |
| `b068382` | `docs(qa): complete final walkthrough inspection matrix (M10 Section 11)` | Performed exhaustive walkthrough across all 8 personas, 8 workstations, modals, forms, filters, and viewports. Published full 72-checkpoint audit matrix in docs/FINAL_CHECK.md. Extended tests/tabsAudit.test.tsx with additional persona checks. |
| `95088d8` | `refactor(cleanup): remove unused components and optimize production bundle chunking (M10 Section 10)` | Deleted dead components (AdminView.tsx, StatCard.tsx, Badge.tsx). Verified 0 console.log and 0 TODO comments in src/. Configured Rollup manualChunks in vite.config.ts splitting vendor react, icons, and views so all production chunks are under 500 KB (largest chunk is 305.60 KB). |
| `247154a` | `docs(spec): consolidate project specification and rules into unified reference (M10 Section 9)` | Rewrote PROJECT_SPECIFICATION_AND_RULES.md into a coherent, top-to-bottom master specification with the governing "Never do" rules at the top, changelog preserved, and all obsolete sections replaced with the current architecture. |
| `f7a2bd5` | `docs(demo): create demo walkthrough guide and update repository readme (M10 Section 8)` | Created docs/DEMO_GUIDE.md with persona table, credentials, clinical safety notice, and 5 interactive walkthroughs. Replaced README.md with comprehensive platform summary, stack, commands, and links. Documented Section 2.29 in spec. |
| `0b36148` | `feat(seed): implement dynamic demo scenario and validation test suite (M10 Section 7)` | Created src/data/demoScenario.ts relative to now: 5 staff accounts, 7 patients (penicillin allergy, antihypertensive, unpaid invoice, waiting, scheduled), 1 waiting, 1 consulting, 1 completed with Rx and invoice, 1 booked, 1 no-show yesterday, 1 clearance, 1 leave, 1 unpaid invoice > 30 days old, and non-zero Needs Attention widget across all 5 categories. Added tests/demoScenario.test.ts (17 tests). Documented Section 2.28 in spec. |
| `b446b84` | `feat(audit): implement comprehensive audit ledger mutation coverage and test matrix (M10 Section 6)` | Audited all state mutations across the application and wired missing actions to addAuditLogEntry. Authored docs/LEDGER_COVERAGE.md and tests/ledgerCoverage.test.ts. Documented Section 2.27 in spec. |
| `32efe02` | `feat(ui): add loading, empty, and error states to tables, remove title attributes, and enforce strict test console warnings (M10 Section 5)` | Added native loading, empty, and error states to shared Table component. Removed title attributes on disabled controls across all views in favor of visible helper text. Configured tests/setup.ts to strictly fail tests on console.error and console.warn. Documented Section 2.26 in spec. |
| `79e4ab9` | `refactor(responsive): convert hardcoded pixel sizes to rem, add 2xs/xs-plus tokens, and capture 40 full-screen screenshots (M10 Section 4)` | Converted all hardcoded pixel text sizes across 23 files to rem units. Added 2xs and xs-plus tokens to tailwind.config.js. Captured 40 full-screen 1440x900 screenshots across all 20 views in light and dark themes into docs/final-screens/. Verified 320px zero sideways scroll. Documented Section 2.25 in spec. |
| `857405b` | `feat(a11y): implement skip link, semantic landmarks, tablist roles, and keyboard navigation audit (M10 Section 3)` | Added skip to main content link, landmarks (header, nav, main), polite live status region, focus traps in modals, single h1 per view, and aria tablists. Authored tests/keyboardNav.test.tsx. Documented Section 2.24 in spec. |
| `48fbe4a` | `feat(theme): enforce 4.5:1 contrast, CSS chart tokens, and raw color scanner (M10 Section 2)` | Standardized text and non-text contrast to meet WCAG 2.1 AA (4.5:1 text, 3:1 non-text). Replaced hard-coded chart colors with CSS variables. Added scripts/scan-colors.ts to npm run verify. Documented Section 2.23 in spec. |
| `5ffc05a` | `feat(theme): implement light-mode card and modal shadows with preserved card outlines (M10 Section 1)` | Added soft static two-layer light-mode card shadow (--shadow-card) and modal shadow (--shadow-modal) with card outlines preserved. Zero shadow in dark theme and print. Documented Section 2.22 in spec. |
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
| `ae1a4f7` | `style: replace person cards with shared table and align Edit Users tab with design system` | User requested: "Fix 9 on the Administrative module, Edit Users tab". Aligned Clearance Governance bar with Physician Queue Inspector layout, removing instruction sentence, setting search placeholder to "Search by name or ID" (filtering name, badge ID, and MRN with instant page 1 reset), and defaulting role filter dropdown to "All roles". Cleaned role section cards (Doctor / Physician Access, Receptionist Workstation, Patient Portal Access) by removing explanatory subtitles, preserving titles and "N Personnel" counts, and converting "Directly Add Doctor" and "Directly Add Receptionist" buttons to standard outline variant. Replaced person card grids with shared semantic Table component matching Physician module: Doctors and Receptionists columns (Name with bold text and muted title, Department with muted specialization second line, ID, Status, Permissions, Actions); Patients columns (Name bold, MRN, Status, Permissions, Actions, removing redundant portal and outpatient labels). Rendered Status as plain text ("Active", "Revoked") without colored dots, and Permissions as plain text ("4 of 4 granted", "5 of 5 granted"). Removed avatar initial squares, role color tints, green dots, and all monospace text. Configured "Manage Access" as compact outline button with persona-specific aria-label, preserving original handler and focus restoration to opener. Added 10-per-page Pagination (hidden at 10 or fewer items), hiding sections with no matches, and displaying plain-text "No personnel found" empty state when zero matches exist across all sections. Completed data check reporting clinic-wide scope of Patient Portal Access and separate identities of David Kim (receptionist vs outpatient). |
| `56f8aaf` | `Add second receptionist David Kim to credentials, access control directory, and reception desk roster` | User requested: "add another receptionist". Added David Kim (`receptionist2`, `REC-302`), updated credentials table, access control, and duty roster. |
| `8cbdf85` | `style: format phone and currency, hide inactive tab line, and add accessible cancel modal` | User requested: "Fix 8 on ReceptionistView.tsx (Appointments tab)". Formatted phone numbers in standard format `+1 (555) 000-0000` without monospace. Added explicit Consultation Fee column to Appointments table with formatted currency and right-aligned headers. Removed `border-transparent` from inactive navigation tabs, ensuring the bottom divider renders as a continuous clean line without colored dashes. Replaced browser `window.confirm` dialog with accessible `CancelModal` featuring mandatory cancellation reason dropdown and optional notes. |
| `74ea3d0` | `style: align queue headers and numbers, clamp complaints, and add aria labels` | User requested: "Fix 7a on DoctorView.tsx (Consultation Desk tab)". Fixed column widths and non-wrapping table headers. Queues numbers render plain integers without `#` prefixes. Clamped complaint column to 2 lines with title attribute. Added row-level active in-consultation background highlight without left border lines. |
| `a89728b` | `style: align header and search, center unassigned count, and add aria labels` | User requested: "Fix 5 on DoctorView.tsx (Patients tab)". Flush-aligned search bar and table edges. Centered unassigned count in patient card header. Added accessible aria labels to action buttons. |
| `2623a9a` | `style: align header, table, and search bar layout on ReceptionistView Waiting Lounge tab` | User requested: "Fix 4 on ReceptionistView.tsx (Waiting Lounge tab)". Aligned search bar flush with table edge. Added table pagination. Removed status dot colors in favor of plain text. |
| `8f465bf` | `style: remove stat cards and monospace, style tabs and buttons on PatientView` | User requested: "Fix 3 on PatientView.tsx". Removed metric cards, monospace fonts, and tinted boxes. Added clean underline tabs and accessible booking/cancellation modals. |
| `6a83945` | `feat(auth): implement access modules, capability bundling, and module management UI (M2)` | User requested: "TASK: M2, Modules. Replace per-person capability toggles with modules: named bundles of accesses that an admin can add people to." Replaced per-person capability switchboard with access modules model. Created fixed catalog of 8 capabilities (src/data/accessCatalog.ts). Seeded initial system modules (Clinical, Front Desk, Administration) and mapped staff records in mockData.ts. Implemented getEffectiveAccesses union resolution with doctor license check on prescriptionAuthoring, single source of truth for admin via Administration membership, and handler guards (canDeleteModule, canIncludeAccess, canRemoveAccess, canAddMember, canRemoveMember, canDeleteStaff, canGrantAdmin, canRevokeAdmin). Hardened ClinicContext with module state persistence (cms_modules_v2) and mutation handlers. Updated AuthContext dynamic capability resolution and single sidebar navigation mapping. Replaced capability switchboard in AccessControlView with Modules tab, isolated Module View (accesses matrix, member directory, name-typing delete modal, reason-gated admin promotion), updated Edit Users tab with comma-separated modules, Access Console with module membership and effective accesses source attribution, and auto default-module assignment on direct provisioning and onboarding clearance. Filtered staff migration equivalence check in test suite (100% equivalence, 0 exceptions). Built test suite with 76 permission tests, 36 dashboard metrics tests, and 0 emojis. Production build passes with 0 errors and 0 warnings. |
| `dae42e3` | `feat(auth): implement permissions foundation, patient assignment transfer, and admin promotion` | User requested: "TASK: Step 1 of the role and workflow rebuild: permissions foundation, patient assignment and transfer, admin promotion." Discovery completed auditing role checks, registration/check-in points, patient reads, and seeded patient assignments (including Sophia Chen transfer history and unassigned patient Rachel Green pat-16). Added Section 2.11 to specification. Created pure permissions module (src/lib/permissions.ts) with 42 unit tests (scripts/test-permissions.js) passing 100%. Implemented PatientAssignment model with INITIAL_PATIENT_ASSIGNMENTS in mockData.ts, ClinicContext transferPatient action, and AuthContext dynamic capabilities. Scoped patient and prescription data reads in DoctorView and DashboardView. Removed registration/check-in from doctors and MD, disabled Start Consultation on scheduled appointments with "Patient has not been checked in" tooltip, and added transfer care modal and assigned doctor column in DoctorView Patients tab. Built admin promotion in AccessControlView with perm-admin capability, protection guards preventing revocation or deletion of original MD and last remaining admin, immediate sidebar removal on admin revocation, and receptionist capabilities display (Patient Registration, Patient Check-in, Payment Recording). Build passes with zero errors. |
| `51e5c7c` | `feat: add role-aware dashboard as default landing page with seed history and svg charts` | User requested: "Build a role-aware Dashboard as the front page (landing page after login) of the Clinic Management System. Borrow the layout idea only (greeting, summary figures, two charts, three lists); do not copy any third-party styling or assets. Frontend-first with seed data." Implemented pure aggregation layer in src/lib/dashboardMetrics.ts with 37 unit tests covering presets, day/week bucketing, and role scoping. Extended mockData with 30-day historical seed data (appointments, visits, invoices, and patients). Role-scoped summary figures: MD (8 figures with revenue), Staff Doctor (5 figures, isolated to own visits), Receptionist (4 figures, front desk only), Patient (3 figures). Rendered exactly ONE outlined summary card in 4-column responsive grid without icons or colored numbers. Built inline SVG charts for MD & Staff Doctor (Patients & Visits grouped bars with hatch pattern; Fees & Payments line chart with dashed collected series; Visits trend line) with Day/Week/Month underline tabs, static gridlines, and screen-reader accessibility tables. Built 3 role-scoped semantic Table list cards (Today's Appointments, Follow-ups Due, Pending Clearances / Upcoming Appointments / Recent Prescriptions) with 10-records-per-page Pagination. Configured Dashboard as top item in Sidebar for every role and default landing page upon login and clinic brand click. |
| `bf56822` | `style: align search bar layout, deduplicate patient conditions, and clean worklist edges` | User requested: "Fix 7b on DoctorView.tsx and the seed data". Flush-aligned the search bar's left edge with the table's left edge (`leftEdgeDiff: 0`) on Patients and e-Prescriptions tabs, with consistent 14px vertical spacing between card header, search bar, and table header. Removed Eleanor Wright's duplicate condition ('Essential Hypertension') from `INITIAL_PATIENTS` in `mockData.ts` while preserving 'Mild Hypertension'. Added `deduplicateList` helper to normalize and deduplicate chronic conditions, allergies, and current medications across `DoctorView.tsx`. Cleaned worklist table cell borders by removing `border-l-2` from the `#` column while maintaining row-level in-consultation background highlight. |
| `0cdeadc` | `style: add prescription search, format regimen, and add view details modal` | User requested: "Fix 6 on DoctorView.tsx (e-Prescriptions tab)". Removed subtitle under e-Prescription Master Ledger while adding right-aligned prescription count text. Added left-aligned InteractiveSearchBar inside the card directly above the table with "Search prescriptions" placeholder, filtering by patient name, RX number, diagnosis, and drug name, and resetting to page 1 on every search query change. Standardized fonts for RX number (regular weight, no monospace) and issue date (ISO format, no monospace). Formatted prescribed regimens with bold drug names and comma-separated dose and frequency in muted styling without wrapping parentheses. Added an Actions column with compact outline "View" button with RX-specific aria-label, opening an accessible modal displaying RX number, issue date, patient name and MRN, allergies, diagnosis, issuing doctor, and full regimen with a Close button only. Reported data audit regarding Sophia Chen's prescription attribution in mockData.ts. |
| `6f38072` | `style: clean login page, add credentials directory, and enforce 1440x900 responsive fit` | User requested: "Fix 1 on the Login Page". Stripped outer grey pill and role tint boxes from clinic brand lockup, removed role-switch pills, removed instructional paragraph under welcome heading, removed input icon prefixes, and removed remember-me toggle switch in favor of a clean native-style checkbox. Built collapsible "Demo Credentials Directory" card at bottom of login surface with 8-role credentials table (role, label, email, password, and Autofill outline button), auto-filling form inputs and focusing Sign In button. Configured whole login surface into centered responsive container with zero scrollbar at 1440x900 viewport. |
| `5591d37` | `style: replace badge colors with plain text and clean worklist buttons on DoctorView` | User requested: "Fix 7a on DoctorView.tsx (Consultation Desk tab)". Replaced badge and tag colors on worklist queue with plain text. Concluded visits display plain text without pill backgrounds. Replaced filled action buttons with compact outline buttons. |
| `6f9c961` | `style: add unassigned patient filter count to Patients tab in DoctorView` | User requested: "Fix 5 on DoctorView.tsx (Patients tab)". Added live unassigned patient counter badge in Patients tab header. |
| `9b3eb7c` | `style: replace pill badges with plain text in ReceptionistView Waiting Lounge` | User requested: "Fix 4 on ReceptionistView.tsx (Waiting Lounge tab)". Replaced priority badge chips (Urgent, Routine) with plain-text status indicators. Cleaned token number styling. |
| `60f0896` | `style: clean PatientView personal record and upcoming appointments layout` | User requested: "Fix 3 on PatientView.tsx". Replaced colored card headers with plain outlines. Formatted doctor name and department neatly. |
| `3be22dc` | `style: clean AccessControlView clearance approvals and roles layout` | User requested: "Fix 9 on AccessControlView.tsx". Standardized button sizing, aligned table headers, and removed decorative badges. |
| `0fa2ff9` | `style: clean AdminView invoices and billing history table borders` | User requested: "Fix 8 on AdminView.tsx". Formatted table rows with subtle dividers and removed double border outlines. |
| `b47f7d1` | `style: clean application header, sidebar navigation, and brand lockup` | User requested: "Fix 2 on AppLayout.tsx". Aligned navigation icons and labels, removed gradient backgrounds, and standardized active navigation styling. |

---

## 4. SYSTEM ARCHITECTURE & FILE MAP

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           # Page shell: skip link, header, nav, landmarks, polite live region
│   │   ├── Sidebar.tsx             # Access-gated sidebar navigation
│   │   └── TopHeader.tsx           # Clinic brand, active persona, role switcher, theme toggle
│   └── ui/
│       ├── Button.tsx              # Design system button (primary, outline, ghost; static outlines)
│       ├── Card.tsx                # Card container with static light-mode shadow and preserved outline
│       ├── DatePicker.tsx          # Custom design system calendar (zero native date input)
│       ├── ErrorBoundary.tsx       # Component error boundary (catches errors, logs to console, fallback UI)
│       ├── Input.tsx               # Standard text and numeric input (zero spinners, static focus outline)
│       ├── InteractiveSearchBar.tsx# Fast search bar with inline ghost text completion
│       ├── Modal.tsx               # Accessible modal with focus trap, Esc key listener, return focus
│       ├── Pagination.tsx          # 10-records-per-page pagination controls
│       ├── Select.tsx              # Searchable combobox dropdown (zero native select)
│       └── Table.tsx               # Semantic table with loading, empty, and error state helpers
├── context/
│   ├── AttendanceContext.tsx       # Staff clock-in/out, shifts, leave requests, ledger logging
│   ├── AuthContext.tsx             # Cryptographic auth, session lifecycle, module capability derivation
│   ├── BillingContext.tsx          # Invoices, minor-unit payments, receipts, ledger logging
│   ├── ClinicContext.tsx           # Patients, appointments, assignments, formulary, ledger logging
│   ├── NotificationContext.tsx     # In-app patient notifications repository
│   └── ThemeContext.tsx            # Light/dark theme provider
├── data/
│   ├── accessCatalog.ts            # Fixed catalog of 8 standard capabilities
│   ├── attendanceSeed.ts           # Rolling attendance and shifts seed data
│   ├── billingSeed.ts              # Historical invoices and minor-unit payments seed data
│   ├── demoScenario.ts            # Dynamic demonstration scenario generator relative to active date
│   ├── formularySeed.ts            # Clinical formulary seed (43 essential medicines, minor-unit prices)
│   ├── mockData.ts                 # Role credentials, demo users, access audit logs
│   ├── repository.ts               # BrowserRepository (localStorage) & MemoryRepository
│   └── storage.ts                  # Storage engine, schema migrations, backup export/import, demo reset
├── lib/
│   ├── attendance.ts               # Pure attendance engine: hours, late/early minutes, leave validation
│   ├── auth.ts                     # PBKDF2 password hashing, policy validation, duplicate patient detection
│   ├── authConstants.ts            # Storage keys, lockout duration, PBKDF2 iterations
│   ├── availability.ts             # Physician working day and leave availability resolution
│   ├── billing.ts                  # Minor-unit billing, invoice creation, actor normalization
│   ├── dashboardMetrics.ts         # Pure dashboard metrics aggregation, date presets, Needs Attention
│   ├── dashboardWidgets.ts         # Dashboard widget registration and capability gating
│   ├── doctorNames.ts              # Canonical doctor name formatting (never doubles Dr.)
│   ├── money.ts                    # Integer minor-units currency formatting and fee migration
│   ├── permissions.ts              # Pure module capability derivation, patient scoping, care transfer
│   ├── prescribing.ts              # Formulary validation, allergy check, quantity calculation
│   ├── scheduling.ts               # 30-min slot calculation, 14-day booking horizon, buffer validation
│   ├── selectors.ts                # Role-scoped data selectors for patients, appointments, invoices, rx
│   ├── staffIds.ts                 # Canonical staff account ID resolution (resolveStaffId)
│   └── time.ts                     # Clinic local date helper (formatLocalDate)
├── types/
│   ├── attendance.ts               # Shift, AttendanceRecord, LeaveRequest interfaces
│   ├── billing.ts                  # Invoice, Payment, Receipt, InvoiceItem interfaces
│   ├── index.ts                    # Core types: User, Patient, Doctor, Appointment, AccessModule
│   ├── prescribing.ts              # Prescription, PrescriptionItem, Medicine, DrugClass interfaces
│   └── storage.ts                  # Account, ClaimRequest, StorageSettings, BackupData interfaces
└── views/
    ├── AccessControlView.tsx       # Modules management, Add Users, Edit Users, Security Ledger
    ├── AttendanceView.tsx          # My Attendance, Today Roster, Attendance Sheet, Leaves, Shifts
    ├── BillingView.tsx             # Invoices, Payments, collection summaries, printable receipts
    ├── DashboardView.tsx           # Role-aware dashboard, summary figures, charts, Needs Attention
    ├── DataManagementTab.tsx       # Storage telemetry, backup export, import, undo snapshot, reset
    ├── DoctorView.tsx              # Consultation Desk, triage vitals, EMR summary, e-Prescriptions
    ├── PatientPortal.tsx           # Outpatient portal: summary, booking, prescriptions, invoices
    └── ReceptionistView.tsx        # Waiting Lounge, check-in, bookings, patient directory, intake registry
```

---

## 5. USER ROLES, DEMO CREDENTIALS & ACCESS GOVERNANCE

### 5.1 The Single Source of Truth for Access
- Access authorizations (`hasCapability`) and administrative status (`isAdmin`) derive **strictly and live** from:
  1. The account being active (not locked, deleted, or suspended).
  2. The account's active membership in access modules.
- Permissions are evaluated live and are **never cached** across sessions or logins.
- When an administrator modifies module membership or account status, the user gains or loses access immediately—including sidebar navigation items and active views—without requiring re-login.

### 5.2 Canonical Staff Accounts Directory
Every staff member possesses exactly one canonical staff ID (the account ID `acc-...`). The resolver `resolveStaffId` maps any user ID, doctor ID, badge number, or email to this canonical ID:

| Role | Persona / Full Name | Account ID | Username | Password | Specialization / Department | Module Memberships |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Managing Director & Admin** | Dr. Marcus Vance | `acc-doc-1` | `md` | `Doctor@123` | Internal Medicine & Management | Clinical (`mod-clinical`), Administration (`mod-admin`) |
| **Staff Consulting Physician** | Dr. Nathan Hayes | `acc-doc-2` | `doctor` | `Doctor@123` | General Medicine & Triage | Clinical (`mod-clinical`) |
| **Outpatient Consulting Physician** | Dr. Sophia Reed | `acc-doc-3` | `doctor2` | `Doctor@123` | Outpatient & Family Medicine | Clinical (`mod-clinical`) |
| **Lead Front Desk Coordinator** | Priya Sharma | `acc-rec-1` | `receptionist` | `Reception@123` | Front Desk & Triage | Front Desk (`mod-frontdesk`) |
| **Front Desk Intake Specialist** | David Kim | `acc-rec-2` | `receptionist2` | `Reception@123` | Front Desk & Admissions | Front Desk (`mod-frontdesk`) |
| **Registered Outpatient** | Eleanor Wright | `usr-pat-1` | `patient` | `Patient@123` | Outpatient Care (MRN-84291) | Patient Portal (Invariant) |

### 5.3 Fixed Access Catalog & System Modules
The platform implements a strictly fixed catalog of 8 capabilities (`src/data/accessCatalog.ts`):
1. `consultationWorkstation`: Conduct patient visits, view clinical worklist, admit to desk.
2. `emrRecordsAccess`: Review patient medical records, chronic history, and previous triage vitals.
3. `prescriptionAuthoring`: Author and sign electronic outpatient prescriptions (requires Doctor licence).
4. `consultingCalendar`: Manage personal consulting schedule and calendar.
5. `patientRegistration`: Register new outpatients at reception (demographics only).
6. `patientCheckIn`: Check in arriving walk-ins and scheduled appointments.
7. `paymentRecording`: Record invoice payments and issue official receipts.
8. `administrativeAccess`: Clinic governance, module membership, staff onboarding clearances, data management.
9. `attendanceManagement`: Audit clinic-wide attendance, manage shifts, approve/reject leaves, correct records.

System modules:
- **Clinical Module (`mod-clinical`)**: Contains `consultationWorkstation`, `emrRecordsAccess`, `prescriptionAuthoring`, `consultingCalendar`.
- **Front Desk Module (`mod-frontdesk`)**: Contains `patientRegistration`, `patientCheckIn`, `paymentRecording`.
- **Administration Module (`mod-admin`)**: Contains `administrativeAccess`, `attendanceManagement`.

### 5.4 Patient Care Assignment and Scoping Rules
- Each outpatient is assigned to exactly one primary attending doctor at a time (`PatientAssignment`).
- Non-administrator doctors see clinical data strictly for currently assigned patients, plus past encounters and prescriptions they authored (read-only).
- Non-EMR staff (receptionists) access demographic data only; clinical fields (`allergies`, `chronicConditions`, `currentMedications`, `previousVitals`) are stripped at the selector layer via `scopePatientForReceptionist`.
- Care transfer requires an active destination doctor, cannot transfer during an active consultation (`in_consultation`), reallocates only open scheduled/checked-in appointments, and logs an immutable audit ledger entry.

---

## 6. WORKSTATION SPECIFICATIONS & CLINICAL WORKFLOWS

### 6.1 Role-Aware Executive Dashboard (`DashboardView.tsx`)
- **Default Landing Page**: Top navigation destination for all roles upon login.
- **Role-Scoped KPI Cards**:
  - Managing Director: 8 figures (Total Patients, Today Visits, Total Revenue in cents, Pending Approvals, Pending Leaves, Unpaid Invoices, Active Doctors, Waiting Patients).
  - Staff Doctor: 5 figures scoped strictly to own assigned patients and encounters.
  - Receptionist: 4 front-desk figures (Waiting Queue, Checked In Today, Booked Today, Completed Today).
  - Patient: 3 personal figures (Upcoming Appointments, Active Prescriptions, Outstanding Balance).
- **Accessible SVG Charts**: Trend lines and grouped bars with accessible patterns (hatched fills, dashed series lines) and screen-reader accessibility tables.
- **Needs Attention Widget**: Alerts administrators to actionable items across 5 categories:
  1. `clearances`: Pending staff onboarding clearance authorizations.
  2. `leaves`: Pending staff leave requests.
  3. `claims`: Outpatient account link claim requests.
  4. `reschedule`: Cancelled or no-show appointments requiring rescheduling.
  5. `unpaid_30`: Invoices with outstanding balances older than 30 calendar days.

### 6.2 Doctor Consultation Desk (`DoctorView.tsx`)
- **Arrival Queue & Worklist**: Paginated table (10 items/page) with fixed column widths, complaint 2-line clamp with full-text title, active encounter highlighting, and compact outline action buttons.
- **Patient Admission**: Clicking "Admit to Desk" transitions patient to `in_consultation`.
- **Clinical Triage Vitals Editor**: Directly editable inputs (Systolic BP, Diastolic BP, Heart Rate, Temperature, O2 Saturation) with previous visit baseline helper text ("Last visit: ..."), plausible clinical range validation, and "Save Vitals" persistence trigger.
- **Patient Summary Card**: Displays patient's last visit details (date, previous vitals, reason, consulting physician), chronic conditions, and current active medications with deduplication.
- **E-Prescribing Modal**: Formulary medication combobox, dosage calculator, duration options, allergen rule checking (e.g. Penicillin allergy warnings), duplicate drug detection, and mandatory clinical justification prompt for out-of-formulary prescriptions.
- **MD Supervisory Read-Only Inspection**: When Dr. Marcus Vance inspects another physician's workstation, all form controls are disabled, action buttons are suppressed, and zero "View Only" clutter is rendered.

### 6.3 Front Desk & Reception Workstation (`ReceptionistView.tsx`)
- **Four Functional Tabs**: Waiting Lounge, Appointments, Patient Directory, Intake Registry.
- **Waiting Lounge**: Daily sequential token queue resetting to 1 each day. Priority filter (All, Waiting, Urgent). Actions: "Call Next" and "Mark Completed".
- **Three Arrival Flows**:
  - Flow A (New Walk-In): Demographics-only registration with available doctor assignment and immediate token check-in.
  - Flow B (Registered Walk-In): Locked to assigned doctor with availability validation.
  - Flow C (Booked Arrival): Check-in with attending doctor availability re-verification.
- **Patient Directory**: Demographics-only roster with all medical fields stripped.
- **Intake Registry**: Chronological audit trail of all registrations and check-ins today.

### 6.4 Billing & Payments Workstation (`BillingView.tsx`)
- **Two Workstation Tabs**: Invoices and Payments.
- **Automated Billing on Visit Conclusion**: Concluding a doctor consultation automatically issues an invoice derived from the physician's standard consultation fee in minor units (cents).
- **Payment Settlement**: Record payment modal supporting Card, Cash, and Digital Wallet with minor-unit balance calculations, operator attribution, and certified printable receipts (`RCT-YYYY-XXXX`).
- **Administrative Financial Controls**: Administrators can apply discounts, void invoices (only if zero payments recorded), and reverse payments with mandatory reason logging.

### 6.5 Staff Attendance & Leave Management (`AttendanceView.tsx`)
- **Universal Personal Attendance**: Clock-in, clock-out, monthly hours summary, and leave request submission for all staff members.
- **Administrative Governance Tabs**: Today's Roster, Attendance Sheet, Leave Requests, and Shifts.
- **Shift Rostering**: Configurable shifts with start/end times and grace periods (default 15 minutes).
- **Monthly Attendance Sheet**: Status codes (P, A, LV, OFF, -) with plain-text CSV export (`attendance-YYYY-MM.csv`).

### 6.6 Access Control & Clinic Governance (`AccessControlView.tsx`)
- **Four Governance Tabs**: Add Users, Onboarding Clearances, Edit Users, Modules, and Security Ledger.
- **Module Management**: Create, configure, inspect member lists, and delete empty custom modules with name-typing confirmation.
- **Security Audit Ledger**: Immutable chronological audit log recording every state-changing mutation across the system.

### 6.7 Outpatient Health Portal (`PatientPortal.tsx`)
- **Personal Health Hub**: Medical overview, personal records, and contact details.
- **Appointments Management**: Self-service booking with assigned attending doctor.
- **Active Prescriptions Ledger**: Active medication regimens with dosage instructions.
- **Billing & Online Settlement**: Invoices and simulated online payment settlement producing official printable receipts.

---

## 7. DESIGN SYSTEM, TOKENS, CONTRAST & REFLOW ARCHITECTURE

### 7.1 Light-Mode Card Shadows & Preserved Outlines
- **Token**: Defined in `tailwind.config.js` and `src/index.css`:
  - `--shadow-card`: `0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)`
  - `--shadow-modal`: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)`
- **Application**: Applied strictly to top-level cards in the light theme only. Card outlines remain intact. Zero shadow in dark theme, print, tables, buttons, inputs, or nested containers.

### 7.2 Theme, Color Tokens & Contrast Compliance
- **Contrast Targets**: Text achieves at least 4.5:1 contrast against light and dark backgrounds; non-text boundaries (borders, chart marks) achieve at least 3:1 contrast.
- **Enforcement**: `scripts/scan-colors.ts` runs during `npm run verify` and strictly fails on any raw hex or rgb color outside token definition files.

### 7.3 Rem-Based Scale & Responsive Reflow
- **Scale**: Root font size is preserved at 16px (1rem). All typography uses rem units (`2xs`, `xs-plus`, `sm`, etc.).
- **320 CSS Pixel Reflow**: The application reflows cleanly without horizontal page scrolling at 320 CSS pixels width (WCAG 2.1 Reflow 1.4.10 compliance).

### 7.4 Accessibility & Keyboard Walking
- **Landmarks & Hierarchy**: Skip to main content link visible on focus, semantic landmarks (`header`, `nav`, `main`), polite live status region (`aria-live="polite"`), single `<h1>` per view.
- **Keyboard Traps**: Modals trap focus and return focus to opener upon closing with `Esc` key support.

---

## 8. DEMONSTRATION SCENARIO & SEED GENERATOR ENGINE

- **Seed Generator (`src/data/demoScenario.ts`)**:
  - Dynamically constructs demonstration database relative to execution time (`now: Date = new Date()`).
  - Wire directly into `seedInitialData(force)` in `src/data/storage.ts`.
- **Staff Accounts**: Exactly 5 staff members with unique names and no patient name overlap:
  - Dr. Marcus Vance, Dr. Nathan Hayes, Dr. Sophia Reed, Priya Sharma, David Kim.
- **Patient Cohort**: Exactly 7 patients (`pat-1` through `pat-7`):
  - Eleanor Wright: Penicillin and peanut allergy, ongoing antihypertensives (Amlodipine Besylate 5mg, Hydrochlorothiazide 12.5mg).
  - James Miller: Completed consultation today with electronic prescription and paid invoice.
  - Clara Thornton: Waiting in lounge today with token 2.
  - Arthur Dent: Booked appointment scheduled later today.
  - Fiona Gallagher: Unexcused no-show from yesterday requiring rescheduling.
  - Robert Chen: Unpaid specialist consultation invoice issued 35 days ago (15000 cents).
  - Maya Lin: Outpatient with pending account link claim request.
- **Operational Approvals**: Exactly 1 pending staff clearance request (`Dr. Clara Oswald`, Pediatrics, 11000 cents consultation fee).
- **Leave Requests**: Exactly 1 pending leave request (`Priya Sharma`, Casual leave).
- **Needs Attention Widget Coverage**: All 5 categories report non-zero counts for clinic administrators.
- **Business Invariant Verification**: Verified via `tests/demoScenario.test.ts` (17 unit tests).

---

## 9. VERIFICATION, QUALITY GATES & OPERATIONAL GUIDE

### 9.1 Development Server
```powershell
npm run dev
```
Runs the local Vite development server on port 3000 (`http://localhost:3000`).

### 9.2 Quality Gate Verification Script
```powershell
npm run verify
```
Executes the comprehensive release gate:
1. `npm run build`: TypeScript compilation (`tsc`) and Vite production bundle generation with 0 errors and 0 warnings.
2. `npm run typecheck`: Strict TypeScript type-checking across all application files and test suites (`tsc --noEmit`).
3. `npm run test:all-zones`: Multi-timezone Vitest test runner across UTC, America/Los_Angeles, and Asia/Kolkata (196 tests across 21 test files, 100% passing).
4. `npm run scan:emojis`: AST emoji scanner verifying zero emojis across source, scripts, tests, docs, and configs.
5. `npm run scan:commits`: Git commit message scanner verifying zero emojis across last 100 commits.
6. `npm run scan:colors`: Token scanner verifying zero raw hex or rgb color literals outside token files.

### 9.3 Release Quality Checklist
- [x] All data tables display maximum 10 items per page with working next/previous page controls.
- [x] Search bar has zero popup dialog boxes, zero Tab/Enter pills, and autofills on Tab or Enter with ghost text.
- [x] Zero emojis present anywhere in the UI, source code, comments, docs, or commit messages.
- [x] All select elements use custom `Select.tsx` with searchable combobox pattern (zero native select).
- [x] All date inputs use custom `DatePicker.tsx` (zero native date input).
- [x] Number inputs have no increment/decrement spinner arrows.
- [x] All workstation headers have zero descriptive subtitle paragraphs.
- [x] Both receptionists (Priya Sharma and David Kim) can authenticate and operate the front desk.
- [x] Managing Director supervisory read-only inspection renders without "View Only" boxes or enabled buttons.
- [x] Vitals and allergy warnings are interactively editable with context persistence.
- [x] Role-aware Dashboard serves as default landing page with summary card, inline SVG charts, and paginated lists.
- [x] Proportional column width distribution across all tables, eliminating horizontal voids and awkward line wrapping.
- [x] Uniform rounded edges (`rounded-xl`) across all dropdown triggers, inputs, and controls.
- [x] Individual Card blocks for all Dashboard summary figures in responsive grid.
- [x] Static two-layer card shadows in light theme with card outlines kept.
- [x] Text reaches 4.5:1 contrast, non-text reaches 3:1 contrast across light and dark themes.
- [x] Skip to main content link, landmarks, polite live status region, and single `<h1>` hierarchy.
- [x] Viewport reflow verified at 320 CSS pixels with zero horizontal window overflow.
- [x] ErrorBoundary catches unhandled errors and displays plain-text recovery options without stack traces in UI.
- [x] Immutable security audit ledger records entries for all state mutations.
- [x] Dynamic demo scenario relative to active execution time with non-zero Needs Attention widget across all 5 categories.
- [x] Complete demonstration walkthrough guide published in `docs/DEMO_GUIDE.md`.


---

## 10. LOGIN AND SIGN-UP SCREEN MOTION SPECIFICATION (M9.6 / M9.8 / M9.9)

### 10.1 Scope and Exception Invariant
- **Single Deliberate Exception**: Login motion is permitted exclusively on the Sign-In (`LoginView.tsx`) and Sign-Up (`SignUpView.tsx`) screens. The rest of the application strictly adheres to the "no animation or transition" rule.
- **Static Keyboard Focus Outline**: The static keyboard focus outline (`outline: 1px solid var(--focus-outline)`) remains strictly unmodified across all screens, with zero focus animation, transition, or glow.
- **Accessibility & Reduced Motion**: All motion is completely disabled when `prefers-reduced-motion` is active.
- **Zero Input Obstruction**: Motion must never use `visibility: hidden` or `pointer-events: none` on interactive controls, nor delay focus. Form inputs are focusable and typeable from the very first frame, and existing autofocus continues to operate cleanly.
- **Zero Flashing**: No flashing elements, strobes, or looping effects on form controls.

### 10.2 Motion Tokens & Curves
- **Tokens Location**: Defined in `src/styles/loginMotion.css` and `src/styles/loginMotion.ts`.
- **Durations & Intervals**:
  - `fast`: 150ms
  - `base`: 300ms
  - `slow`: 600ms
  - `staggerStep`: 70ms
  - `ecgCycle`: 10s (6s draw, 2s hold, 1s fade-out, 1s reset)
  - `maxEntrance`: 700ms total
  - `maxSuccessExit`: 400ms total
  - `introLogoFade`: 400ms
  - `introHold`: 500ms
  - `introSlide`: 650ms
  - `introNameDelay`: 150ms (duration 350ms)
  - `introChooserDelay`: 350ms (duration 450ms)
  - `introTotal`: 1900ms
  - `ecgStrokeMain`: 2.5px (opacity 0.65)
  - `ecgStrokeGlow`: 6px (opacity 0.12)
- **Entrance Easing**: `cubic-bezier(0.22, 1, 0.36, 1)`
- **Properties**: Animate `transform` and `opacity` only; apply `will-change` strictly while an animation is actively executing.

### 10.3 Opening Sequence (Intro) and Staggered Entrance
- **Full Opening Sequence (The Intro)**:
  - Plays exclusively on the first load of the login page in a browser session (`sessionStorage` flag `cms_login_intro_seen`).
  - Timeline:
    1. Logo icon fades in over 400ms while scaling from 0.9 to 1.0, centered in the viewport and alone.
    2. Logo holds centered for 500ms.
    3. Logo slides up to its final header position over 650ms using the entrance curve (`cubic-bezier(0.22, 1, 0.36, 1)`).
    4. Starting 150ms into the slide (1050ms from start), clinic name and tagline fade and rise in over 350ms.
    5. Starting 350ms into the slide (1250ms from start), chooser card fades and rises in over 450ms and becomes interactive.
    6. ECG heartbeat line begins drawing when the slide starts (900ms).
    7. Total intro sequence duration: ~1.9 seconds.
- **Zero Layout Shift (useLayoutEffect)**:
  - The starting vertical offset (`--intro-start-y`) is computed from the logo's measured final document position before first paint (`useLayoutEffect`).
  - The logo's final bounding rectangle with and without the intro is identical.
- **Inert State During Intro**:
  - Everything below the logo is marked with the HTML `inert` attribute while hidden.
  - Becomes interactive and non-inert as soon as it becomes visible at 1250ms or when skipped.
- **Skip Behavior**:
  - Any pointer or key press during the intro immediately completes it to its resting state, without losing the keypress or click's effect on the focused element.
  - Window `resize` and `orientationchange` events complete the intro immediately.
- **When It Plays vs Short Entrance**:
  - Full intro plays only on the first visit in a browser session.
  - Repeat visits in the same session, and direct links with `?as=` or `/login/<audience>`, play the short staggered entrance (<= 700ms).
  - Under `prefers-reduced-motion`, both the intro and entrance are completely bypassed: the finished page appears immediately.
- **Vertical Centering**:
  - Outermost wrapper uses `min-h-[100dvh]` with minimum padding (`py-8 sm:py-10`).
  - Active group (header + card) is centered vertically with `my-auto` when viewport is taller than content, and scrolls normally when viewport is shorter.

### 10.4 Decorative ECG Heartbeat Background (`EcgBackground.tsx`)
- **Visuals**: Inline SVG with `aria-hidden="true"` and non-focusable behind the card, presenting a repeating P-QRS-T electrocardiogram waveform spanning page width.
- **Bright Line & Glow Styling**:
  - Uses the bright accent token (`text-teal-400 dark:text-teal-300`).
  - Main top path: 2.5px stroke, 0.65 opacity, `vector-effect="non-scaling-stroke"`.
  - Underlying soft glow path: 6px stroke, 0.12 opacity, `vector-effect="non-scaling-stroke"`.
  - Zero blur filters, zero drop-shadows, zero animated glowing effects.
- **Central Column Gradient Cutout**:
  - Masked with a horizontal linear gradient that fades the line to zero across the central column (width of card plus 24px each side = 720px) so the line emerges cleanly from the left and right edges and never crosses card or text.
- **Animation Cycle**: 10-second repeating cycle: wipes left-to-right over 6s using a transform-based gradient mask cover, holds 2s, fades out over 1s, and resets. During intro, begins drawing at 900ms when slide starts.
- **Performance & Background Throttling**: Tab visibility listener (`visibilitychange`) pauses the wipe when the browser tab is hidden and resumes when visible; listeners cleanly removed on unmount.
- **Reduced Motion Fallback**: Renders the complete ECG line statically with the central mask and zero wipe or motion.
- **Responsive Layout**: Overflow is clipped on mobile viewports (360x800) with zero sideways scroll. Under 640px, the line opacity is lowered to 0.12 and positioned in the bottom third.

### 10.5 Chooser Button Layout Alignment
- **Top Alignment**: Both chooser buttons use `justify-start` so titles ("Patient" / "Clinic Staff") and muted descriptions sit at the exact same vertical height.
- **Reserved "Last Used" Line**: Both buttons reserve the "Last used" line. If an option does not show "Last used", an invisible placeholder (`&nbsp;` with `text-transparent` and `aria-hidden="true"`) is rendered so both button heights and internal baselines match identically.

### 10.5 Micro-Interactions & Form States
- **Show-Password Toggle**: Crossfades between `Eye` and `EyeOff` icons in 150ms.
- **Credentials Directory Panel**: Expands and collapses using CSS grid row transition (`grid-template-rows: 0fr` to `1fr`, 250ms) with smooth opacity fade.
- **Sign-In Button**:
  - Pressed state: `transform: scale(0.98)` for 100ms.
  - Submitting state: Displays "Signing in" with a rotating ring icon (`transform: rotate`) and disables button. Under reduced motion, displays "Signing in" text without rotation.
- **Authentication Failure**:
  - Card shakes horizontally (`transform: translateX`, 6px amplitude, 3 oscillations, 350ms duration).
  - Error notification appears in polite live region (`aria-live="polite"`).
  - Under reduced motion: Zero shake; message appears immediately.
  - Applies identically to invalid credentials, 5-attempt lockouts, and pending clearance alerts.
- **Successful Authentication Exit**:
  - Card scales to 0.98 and fades out over 250ms before navigation completes (total elapsed time strictly <= 400ms).
  - Under reduced motion: Navigates immediately with 0ms delay.

### 10.6 Footer Security Text
- Card footer displays plain text: `"Demo environment. Do not enter real patient data."` (text only, decorative check icon removed), accurately reflecting local browser storage.

## 11. Authentication Audience Chooser Step and Portal Routing (M9.8)

### 11.1 Audience Segregation
- **Audiences**:
  - Patient: Accounts with role patient. Accesses the Patient Portal.
  - Clinic Staff: Accounts with roles md, doctor, receptionist, and administrative aliases or future staff roles. Accesses clinical, operational, and administrative medical stations.
- **Dedicated Portals**:
  - Each audience has its own dedicated sign-in and sign-up interface.
  - An account can only authenticate through its designated audience portal.

### 11.2 Authentication Results and Security Invariants
- login(identifier, password, audience) returns one of seven canonical result codes:
  1. success: Valid credentials matching the selected audience; session initialized.
  2. invalid: Non-existent account or wrong password. Generic notice is returned with zero leakage of account existence.
  3. locked: Account temporarily locked due to 5 consecutive failed password attempts.
  4. pending: Self-registered account awaiting admin clearance or patient record linkage.
  5. rejected: Account application declined by clinic administrator.
  6. suspended: Account or station credentials revoked by Managing Director.
  7. wrongPortal: Password is confirmed valid for an account belonging to the alternate audience.
- **Timing and Security Invariants**:
  - Password is verified first. If incorrect, generic invalid is returned without evaluating audience, preventing user enumeration.
  - wrongPortal does not increment failed attempt counters or trigger account lockout.
  - wrongPortal copy: `"This is a clinic staff account. Use the Clinic Staff option."` / `"This is a patient account. Use the Patient option."` with text button `"Switch to [audience]"` that switches forms while preserving the identifier.
  - audienceOf(account) is the single canonical source of truth for audience derivation.

### 11.3 Account Type Chooser Step and Navigation Flow
- **Account Type Chooser Step (Default Step)**:
  - Default step when no `?as=` query parameter is present in the URL.
  - Displays the clinic logo, clinic name (`Beacon Health Clinic`), tagline, plain heading `"Who is signing in?"`, and two large equal buttons side by side (stacked below 640px, each min 88px high):
    1. `"Patient"` with muted line `"Records, bookings and bills"`
    2. `"Clinic Staff"` with muted line `"Doctors, receptionists and administrators"`
  - Outlined style using the same border and background tokens as the card (`border-slate-200`, `bg-white`). No icons, no tinted or filled shapes, real buttons with static keyboard focus outline.
  - Last used audience from `localStorage` is auto-focused first and shows the plain muted text `"Last used"` under its line; it does not skip the chooser.
  - Demo mode: Chooser step displays only the plain `"Reset demo data"` text button at the bottom.
- **Form Step**:
  - Selecting an audience pushes a browser history entry and replaces the chooser with that audience's sign-in form.
  - Card top line reads `"Signing in as Patient"` or `"Signing in as Clinic Staff"` with text button `"Change"` on the right.
  - Clicking `"Change"` returns to the chooser step, clears the `as` query parameter, and restores focus to the selected option button.
  - Browser Back button triggers `popstate` and returns cleanly to the chooser step.
  - URL is read before the first render so the wrong step never flashes.
  - In demo mode, the form step shows the credentials directory filtered strictly to that audience.
- **Sign-Up Flow**:
  - `"Create account"` opens the sign-up form for the same audience.
  - Top line reads `"Creating a Patient account"` or `"Creating a Clinic Staff account"` with `"Change"` and `"Back to sign in"` links.
  - Changing audience preserves name, email, phone, and sign-in identifier while clearing password inputs.
- **Removal of Tabs**:
  - The tab component, `role="tab"`, `role="tablist"`, and tab CSS are completely removed from all authentication screens.
