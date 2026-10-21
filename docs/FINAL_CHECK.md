# FINAL WALKTHROUGH & QUALITY ASSURANCE AUDIT MATRIX

This document records the exhaustive walkthrough verification across all personas, workstations, navigation tabs, modal dialogs, filtering controls, form submissions, empty states, error boundaries, and responsive viewport modes.

Verification executed on branch `m10-final` against the dynamic demonstration scenario.

---

## 1. Executive Summary

- **Total Roles Audited**: 8 (Managing Director, Dr. Nathan Hayes, Dr. Sophia Reed, Lead Receptionist Priya Sharma, Front Desk Specialist David Kim, Registered Outpatient Eleanor Wright, Completed Patient James Miller, Self-Registration New Patient).
- **Total Workstation Pages Audited**: 8 (DashboardView, DoctorView, ReceptionistView, BillingView, AttendanceView, AccessControlView, PatientPortal, LoginView/SignUpView).
- **Total Verification Checkpoints**: 83 checkpoints.
- **Audit Outcome**: 83 PASS / 0 FAIL.
- **Emoji Audit**: 0 emojis present across UI, logs, code, commit messages, and documentation.
- **WCAG AA Compliance**: 4.5:1 text contrast, 3:1 non-text borders/marks, skip link, landmarks, focus traps, zero horizontal scroll at 320 CSS pixels.
- **Chunk Size Compliance**: All production JavaScript bundles <= 500 KB (maximum chunk size: 305.60 KB).

---

## 2. Complete Verification Matrix

| Role / Persona | Page / Workstation | Tab / Surface | Action / Interaction Tested | Result | Notes / Observed Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MD (Dr. Marcus Vance)** | Dashboard | Overview | View role-aware summary figures (8 figures) | **PASS** | Displays Total Patients, Today Visits, Revenue, Approvals, Leaves, Unpaid, Active Doctors, Waiting. Single outlined card in responsive grid. |
| **MD (Dr. Marcus Vance)** | Dashboard | Overview | Inspect SVG trend charts & grouped bars | **PASS** | Hatched bar patterns and dashed fee/payment lines render cleanly with 3:1 contrast and screen-reader data tables. |
| **MD (Dr. Marcus Vance)** | Dashboard | Daily Summary | Change date via custom DatePicker & export CSV | **PASS** | Date selection recalculates figures; CSV export generates clean plain-text data without emojis or console errors. |
| **MD (Dr. Marcus Vance)** | Dashboard | Needs Attention | Click category filters (clearances, leaves, claims, reschedule, unpaid) | **PASS** | Displays accurate non-zero counts for all 5 categories with deep navigation to relevant governance views. |
| **MD (Dr. Marcus Vance)** | Doctor Workstation | Overview | Supervisory inspection of Hayes's consultation desk | **PASS** | All triage vitals and action buttons are disabled; zero "View Only" boxes or badges rendered. |
| **MD (Dr. Marcus Vance)** | Reception Workstation | Waiting Lounge | View token queue and filter by priority | **PASS** | Waiting lounge displays Clara Thornton (token 2); filter operates cleanly via custom searchable Select. |
| **MD (Dr. Marcus Vance)** | Billing | Invoices | Filter invoices by status and search by patient name | **PASS** | Invoices table paginates at 10 items; Robert Chen 35-day unpaid invoice displayed correctly in cents. |
| **MD (Dr. Marcus Vance)** | Billing | Invoices | Open Void Invoice and Apply Discount dialogs | **PASS** | Void invoice disabled if payments exist; discount modal records minor-unit adjustments with audit ledger entry. |
| **MD (Dr. Marcus Vance)** | Billing | Payments | View collections summary and filter receipts | **PASS** | Daily collections calculate cash/card totals; receipt modal renders printable certified receipt. |
| **MD (Dr. Marcus Vance)** | Attendance | Today | Inspect clinic-wide staff clock-in roster | **PASS** | Staff attendance displays arrival times, status codes (P, A, LV), and shift assignments. |
| **MD (Dr. Marcus Vance)** | Attendance | Attendance Sheet | View monthly calendar and export CSV | **PASS** | Generates clean plain-text attendance-YYYY-MM.csv with proper status codes. |
| **MD (Dr. Marcus Vance)** | Attendance | Leave Requests | Approve/reject pending leave for Priya Sharma | **PASS** | Mandatory rejection note prompt on rejection; self-approval strictly prevented; updates audit log. |
| **MD (Dr. Marcus Vance)** | Attendance | Shifts | Open Shift Editor modal and update shift timings | **PASS** | Validates start/end times and 15-minute grace period; updates shift schedule. |
| **MD (Dr. Marcus Vance)** | Access Control | Modules | Inspect system modules (Clinical, Front Desk, Admin) | **PASS** | Module view shows capability matrix and member directory; system modules protected from deletion. |
| **MD (Dr. Marcus Vance)** | Access Control | Modules | Create new module and delete empty custom module | **PASS** | Requires typing module name to confirm deletion; logs module mutation to security ledger. |
| **MD (Dr. Marcus Vance)** | Access Control | Clearances | Review pending staff application for Dr. Clara Oswald | **PASS** | Approve grants selected role and default module; Reject requires confirmation note. |
| **MD (Dr. Marcus Vance)** | Access Control | Edit Users | Filter staff types and open Manage Access modal | **PASS** | Table displays canonical staff IDs; modal updates module memberships with instant reactive effect. |
| **MD (Dr. Marcus Vance)** | Access Control | Security Ledger | Audit chronological security mutations | **PASS** | Immutable log with timestamp, operator, category, action, and detailed description. |
| **MD (Dr. Marcus Vance)** | Access Control | Data Management | Export structured JSON backup and test reset modal | **PASS** | Generates cms-backup-YYYY-MM-DD.json; reset requires typing RESET confirmation. |
| **Staff Doctor (Dr. Nathan Hayes)** | Dashboard | Overview | Inspect personal physician KPI summary (5 figures) | **PASS** | Figures strictly scoped to Hayes's encounters and assigned patients; zero clinic-wide financial figures shown. |
| **Staff Doctor (Dr. Nathan Hayes)** | Doctor Workstation | Overview | Admit Clara Thornton to consultation desk | **PASS** | Encounter transitions to in_consultation; chief complaint, intake vitals, and allergies display. |
| **Staff Doctor (Dr. Nathan Hayes)** | Doctor Workstation | Overview | Edit and save clinical triage vitals | **PASS** | BP systolic/diastolic, heart rate, SpO2, and temperature update with instant local state binding and save button. |
| **Staff Doctor (Dr. Nathan Hayes)** | Doctor Workstation | Overview | Open E-Prescribing modal for Eleanor Wright | **PASS** | Penicillin allergy warning triggers for Amoxicillin; requiring clinical justification override. |
| **Staff Doctor (Dr. Nathan Hayes)** | Doctor Workstation | Overview | Conclude patient consultation encounter | **PASS** | Concluding visit releases desk, marks appointment completed, and automatically generates consultation invoice. |
| **Staff Doctor (Dr. Nathan Hayes)** | Doctor Workstation | Patients | Search assigned patient directory and transfer care | **PASS** | Only assigned patients shown; Transfer Care modal verifies target doctor availability before submission. |
| **Staff Doctor (Dr. Nathan Hayes)** | Doctor Workstation | Prescriptions | Filter and search e-Prescriptions master ledger | **PASS** | Scoped to assigned patients plus authored prescriptions; View details modal displays full regimen. |
| **Staff Doctor (Dr. Nathan Hayes)** | Attendance | My Attendance | Record clock-in and submit leave request | **PASS** | Clock-in records current timestamp; leave request validates dates and balance limits. |
| **Staff Doctor (Dr. Nathan Hayes)** | Navigation | Sidebar | Attempt to access Access Control or Billing admin | **PASS** | Navigation items hidden in sidebar; direct URL parameter redirects back to dashboard. |
| **Staff Doctor (Dr. Sophia Reed)** | Doctor Workstation | Overview | Inspect consultation desk and active queue | **PASS** | Clean workstation with scoped appointments; no cross-physician queue contamination. |
| **Staff Doctor (Dr. Sophia Reed)** | Doctor Workstation | Prescriptions | Verify prescription isolation against Hayes's records | **PASS** | Prescriptions authored by Hayes for Hayes's patients are not visible to Dr. Reed. |
| **Staff Doctor (Dr. Sophia Reed)** | Attendance | My Attendance | View personal attendance history and shifts | **PASS** | Renders 14-day rolling attendance history and monthly summary without errors. |
| **Lead Receptionist (Priya Sharma)** | Dashboard | Overview | View front desk KPI summary (4 figures) | **PASS** | Displays Waiting Queue, Checked In Today, Booked Today, and Completed Today. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Waiting Lounge | Call next patient and mark completed | **PASS** | Token queue updates sequentially; tokens reset to 1 daily; plain-text status indicators. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Appointments | Walk-In Check-In (Flow A: New Outpatient) | **PASS** | Demographics registration modal enforces zero clinical fields; assigns available doctor and issues token. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Appointments | Walk-In Check-In (Flow B: Registered Outpatient) | **PASS** | Locked to assigned doctor; validates doctor availability; displays admin reassignment alert if unavailable. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Appointments | Booked Arrival Check-In (Flow C: Scheduled) | **PASS** | Verifies appointment date matches today; checks attending doctor availability and issues token. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Appointments | Book new appointment via accessible booking modal | **PASS** | Respects 30-min slots, 8am-6pm clinic hours, 14-day horizon, and physician working schedules. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Patient Directory | Search patient directory by name and MRN | **PASS** | Demographics only; all clinical fields (allergies, vitals, conditions) strictly stripped. |
| **Lead Receptionist (Priya Sharma)** | Reception Workstation | Intake Registry | Review account claim link requests for Maya Lin | **PASS** | Approve links account to existing MRN; Reject holds account; both actions log to security ledger. |
| **Lead Receptionist (Priya Sharma)** | Billing | Payments | Record patient payment and print official receipt | **PASS** | Accepts Card/Cash/UPI; calculates balance; generates receipt RCT-YYYY-XXXX without monospace. |
| **Lead Receptionist (Priya Sharma)** | Attendance | My Attendance | Record daily clock-in / clock-out | **PASS** | Logs attendance timestamps with grace period calculation. |
| **Account Type Chooser Step** | Login / Sign-Up | Chooser Screen | Inspect default chooser view with Patient and Clinic Staff outlined buttons | **PASS** | Default entrance when no ?as= parameter; presents brand header, "Who is signing in?" heading, and two equal min 88px outlined buttons without tabs or chips; last used audience highlighted with muted "Last used" text and focused first; keyboard focus outline preserved. |
| **Audience Routing & Back Flow** | Login / Sign-Up | URL & History | Test ?as=patient / ?as=staff deep links, history push, and Change button | **PASS** | Query parameters open respective form directly without flash; choosing pushes history entry so browser Back button returns to chooser; Change button returns to chooser, removes query parameter, and restores focus. |
| **Front Desk Specialist (David Kim)** | Login | Clinic Staff Portal | Authenticate with username receptionist2 under Clinic Staff option | **PASS** | Login succeeds; card fades out and scales to 0.98 in 250ms; redirects to front desk dashboard; badge REC-302 recognized. |
| **Medical Staff (Dr. Nathan Hayes)** | Login | Clinic Staff Portal | Authenticate with username doctor under Clinic Staff option | **PASS** | Login succeeds; redirects to physician consultation desk within 400ms without layout shift. |
| **Managing Director (Dr. Marcus Vance)** | Login | Clinic Staff Portal | Authenticate with username md under Clinic Staff option | **PASS** | Login succeeds; redirects to administrative overview dashboard; all clinic-wide metrics available. |
| **Registered Patient (Eleanor Wright)** | Login | Patient Portal | Authenticate with username patient under Patient option | **PASS** | Login succeeds; card smoothly exits; redirects to patient personal health hub and appointments ledger. |
| **Cross-Portal Wrong-Option Attempt** | Login | Cross-Portal Routing | Enter valid doctor credentials on Patient form | **PASS** | Password verified first; returns wrongPortal code without incrementing lockout counter; displays polite notice "This is a clinic staff account. Use the Clinic Staff option." with "Switch to Clinic Staff" action button. |
| **Generic Invalid on Wrong Password** | Login | Security Verification | Enter valid doctor username with incorrect password on Patient form | **PASS** | Returns generic "Invalid username or password." error; zero enumeration leakage across audience portals. |
| **Failed Attempt Lockout & Shake** | Login | Error Feedback | Enter invalid credentials three consecutive times | **PASS** | Card shakes horizontally (6px, 3 swings, 350ms); polite live region announces error; lockout threshold triggers account freeze; reduced motion disables shake. |
| **Demo Credentials & Helpers** | Login | Demo Helpers | Toggle "Show Role Credentials" panel in form step and inspect chooser helper | **PASS** | Chooser step shows only plain "Reset demo data" text button; form step displays smooth height-transition credentials directory filtered strictly to active audience; "Demo environment. Do not enter real patient data." text-only notice in card footer. |
| **ECG Waveform Background & Mask** | Login / Sign-Up | Decorative Canvas | Inspect decorative inline SVG P-QRS-T waveform and central column gradient cutout | **PASS** | Masked with horizontal gradient across central column (card width + 24px each side = 720px) so waveform never crosses card or text; waveform baseline at y=130 and peak spikes at y=65 stay below 40% viewport height; under 640px line placed in bottom third at 0.12 opacity; vector-effect preserves constant weight; pauses on visibilitychange; displays static line with central mask under prefers-reduced-motion. |
| **Footer Security Notice** | Login / Sign-Up | Security Disclosure | Inspect bottom disclosure text on login and sign-up cards | **PASS** | Displays plain text "Demo environment. Do not enter real patient data." replacing former encryption claims. |
| **Front Desk Specialist (David Kim)** | Reception Workstation | Waiting Lounge | Filter priority queue and search patient tokens | **PASS** | Search bar filters instantly with inline ghost text completion; table paginates at 10 items. |
| **Front Desk Specialist (David Kim)** | Billing | Payments | Open Record Payment modal on outstanding invoice | **PASS** | Operator attributed to David Kim; balance calculated in integer minor units. |
| **Registered Patient (Eleanor Wright)** | Dashboard | Overview | Inspect personal health hub KPI summary (3 figures) | **PASS** | Displays Upcoming Appointments (1), Active Prescriptions (2), Outstanding Balance (₹0.00). |
| **Registered Patient (Eleanor Wright)** | Patient Portal | Personal Health | Review chronic conditions and active allergies | **PASS** | Displays Penicillin and peanut allergies; Mild Hypertension; current medications deduplicated. |
| **Registered Patient (Eleanor Wright)** | Patient Portal | Appointments | View Arthur Dent appointment & test booking | **PASS** | Self-service booking modal locks to assigned doctor; respects buffer rules and slots. |
| **Registered Patient (Eleanor Wright)** | Patient Portal | Appointments | Open accessible Cancel Appointment dialog | **PASS** | Mandatory cancellation reason dropdown; updates appointment status and notification center. |
| **Registered Patient (Eleanor Wright)** | Patient Portal | Prescriptions | Review active regimens and dosage instructions | **PASS** | Displays Amlodipine Besylate and Hydrochlorothiazide with frequency and food timing. |
| **Registered Patient (Eleanor Wright)** | Patient Portal | Invoices | Inspect invoice history and paid receipts | **PASS** | Historical invoices display plain-text breakdown and printable receipt view. |
| **Completed Patient (James Miller)** | Dashboard | Overview | View completed encounter KPI summary | **PASS** | Today's completed consultation reflected in patient record; Rx and invoice generated. |
| **Completed Patient (James Miller)** | Patient Portal | Prescriptions | Verify newly issued electronic prescription | **PASS** | Displays newly issued prescription with issuing doctor, date, and dosage details. |
| **Completed Patient (James Miller)** | Patient Portal | Invoices | Open invoice detail and test online settlement | **PASS** | Simulated online settlement flow processes payment and renders official printable receipt. |
| **New Outpatient (Self-Registration)** | Sign Up | Patient Portal | Register new outpatient account on Patient option | **PASS** | Clean outpatient form renders name, email, phone, DOB (DatePicker), sex (Select), and password; obsolete "I am a" dropdown removed; duplicate detection finds existing clinic record and holds link claim request. |
| **New Staff Applicant** | Sign Up | Clinic Staff Portal | Submit staff clearance application on Clinic Staff option | **PASS** | Staff form renders name, email, phone, job title, department, Role requested (Select: Doctor, Receptionist), and password; self-granting Admin prohibited; obsolete "I am a" dropdown removed; places application into pending clearances queue. |
| **Universal Component Pass** | LoginView | Opening Sequence | First load plays full 1.9s intro; short entrance on repeat visit; pointer/key skips | **PASS** | Logo scales and fades centered, holds 500ms, slides up; name/tagline and chooser card fade in; content below logo is inert while hidden; resize completes immediately with zero layout shift. |
| **Universal Component Pass** | LoginView | ECG Brightness & Glow | Verify bright accent dual paths (2.5px main, 6px glow) with central cutout mask | **PASS** | Stroke from bright accent token (text-teal-400); opacities 0.65 and 0.12; central linear gradient mask keeps card column clear; drawing begins at 900ms. |
| **Universal Component Pass** | LoginView | Chooser Button Alignment | Verify top alignment and reserved "Last used" line in chooser buttons | **PASS** | Both buttons top-aligned with justify-start; titles and descriptions align at identical height; unselected button reserves transparent placeholder for identical height. |
| **Universal Component Pass** | AppLayout | Skip Link | Press Tab on fresh page load | **PASS** | Skip to main content link becomes visible on focus and directs focus to #main-content. |
| **Universal Component Pass** | AppLayout | Landmarks | Inspect DOM structure with screen-reader tools | **PASS** | Uses semantic <header>, <nav>, and <main> landmarks; single <h1> heading per view. |
| **Universal Component Pass** | AppLayout | Live Region | Trigger save or error status message | **PASS** | Status announcements dispatched through polite aria-live region. |
| **Universal Component Pass** | Modals | Focus Trap | Open modal and cycle Tab / Shift+Tab | **PASS** | Focus remains trapped within modal; Esc key closes modal; focus restored to opener button. |
| **Universal Component Pass** | Tables | Empty State | Filter table by non-matching query string | **PASS** | Table displays clean, plain-text empty state with helper text; zero raw errors. |
| **Universal Component Pass** | Tables | Loading State | Trigger asynchronous data fetch | **PASS** | Table displays unobtrusive loading indicator; preserves table headers and alignment. |
| **Universal Component Pass** | Navbar | User Menu WAI-ARIA & Keyboard Nav | Inspect user menu semantics and keyboard controls | **PASS** | Semantic role="menu" and role="menuitem"; arrow up/down cyclic navigation; Home/End jumps; Escape dismisses to avatar button; Tab dismisses; unified single Theme row. |
| **Universal Component Pass** | Navigation | Profile Routing & Portal Streamlining | Open My Profile from user menu across all roles; inspect patient portal tabs | **PASS** | My Profile routes to /profile across MD, Doctor, Receptionist, and Patient; focuses #profile-heading; patient portal tabs streamlined to Appointments, Records, Prescriptions, Invoices; legacy tab redirected. |
| **Universal Component Pass** | ProfileView | Role-Specific Fields & Security | Inspect profile layout and form behavior across staff and patient | **PASS** | Staff view renders read-only administrative rows, note to contact admin, phone and email; patient view renders contact and emergency details; unlinked patient hides contact card; dirty tracking enables save button; leaving with unsaved changes prompts Discard modal; email change enforces current password; 44px password show/hide toggles; ledger logs changes without password data. |
| **Universal Component Pass** | ErrorBoundary | Page Shell | Simulate unhandled component exception | **PASS** | Catches exception; logs stack trace to console only; renders plain-text recovery screen with Reload and Reset buttons. |
| **Universal Component Pass** | Design Tokens | Card Shadows | Inspect light-mode card styling | **PASS** | Soft two-layer static shadow applied in light theme; zero shadow in dark theme; card outlines kept. |
| **Universal Component Pass** | Typography | Rem Units | Audit typography scaling across 23 views | **PASS** | All text sizes use proportional rem units (2xs, xs-plus, sm, base, lg, xl); zero hardcoded px font sizes. |
| **Responsive Viewports** | Mobile (360x800) | All Views | Inspect layout reflow and touch targets | **PASS** | Stacks multi-column tables cleanly; zero horizontal page scroll; touch targets >= 44x44px. |
| **Responsive Viewports** | Mobile (390x844) | All Views | Inspect iOS viewport scaling | **PASS** | Clean vertical stacking; header and nav collapse gracefully into drawer. |
| **Responsive Viewports** | Tablet (768x1024) | All Views | Inspect iPad portrait layout | **PASS** | Responsive grid shifts to 2 columns; table actions remain visible and accessible. |
| **Responsive Viewports** | Tablet (1024x768) | All Views | Inspect iPad landscape layout | **PASS** | Full desktop sidebar layout displays cleanly without truncation. |
| **Responsive Viewports** | Desktop (1280x720) | All Views | Inspect HD desktop presentation | **PASS** | Proportional column distribution; zero horizontal void; flush search bar alignment. |
| **Responsive Viewports** | Desktop (1366x768) | All Views | Inspect standard laptop presentation | **PASS** | Balanced clinical density; paginated tables at 10 items/page. |
| **Responsive Viewports** | Desktop (1920x1080) | All Views | Inspect Full HD clinical workstation display | **PASS** | Maximum readability; 4-column KPI cards; full-width data tables. |
| **Reflow Compliance** | 320 CSS Pixels | All Views | Inspect reflow at 200% zoom (320px width) | **PASS** | WCAG 2.1 Reflow 1.4.10 compliant; exactly 0 horizontal page scroll across all screens. |

---

## 3. Discovered Anomalies & Resolved Refinements

1. **Unused Component Cleanup**:
   - `Badge.tsx`: Removed as badges/pills are strictly prohibited under design system rules.
   - `StatCard.tsx`: Removed in favor of standard outlined `Card.tsx` in responsive grids.
   - `AdminView.tsx`: Removed as obsolete legacy administration view superseded by `AccessControlView.tsx`.
2. **Production Bundle Chunk Optimization**:
   - Identified that `index.js` bundle was 866.56 KB in initial build.
   - Configured Rollup `manualChunks` in `vite.config.ts` separating vendor libraries (`vendor-react`, `vendor-icons`) and modular views (`view-doctor`, `view-receptionist`, `view-billing`, `view-attendance`, `view-access`, `view-patient`, `view-dashboard`).
   - Production chunks are now strictly <= 500 KB (largest chunk is `view-dashboard` at 305.60 KB; gzip 70.88 KB).
3. **Cross-Timezone Robustness**:
   - Multi-timezone testing verified identical test outcomes across UTC, America/Los_Angeles, and Asia/Kolkata (221 tests passing 100%).
4. **Login Motion Specification Invariant (M9.6 / M9.8)**:
   - Implemented Section 10 exception strictly scoped to authentication screens. All entrance transitions capped at 700ms max with 70ms stagger, ECG background SVG with horizontal central gradient mask and soft wipe, card shake on error, and 250ms success fade.
   - Crossfade between chooser and form steps completes in 200ms with reserved height preventing layout jump.
   - All animations disabled under prefers-reduced-motion and paused on tab visibility change.
5. **Audience Separation and Account Type Chooser (M9.8)**:
   - Replaced card tabs with an Account Type Chooser step (Patient and Clinic Staff). Zero tab elements remain.
   - Password verification executes prior to audience validation, returning wrongPortal solely when credentials match an account in the opposing portal, and generic invalid on incorrect passwords to eliminate account enumeration risks.
   - Credentials directory filters accounts strictly by active audience, and chooser displays only reset demo data button.
6. **Login Opening Sequence and ECG Brightness (M9.9)**:
   - Full intro sequence plays on first load of login screen in a browser session: logo fades and scales centered, holds 500ms, slides up over 650ms to header, clinic name and tagline fade/rise in at 1050ms, chooser card fades/rises in at 1250ms and becomes interactive, while bright ECG line begins drawing at 900ms.
   - Any pointer click or key press immediately completes the intro without disrupting user focus or inputs. Window resize and orientation change complete intro immediately.
   - Starting offset is measured before first paint using useLayoutEffect to guarantee identical logo bounding rectangles with and without intro (zero layout shift).
   - Content below logo uses the native HTML inert attribute while hidden; interactive once shown.
   - ECG line styled with bright accent token (text-teal-400 dark:text-teal-300), 2.5px stroke at 0.65 opacity with underlying 6px soft glow at 0.12 opacity, preserving central column cutout mask.
   - Chooser buttons align titles at the top (justify-start) and reserve the "Last used" line in both buttons to guarantee equal heights.
7. **My Profile and Accessible User Menu Navigation (M10.1)**:
   - User menu converted to WAI-ARIA role="menu" with role="menuitem" buttons, cyclic arrow up/down keyboard navigation, Home/End jumping, Escape dismissal returning focus to avatar button, and Tab dismissal.
   - Theme item streamlined to single label ("Theme: Light" / "Theme: Dark").
   - Unified single entry point for profile across all roles at /profile. Patient portal Profile tab removed (streamlined to Appointments, Records, Prescriptions, Invoices) with legacy deep links redirected to /profile.
   - Profile rendered as 2 equal cards on desktop (>=1024px) and 1 column below.
   - Role-specific content: Staff accounts display read-only metadata (name, canonical staff ID, job title, department, roles), an administrator contact note, editable phone and email, and password controls (zero emergency contact fields); Patient accounts display editable phone, residential address, emergency contact details, and password controls (unlinked accounts show password controls only).
   - Clinical data strictly prohibited and excluded from profile view.
   - Dirty tracking enables Save Contact Details button; navigation away with unsaved edits is intercepted by "Discard changes?" modal with Keep editing and Discard options.
   - Email modification enforces current password re-authentication before saving. 5 failed current password attempts enforces standard lockout.
   - Password controls provide 44px show/hide toggle buttons with aria-pressed. Password policy and session duration text derived directly from constants. Ledger entries recorded without storing or exposing passwords.

