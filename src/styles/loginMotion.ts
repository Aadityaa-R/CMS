/**
 * Motion token constants and timing invariants for Sign-In and Sign-Up (M9.6).
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

