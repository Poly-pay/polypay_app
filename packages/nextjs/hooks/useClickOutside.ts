import { RefObject, useEffect } from "react";

/**
 * Subscribe to mousedown outside a container (and optionally a trigger) and call onClose.
 * When isActive is false, the listener is not added.
 */
export function useClickOutside(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: { isActive?: boolean; triggerRef?: RefObject<HTMLElement | null> },
): void {
  const isActive = options?.isActive !== false;
  const triggerRef = options?.triggerRef;

  useEffect(() => {
    if (!isActive) return;

    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current) return;
      let isOutside = !containerRef.current.contains(target);
      if (triggerRef?.current && triggerRef.current.contains(target)) isOutside = false;
      if (isOutside) onClose();
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isActive, onClose, triggerRef]);
}
