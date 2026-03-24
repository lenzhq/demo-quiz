import { useEffect, type RefObject } from "react";

/**
 * Calls `onClose` when a mousedown event occurs outside the element
 * referenced by `ref`, or when the Escape key is pressed, but only
 * when `isOpen` is true.
 *
 * An optional `excludeRef` can be provided to ignore clicks inside
 * a secondary element (e.g. a mobile menu that shares the same
 * open/close state).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
  excludeRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (excludeRef?.current?.contains(e.target as Node)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, isOpen, onClose, excludeRef]);
}
