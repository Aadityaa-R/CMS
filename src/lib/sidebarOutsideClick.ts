/**
 * Sidebar Outside Click Logic (M10.8b)
 *
 * Bubbling click listener and drag-detection logic to close the sidebar
 * when clicking outside, ensuring underlying element click handlers run first
 * and drags starting inside the sidebar do not trigger a close.
 */

export interface ShouldCloseSidebarOptions {
  target: EventTarget | null;
  sidebarElement: HTMLElement | null;
  dragStartedInside?: boolean;
}

/**
 * Determines whether a bubbling click event outside the sidebar should trigger close.
 */
export function shouldCloseSidebarOnClick({
  target,
  sidebarElement,
  dragStartedInside = false,
}: ShouldCloseSidebarOptions): boolean {
  // A press that started inside the sidebar and ended outside (drag) does not close it
  if (dragStartedInside) {
    return false;
  }

  if (!target || !(target instanceof Node)) {
    return false;
  }

  const element = target instanceof HTMLElement ? target : target.parentElement;
  if (!element) {
    return false;
  }

  // 1. Do not close if the click is inside the sidebar element
  if (sidebarElement && (sidebarElement === element || sidebarElement.contains(element))) {
    return false;
  }

  // 2. Do not close if the click is on a toggle button marked with data-sidebar-ignore-outside
  if (element.closest('[data-sidebar-ignore-outside]')) {
    return false;
  }

  // 3. Do not close if the click is inside a Modal or higher dialog overlay
  if (element.closest('[role="dialog"], [data-modal]')) {
    return false;
  }

  return true;
}

/**
 * Factory for creating the outside click listener pair:
 * - handlePointerDown: tracks if press started inside the sidebar (preventing drag-dismissal).
 * - handleClick: bubbling click listener that closes sidebar without preventing default or stopping propagation.
 */
export function createSidebarOutsideClickListener(
  getSidebarElement: () => HTMLElement | null,
  onClose: () => void
): {
  handleClick: (e: MouseEvent) => void;
  handlePointerDown: (e: PointerEvent | MouseEvent) => void;
} {
  let dragStartedInside = false;

  const handlePointerDown = (e: PointerEvent | MouseEvent) => {
    const sidebar = getSidebarElement();
    const target = e.target as HTMLElement | null;
    dragStartedInside = !!(sidebar && target && (sidebar === target || sidebar.contains(target)));
  };

  const handleClick = (e: MouseEvent) => {
    const shouldClose = shouldCloseSidebarOnClick({
      target: e.target,
      sidebarElement: getSidebarElement(),
      dragStartedInside,
    });
    // Reset drag tracking after click
    dragStartedInside = false;

    if (shouldClose) {
      onClose();
      // NOTE: Do NOT call preventDefault() or stopPropagation()!
      // In bubbling phase, the clicked element's onClick has already fired.
    }
  };

  return { handleClick, handlePointerDown };
}
