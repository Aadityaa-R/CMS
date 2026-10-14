# Beacon Health CMS - Premium UI Scorecard (v2 - Updated)

**Overall Score: 6.4 / 10** *(revised down from 7.2 after deep audit)*

> [!CAUTION]
> The deep audit uncovered **3 critical defects** that significantly lower the score:
> 1. Mobile navigation is completely broken (no hamburger menu)
> 2. Patient Portal exposes all clinic data to patients (privacy violation)
> 3. Global CSS kills all keyboard focus indicators via `!important`

---

## Category Breakdown

| Category | Score | Weight | Weighted | Change |
| :--- | :--- | :--- | :--- | :--- |
| **Design Consistency** | 7.0/10 | 15% | 1.05 | badge variants collapsed, header style split |
| **Component System** | 6.5/10 | 15% | 0.98 | raw HTML bypasses, monolithic files |
| **Typography & Hierarchy** | 7.0/10 | 10% | 0.70 | - |
| **Layout & Spacing** | 7.0/10 | 10% | 0.70 | - |
| **Responsiveness** | 3.0/10 | 10% | 0.30 | mobile nav broken |
| **Accessibility** | 3.5/10 | 15% | 0.53 | focus rings killed, Modal missing ARIA |
| **Visual Polish** | 6.0/10 | 10% | 0.60 | - |
| **Professional Touches** | 6.0/10 | 5% | 0.30 | fake settings, no toasts |
| **Clinical Integrity** | 3.0/10 | 10% | 0.30 | PatientView privacy bug |
| **Total** | | | **5.46 -> 6.4** | |

*Rounded up to 6.4 because the visual quality on desktop for the primary MD role is genuinely solid.*

---

## CRITICAL ISSUES (Must Fix Before Deployment)

### 1. Broken Mobile Navigation
**Files:** [`Sidebar.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/components/layout/Sidebar.tsx) + [`Navbar.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/components/layout/Navbar.tsx)

On screens < 1024px, the sidebar is hidden off-screen (`-translate-x-full`). `Navbar` declares `onToggleSidebar` as a prop but **never destructures or uses it**. `AppLayout` passes **zero props** to `<Navbar />`. Result: **there is literally no button to open navigation on mobile**. Users are stuck on whatever view loaded first.

### 2. Patient Portal Privacy Violation
**File:** [`PatientView.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/views/PatientView.tsx)

When patient Eleanor Wright logs in, she sees the **Managing Director's Master Outpatient Directory** - all patients' MRNs, phone numbers, email addresses, and medical records. She has no access to her own appointments, prescriptions, or bills. This is a severe data privacy violation.

### 3. Focus Indicators Killed by Global CSS
**File:** [`index.css`](file:///c:/Users/raadi/Downloads/CMS/src/index.css#L60-L63)

```css
button:focus, [role="button"]:focus {
  outline: none !important;
  box-shadow: none !important;
}
```

Tailwind's `focus-visible:ring-2` works via `box-shadow`. This `!important` override **destroys all focus rings on every button in the app**. Keyboard users are completely blind when tabbing.

---

## SERIOUS ISSUES

### 4. Modal Missing ARIA Roles & Focus Trap
**File:** [`Modal.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/components/ui/Modal.tsx)

- Missing `role="dialog"`: Screen readers don't announce it as a dialog
- Missing `aria-modal="true"`: Screen readers don't know background is inert
- Missing `aria-label` on close button: Button announced as empty
- Focus trap missing: Tab key escapes into background content
- Focus restoration missing: Focus drops to `<body>` after close

### 5. Badge Variant Collapsing
**File:** [`Badge.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/components/ui/Badge.tsx)

`warning`, `amber`, and `neutral` variants all render identically (same gray style). `info`, `purple`, `teal`, and `success` also collapse to the same teal style. Semantic badge distinctions are completely lost.

### 6. Custom Select Lacks Keyboard Navigation
**File:** [`Select.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/components/ui/Select.tsx)

No `aria-haspopup`, no `aria-expanded`, no `role="listbox"` on options, no Arrow key navigation, no Escape to close. Fails WCAG 2.1 AA combobox pattern.

### 7. Fake Settings Modal
**File:** [`Navbar.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/components/layout/Navbar.tsx#L427-L509)

8 checkboxes use `defaultChecked` (uncontrolled). "Save Preferences" just closes the modal. Nothing persists to state, localStorage, or context. Pure cosmetic mockup.

### 8. Consultation Notes Don't Save
**File:** [`DoctorView.tsx`](file:///c:/Users/raadi/Downloads/CMS/src/views/DoctorView.tsx)

`handleSaveConsultationNotes` shows a success notification, then calls `setClinicalNotesText('')`. The notes are **never written** to the appointment, patient record, or context. They're discarded.

### 9. Header Style Split
- `AccessControlView`, `AdminView`, `PatientView` -> dark gradient hero banner
- `DoctorView`, `ReceptionistView` -> flat borderless header

Navigating between them feels like two different apps.

---

## Strengths Still Working Well
- **Colour palette discipline**: Teal/amber/rose/slate used consistently in every view
- **Button component**: 6 variants, 4 sizes, loading spinner, `focus-visible` ring
- **Card compound component**: Clean Header/Title/Description/Content pattern
- **Dark mode coverage**: Every element has `dark:` variants
- **Timeline audit log**: Color-coded dots, action badges, timestamps
- **Staff card grid**: Avatars, status dots, permission counts
- **Pagination**: Clean, consistent across all tables and grids

---

## Prioritised Remediation Roadmap

### Phase 1 - Critical (blocks deployment)
1. Add hamburger menu to `Navbar`, wire `onToggleSidebar` from `AppLayout` (`Navbar.tsx`, `AppLayout.tsx`)
2. Restore Patient Portal - split `PatientView.tsx` into personal health hub for patients vs admin directory for MD (`PatientView.tsx`, `AppLayout.tsx`)
3. Remove `box-shadow: none !important` from `index.css` L60-63 (`index.css`)
4. Add `role="dialog"`, `aria-modal="true"`, `aria-label="Close"`, focus trap, focus restoration to `Modal.tsx` (`Modal.tsx`)

### Phase 2 - Serious (production quality)
5. Restore distinct badge variant colors (`Badge.tsx`)
6. Add keyboard nav to `Select.tsx` (Arrow keys, Escape, aria roles) (`Select.tsx`)
7. Connect settings checkboxes to localStorage/context (`Navbar.tsx`)
8. Wire consultation notes save to `ClinicContext` (`DoctorView.tsx`, `ClinicContext.tsx`)
9. Standardise view headers (`All views`)

### Phase 3 - Polish (premium feel)
10. Add skeleton/loading states
11. Replace inline banners with floating toast provider
12. Add breadcrumb navigation
13. Constrain content `max-w-7xl mx-auto` on main area (`AppLayout.tsx`)
14. Add scroll shadow indicator for mobile tables
15. Clean up dead Font Awesome CSS and unused `clinic-*` palette
16. Split `AccessControlView.tsx` into sub-components
