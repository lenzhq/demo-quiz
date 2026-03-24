import { useEffect, type RefObject } from "react";

/**
 * Calls `onClose` when a mousedown event occurs outside the element
 * referenced by `ref`, but only when `isOpen` is true.
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, isOpen, onClose, excludeRef]);
}
