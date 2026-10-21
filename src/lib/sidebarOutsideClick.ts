/**
 * Sidebar Outside Press Logic (M10.8)
 *
 * Pure function and event listener factory to handle closing the sidebar
 * on outside pointer presses without obstructing underlying clicks.
 */

export interface ShouldCloseSidebarOptions {
  target: EventTarget | null;
  sidebarElement: HTMLElement | null;
}

/**
 * Determines whether a pointer down event outside the sidebar should trigger close.
 */
export function shouldCloseSidebarOnPointerDown({
  target,
  sidebarElement,
}: ShouldCloseSidebarOptions): boolean {
  if (!target || !(target instanceof Node)) {
    return false;
  }

  const element = target instanceof HTMLElement ? target : target.parentElement;
  if (!element) {
    return false;
  }

  // 1. Do not close if the press is inside the sidebar element
  if (sidebarElement && (sidebarElement === element || sidebarElement.contains(element))) {
    return false;
  }

  // 2. Do not close if the press is on a toggle button marked with data-sidebar-ignore-outside
  if (element.closest('[data-sidebar-ignore-outside]')) {
    return false;
  }

  // 3. Do not close if the press is inside a Modal or higher dialog overlay
  if (element.closest('[role="dialog"], [data-modal]')) {
    return false;
  }

  return true;
}

/**
 * Factory for creating the capturing pointerdown event listener.
 * Does NOT call preventDefault() or stopPropagation(), ensuring the click
 * that closes the sidebar also activates the element under the pointer.
 */
export function createSidebarOutsideListener(
  getSidebarElement: () => HTMLElement | null,
  onClose: () => void
): (e: PointerEvent | MouseEvent) => void {
  return (e: PointerEvent | MouseEvent) => {
    if (shouldCloseSidebarOnPointerDown({ target: e.target, sidebarElement: getSidebarElement() })) {
      onClose();
    }
  };
}

