/** Evita abrir preview al interactuar con controles de la fila. */
export function isFileRowInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    "button, input, a, label, .file-drag-hint, .file-tag-chip, .file-folder-picker-btn, .file-inline-rename-input, .file-row-actions, .file-row-menu-btn, .file-row-menu-panel",
  );
}
