/**
 * Scale and Display Size Constants
 *
 * Large screen (>= 1280px) default scale: 90% (0.9 / 14.4px base font size, raised from 80% / 0.8 / 12.8px).
 * Display size overrides: compact 80%, standard 100%, large 115%.
 */

export const DEFAULT_LARGE_SCREEN_SCALE = 0.9;
export const DEFAULT_LARGE_SCREEN_SCALE_PERCENT = '90%';
export const BASE_FONT_SIZE_PX = 16;
export const LARGE_SCREEN_ROOT_FONT_SIZE_PX = 14.4; // 16 * 0.9 = 14.4px (formerly 12.8px at 0.8 / 80%)

export const DISPLAY_SIZE_SCALES = {
  compact: 0.8,
  standard: 1.0,
  large: 1.15,
} as const;

export const DISPLAY_SIZE_PERCENTAGES = {
  compact: '80%',
  standard: '100%',
  large: '115%',
} as const;

export type DisplaySize = keyof typeof DISPLAY_SIZE_SCALES;

