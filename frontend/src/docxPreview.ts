const DOCX_PREVIEW_EXTENSIONS = new Set(["doc", "docx", "dock"]);

export function isDocxPreviewFile(originalName: string): boolean {
  const ext = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return DOCX_PREVIEW_EXTENSIONS.has(ext);
}

export function isDocxBlob(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function isLegacyDocBlob(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}
