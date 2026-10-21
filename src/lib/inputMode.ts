/**
 * Input Mode Tracking Module (M10.8)
 *
 * Tracks the last user input type (keyboard or pointer) to ensure programmatic
 * focus changes only show focus rings when the user is operating via keyboard.
 * Suppresses stray focus outlines and bars on mouse/touch interaction.
 */

export type InputMode = 'keyboard' | 'pointer';

let currentInputMode: InputMode = 'pointer';
let isInitialized = false;

export function getLastInputType(): InputMode {
  return currentInputMode;
}

export function setLastInputType(mode: InputMode): void {
  currentInputMode = mode;
}

export function isKeyboardMode(): boolean {
  return currentInputMode === 'keyboard';
}

export function focusIfKeyboard(element: HTMLElement | null | undefined): void {
  if (element && typeof element.focus === 'function' && currentInputMode === 'keyboard') {
    element.focus();
  }
}

export function initInputModeTracking(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handlePointerDown = () => {
    currentInputMode = 'pointer';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore modifier-only key events if desired, but any key indicates keyboard mode
    if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      currentInputMode = 'keyboard';
    } else {
      currentInputMode = 'keyboard';
    }
  };

  window.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('mousedown', handlePointerDown, true);
  window.addEventListener('touchstart', handlePointerDown, true);
  window.addEventListener('keydown', handleKeyDown, true);

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown, true);
    window.removeEventListener('mousedown', handlePointerDown, true);
    window.removeEventListener('touchstart', handlePointerDown, true);
    window.removeEventListener('keydown', handleKeyDown, true);
  };
}

// Auto-initialize when loaded in browser/jsdom environment
if (typeof window !== 'undefined' && !isInitialized) {
  initInputModeTracking();
  isInitialized = true;
}

