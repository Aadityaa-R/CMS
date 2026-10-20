# Changelog

All notable changes to the Beacon Health Clinic Management System will be documented in this file.

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
