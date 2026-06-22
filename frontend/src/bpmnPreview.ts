const BPMN_PREVIEW_EXTENSIONS = new Set(["bpmn"]);

export function isBpmnPreviewFile(originalName: string): boolean {
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return BPMN_PREVIEW_EXTENSIONS.has(ext);
}
