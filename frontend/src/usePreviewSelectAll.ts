import { useCallback, useEffect, useRef, type RefObject } from "react";

function isSelectAllShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a";
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function selectElementContents(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  element.focus({ preventScroll: true });
}

export function selectPlainTextContent(text: string, host: HTMLElement): void {
  let helper = host.querySelector<HTMLTextAreaElement>(".preview-select-helper");
  if (!helper) {
    helper = document.createElement("textarea");
    helper.className = "preview-select-helper";
    helper.setAttribute("aria-hidden", "true");
    helper.readOnly = true;
    helper.tabIndex = -1;
    Object.assign(helper.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      border: "none",
      outline: "none",
      opacity: "0",
      left: "0",
      top: "0",
      overflow: "hidden",
    });
    host.appendChild(helper);
  }

  helper.value = text;
  helper.focus({ preventScroll: true });
  helper.select();
}

type Options = {
  rootRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  onSelectAll: () => void;
};

export function usePreviewSelectAll({ rootRef, enabled = true, onSelectAll }: Options) {
  const pointerInsideRef = useRef(false);
  const onSelectAllRef = useRef(onSelectAll);
  onSelectAllRef.current = onSelectAll;

  const focusRoot = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("input, textarea, button, a")) return;
    rootRef.current?.focus({ preventScroll: true });
  }, [rootRef]);

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      pointerInsideRef.current = Boolean(root && root.contains(event.target as Node));
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [enabled, rootRef]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSelectAllShortcut(event)) return;

      const root = rootRef.current;
      if (!root) return;

      const target = event.target;
      if (isEditableTarget(target)) return;

      const active = document.activeElement;
      const inPreview =
        root.contains(target as Node) ||
        (active instanceof Node && root.contains(active)) ||
        pointerInsideRef.current;

      if (!inPreview) return;

      event.preventDefault();
      event.stopPropagation();
      onSelectAllRef.current();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, rootRef]);

  return { focusRoot, pointerInsideRef };
}
