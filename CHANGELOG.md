# Changelog

All notable changes to the Beacon Health Clinic Management System will be documented in this file.

## [Unreleased] - 2026-10-21

### Added
- Sidebar Layout Non-Covering Two-Column Shell & Bubbling Click Dismissal (M10.8b):
  - Amended M10.8 sections 2 and 5 to establish a true two-column shell where Column 1 is the sidebar (3.5rem collapsed, 15rem expanded) and Column 2 contains the header and page content together.
  - Eliminated desktop spacer elements and fixed viewport positioning on desktop; expanding Column 1 moves Column 2 synchronously so nothing in the header or page is ever covered.
  - Replaced capturing pointerdown with a bubbling click outside listener with drag detection, guaranteeing underlying button handlers fire first before sidebar closes.
  - Added dedicated close button (X) inside the mobile drawer header to ensure it is never covered or hidden.
- Sidebar State, Outside Press, and Stray Focus Bar Elimination (M10.8):
  - Created single source of truth `SidebarProvider` (`src/context/SidebarContext.tsx`) shared across desktop rail, phone header button, and backdrop overlay.
  - Reset sidebar state to closed automatically upon crossing the 1024px breakpoint via resize and orientation listeners.
  - Implemented floating desktop sidebar with fixed 3.5rem (`w-14`) rail placeholder, completely eliminating page layout shifts on expand/collapse.
  - Added capturing pointerdown outside-click listener (`src/lib/sidebarOutsideClick.ts`) that closes the sidebar while passing clicks to underlying page buttons in a single press.
  - Synchronized toggle icons, titles, and ARIA attributes (`PanelLeftOpen`/`PanelLeftClose` on desktop, `Menu`/`X` on mobile, `aria-expanded`, `aria-controls`).
  - Added `inert="true"` and `aria-hidden="true"` to off-screen mobile drawer.
  - Created input mode tracking module (`src/lib/inputMode.ts`) and helper `focusIfKeyboard` to eliminate stray focus outlines and vertical bars after mouse clicks.
  - Updated global focus CSS rules to suppress plain `:focus` outlines and show static 1px outline strictly on `:focus-visible`.
  - Added unit and component test suite in `tests/sidebar.test.tsx` (15 tests passing 100%).
- Table Column Distribution and Priority-Based Responsive Fit (M10.7):
  - Added `kind?: 'short' | 'text'` to `ColumnDef` (default `'short'` with `white-space: nowrap`; `'text'` with `min-width: 14rem` and 2-line clamp).
  - Added `priority?: number` to `ColumnDef` (1 = never hidden; higher numbers hide first on constrained viewports).
  - Pure function `calculateVisibleColumns` computing responsive column visibility and stack fallback (< 768px or priority-1 overflow).
  - Container ResizeObserver in `Table` comparing visible column minimum content widths against container width.
  - Sticky Actions cell using row background (`bg-inherit`) and equal-width action buttons in a single row (`md:flex-nowrap`, min 6.5rem width).
  - Few-column table card shrink-to-fit (`w-fit max-w-full min-w-[40rem]`) when a table has 5 or fewer columns.
  - Unit test suite `tests/tableColumnDistribution.test.tsx` verifying priority ordering, nowrap properties, and single-row actions.

### Changed
- Replaced fixed and percentage widths in all table column definitions across Doctor, Receptionist, Billing, Patient Portal, Access Control, Attendance, Formulary, Credentials, Patient View, and Dashboard views with `kind` and `priority`.
- Standardized horizontal cell padding across all tables to uniform 1rem (`px-4 py-3`).
- Updated Section 17 of `PROJECT_SPECIFICATION_AND_RULES.md` documenting M10.7 table column distribution.

## [demo-v4] - 2026-10-21

### Added
- Login Opening Sequence (Intro) (M9.9): Orchestrated entrance animation playing on first load of login screen in a browser session. Logo fades in over 400ms and scales from 0.9 to 1.0 centered in the viewport, holds 500ms, and slides up over 650ms to the header position. Clinic name and tagline fade and rise in at 1050ms (350ms duration), and chooser card fades and rises in at 1250ms (450ms duration) becoming interactive.
- Pre-paint zero layout shift computation: Measured final logo rectangle via useLayoutEffect to set --intro-start-y, ensuring mathematically identical layout rectangles with and without intro.
- Native HTML inert attribute for content below the logo while hidden, preventing focus, pointer interaction, and screen reader announcements until visible.
- Instant skip handling: Any pointer or key press immediately completes the intro to its resting state without dropping the keypress or click's effect on the focused element. Window resize and orientation change complete the intro immediately.
- ECG brightness and dual-path rendering: Bright accent token (text-teal-400 dark:text-teal-300) with 2.5px top path (0.65 opacity) and 6px underlying soft glow path (0.12 opacity), both with vector-effect="non-scaling-stroke" and masked by #ecg-wipe-mask with central cutout. ECG drawing begins at 900ms when logo slide starts.
- Vertical layout: Dynamic viewport height (min-h-[100dvh]) with minimum padding (py-8 sm:py-10) and my-auto centering group, scrolling naturally when content exceeds viewport height.
- Chooser button alignment: Top-aligned buttons (justify-start) with reserved "Last used" line in both buttons (using an invisible placeholder) to guarantee identical button heights and aligned titles.

### Changed
- Refactored EcgBackground.tsx to support isDrawingStarted prop, dual stroke paths, bright accent colors, and central column mask.
- Updated Section 10 of Consolidated Specification, DEMO_GUIDE.md, and FINAL_CHECK.md to document M9.9 opening sequence, ECG brightness, and chooser button layout alignment.

## [demo-v3] - 2026-10-21

### Added
- Account Type Chooser Step (M9.8): Initial screen prompting "Who is signing in?" with two equal outlined buttons ("Patient" and "Clinic Staff", min 88px height, stacked on mobile).
- Auto-focus and "Last used" plain muted indicator on the most recently used audience button in the chooser.
- "Change" button at the top of the sign-in and sign-up form headers that returns to the chooser step, removes the URL parameter, and restores focus.
- Dedicated ECG waveform central column horizontal gradient cutout mask (covering card width plus 24px each side) preventing the line from crossing text or cards.
- Mobile (< 640px) ECG line repositioning in the bottom third with lowered 0.12 opacity.
- Responsive M9.8 screenshots for chooser, patient form, staff form, patient sign-up, and staff sign-up across 360x800, 768x1024, and 1920x1080 viewports.

### Changed
- Replaced the tab component, role="tab", role="tablist", and tab CSS on sign-in and sign-up screens with the multi-step account type chooser flow.
- Lowered ECG waveform peak height to stay below 40% of viewport height (baseline y=130, peak y=65 in 1440x200 viewBox) to keep baseline clear of brand header text.
- Updated wrongPortal message wording to use "option" instead of "tab" ("This is a clinic staff account. Use the Clinic Staff option." / "This is a patient account. Use the Patient option.").
- Updated card footer demo notice to text-only (removed decorative check icon).
- Updated Consolidated Specification, DEMO_GUIDE.md, and FINAL_CHECK.md to reflect M9.8 chooser flow, removal of tabs, and ECG background mask.

### Removed
- Removed tablist and tab accessibility attributes from authentication screens.
- Removed unused imports and legacy tab styling rules.

