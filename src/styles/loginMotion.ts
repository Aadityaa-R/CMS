/**
 * Motion token constants and timing invariants for Sign-In and Sign-Up (M9.6 / M9.8 / M9.9).
 * Enforces transform and opacity animations only with zero input delays.
 */
export const LOGIN_MOTION = {
  durationFast: 150,
  durationBase: 300,
  durationSlow: 600,
  staggerStep: 70,
  ecgCycle: 10000,
  maxEntrance: 700,
  successExit: 250,
  maxSuccessExit: 400,
  easingEntrance: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Opening Sequence (Intro) constants (M9.9)
  introLogoFade: 400,
  introHold: 500,
  introSlide: 650,
  introNameDelay: 150,
  introNameDuration: 350,
  introChooserDelay: 350,
  introChooserDuration: 450,
  introTotal: 1900,

  // ECG Line & Glow constants (M9.9)
  ecgStrokeMain: 2.5,
  ecgOpacityMain: 0.65,
  ecgStrokeGlow: 6,
  ecgOpacityGlow: 0.12,
  ecgCycleDuration: 10000,
} as const;

export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
