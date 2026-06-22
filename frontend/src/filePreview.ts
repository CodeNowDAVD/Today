import type { FileItem } from "./api";
import { isBpmnPreviewFile } from "./bpmnPreview";
import { isDocxPreviewFile } from "./docxPreview";

export const MAX_PREVIEW_BYTES = 20 * 1024 * 1024;
/** Tope conservador: el parseo de hojas ocurre en el navegador (memoria del cliente). */
export const MAX_SPREADSHEET_PREVIEW_BYTES = 15 * 1024 * 1024;
export const MAX_CAD_PREVIEW_BYTES = 100 * 1024 * 1024;
/** Mismo tope que la subida (128 MB). */
export const MAX_VIDEO_PREVIEW_BYTES = 128 * 1024 * 1024;
export const MAX_AUDIO_PREVIEW_BYTES = 64 * 1024 * 1024;
export const MAX_CODE_PREVIEW_CHARS = 120_000;

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"]);

const IMAGE_TYPES = /^image\//i;
const PLAIN_TEXT_TYPES = /^text\/(plain|csv)/i;
const CAD_PREVIEW_EXTENSIONS = new Set(["dwg", "dxf"]);

/** Excel y variantes que SheetJS parsea en el navegador. */
const SPREADSHEET_EXTENSIONS = new Set([
  "xlsx",
  "xlsm",
  "xlsb",
  "xls",
  "xlt",
  "xltx",
  "xltm",
  "ods",
  "fods",
  "csv",
  "tsv",
  "dif",
]);

const SPREADSHEET_MIME_HINTS = [
  "spreadsheetml",
  "ms-excel",
  "opendocument.spreadsheet",
];

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);

const CODE_EXTENSIONS = new Set([
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "py",
  "pyw",
  "java",
  "kt",
  "kts",
  "html",
  "htm",
  "xhtml",
  "css",
  "scss",
  "sass",
  "less",
  "json",
  "jsonc",
  "json5",
  "xml",
  "yaml",
  "yml",
  "sh",
  "bash",
  "zsh",
  "sql",
  "go",
  "rs",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "cs",
  "php",
  "rb",
  "swift",
  "dockerfile",
  "ini",
  "toml",
  "env",
  "properties",
  "graphql",
  "gql",
  "lua",
  "r",
  "pl",
  "pm",
  "ps1",
  "scala",
  "dart",
  "vue",
  "svelte",
  "makefile",
  "mk",
  "cmake",
  "groovy",
  "gradle",
  "diff",
  "patch",
  "tf",
  "proto",
  "ex",
  "exs",
  "erl",
  "hs",
  "vim",
]);

const CODE_MIME_HINTS = [
  "javascript",
  "ecmascript",
  "typescript",
  "json",
  "xml",
  "yaml",
  "markdown",
  "x-python",
  "x-java",
  "x-c",
  "x-c++",
  "x-sh",
  "x-shellscript",
  "x-sql",
  "x-go",
  "x-rust",
  "x-php",
  "x-ruby",
  "x-swift",
  "x-kotlin",
  "x-scala",
  "x-dart",
  "x-perl",
  "x-lua",
  "x-r",
  "x-toml",
  "x-ini",
  "x-properties",
  "x-dockerfile",
  "x-graphql",
  "x-protobuf",
  "x-elixir",
  "x-erlang",
  "x-haskell",
];

export type FileClipboardMode =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "text"
  | "textNote"
  | "markdown"
  | "code"
  | "cad"
  | "docx"
  | "bpmn"
  | "spreadsheet"
  | "unsupported";

function fileExtension(originalName: string): string {
  return originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
    : "";
}

function isMarkdownFile(originalName: string, contentType: string): boolean {
  const ext = fileExtension(originalName);
  if (ext && MARKDOWN_EXTENSIONS.has(ext)) return true;
  return contentType.toLowerCase().includes("markdown");
}

function isCodeFile(originalName: string, contentType: string): boolean {
  const ext = fileExtension(originalName);
  if (ext && CODE_EXTENSIONS.has(ext)) return true;

  const baseName = originalName.split("/").pop()?.toLowerCase() ?? "";
  if (baseName === "dockerfile" || baseName === "makefile") return true;

  const ct = contentType.toLowerCase();
  if (ct.startsWith("text/x-")) return true;
  return CODE_MIME_HINTS.some((hint) => ct.includes(hint));
}

export function isCadPreviewFile(originalName: string): boolean {
  return CAD_PREVIEW_EXTENSIONS.has(fileExtension(originalName));
}

export function isSpreadsheetPreviewFile(
  originalName: string,
  contentType = "",
): boolean {
  const ext = fileExtension(originalName);
  if (ext && SPREADSHEET_EXTENSIONS.has(ext)) return true;
  const ct = contentType.toLowerCase();
  return SPREADSHEET_MIME_HINTS.some((hint) => ct.includes(hint));
}

export function isVideoPreviewFile(
  originalName: string,
  contentType = "",
): boolean {
  const ext = fileExtension(originalName);
  const ct = contentType.toLowerCase();
  return ct.startsWith("video/") || VIDEO_EXTENSIONS.has(ext);
}

export function isAudioPreviewFile(
  originalName: string,
  contentType = "",
): boolean {
  const ext = fileExtension(originalName);
  const ct = contentType.toLowerCase();
  return ct.startsWith("audio/") || AUDIO_EXTENSIONS.has(ext);
}

export function previewUnavailableMessage(
  file: Pick<FileItem, "originalName" | "contentType" | "sizeBytes">,
): string {
  const ct = file.contentType ?? "";
  if (isSpreadsheetPreviewFile(file.originalName, ct)) {
    if (file.sizeBytes > MAX_SPREADSHEET_PREVIEW_BYTES) {
      return "Esta hoja de cálculo supera el límite de vista previa (15 MB). Descárgala para abrirla.";
    }
    return "No se pudo abrir la vista previa de la hoja de cálculo.";
  }
  if (isVideoPreviewFile(file.originalName, ct)) {
    if (file.sizeBytes > MAX_VIDEO_PREVIEW_BYTES) {
      return `Este video supera el límite de vista previa (128 MB).`;
    }
    return "No se pudo abrir la vista previa del video. Prueba recargar (Cmd+Shift+R).";
  }
  if (isAudioPreviewFile(file.originalName, ct)) {
    if (file.sizeBytes > MAX_AUDIO_PREVIEW_BYTES) {
      return `Este audio supera el límite de vista previa (64 MB).`;
    }
    return "No se pudo abrir la vista previa del audio.";
  }
  return "Vista previa no disponible para este tipo de archivo.";
}

export function getFileClipboardMode(
  file: Pick<FileItem, "originalName" | "contentType" | "sizeBytes">,
): FileClipboardMode {
  const ext = fileExtension(file.originalName);
  const ct = file.contentType?.toLowerCase() ?? "";

  if (isCadPreviewFile(file.originalName)) {
    return file.sizeBytes <= MAX_CAD_PREVIEW_BYTES ? "cad" : "unsupported";
  }

  if (isDocxPreviewFile(file.originalName)) {
    return file.sizeBytes <= MAX_PREVIEW_BYTES ? "docx" : "unsupported";
  }

  if (isBpmnPreviewFile(file.originalName)) {
    return file.sizeBytes <= MAX_PREVIEW_BYTES ? "bpmn" : "unsupported";
  }

  if (isSpreadsheetPreviewFile(file.originalName, ct)) {
    return file.sizeBytes <= MAX_SPREADSHEET_PREVIEW_BYTES ? "spreadsheet" : "unsupported";
  }

  if (isVideoPreviewFile(file.originalName, ct)) {
    return file.sizeBytes <= MAX_VIDEO_PREVIEW_BYTES ? "video" : "unsupported";
  }

  if (isAudioPreviewFile(file.originalName, ct)) {
    return file.sizeBytes <= MAX_AUDIO_PREVIEW_BYTES ? "audio" : "unsupported";
  }

  if (file.sizeBytes > MAX_PREVIEW_BYTES) return "unsupported";

  if (IMAGE_TYPES.test(ct) || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return "image";
  }
  if (ct === "application/pdf" || ext === "pdf") return "pdf";
  if (isMarkdownFile(file.originalName, ct)) return "markdown";
  if (isCodeFile(file.originalName, ct)) return "code";
  if (ext === "text") return "textNote";
  if (PLAIN_TEXT_TYPES.test(ct) || ["txt", "log", "csv"].includes(ext)) return "text";
  return "unsupported";
}

export function isTextLikeMode(mode: FileClipboardMode): boolean {
  return (
    mode === "text" ||
    mode === "textNote" ||
    mode === "code" ||
    mode === "markdown" ||
    mode === "bpmn"
  );
}

const EDITABLE_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);

export function isEditableImage(
  file: Pick<FileItem, "originalName" | "contentType">,
): boolean {
  const ct = file.contentType?.toLowerCase() ?? "";
  if (ct.includes("svg")) return false;
  if (ct.startsWith("image/")) return true;
  const ext = fileExtension(file.originalName);
  return EDITABLE_IMAGE_EXTENSIONS.has(ext);
}

export function defaultImageSaveType(
  originalName: string,
): "png" | "jpeg" | "webp" {
  const ext = fileExtension(originalName);
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  if (ext === "webp") return "webp";
  return "png";
}
