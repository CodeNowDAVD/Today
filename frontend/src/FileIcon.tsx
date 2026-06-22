import type { CSSProperties } from "react";
import FileBrandMarkView from "./FileBrandMark";

export type FileIconKind =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "cad"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "text"
  | "default";

export interface FileIconMeta {
  kind: FileIconKind;
  label: string;
  ext: string;
}

const ICON_COLORS: Record<FileIconKind, string> = {
  pdf: "#e57373",
  image: "#81b4d9",
  video: "#b39ddb",
  audio: "#81c784",
  archive: "#bcaaa4",
  cad: "#ef9a9a",
  document: "#90caf9",
  spreadsheet: "#a5d6a7",
  presentation: "#ffab91",
  code: "#b0bec5",
  text: "#b0bec5",
  default: "#9e9e9e",
};

const EXT_MAP: Record<string, FileIconKind> = {
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  heic: "image",
  avif: "image",
  mp4: "video",
  webm: "video",
  mov: "video",
  mkv: "video",
  avi: "video",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  ogg: "audio",
  m4a: "audio",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  bz2: "archive",
  dwg: "cad",
  dxf: "cad",
  step: "cad",
  stp: "cad",
  doc: "document",
  docx: "document",
  dock: "document",
  bpmn: "document",
  odt: "document",
  rtf: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  xlsm: "spreadsheet",
  xlsb: "spreadsheet",
  csv: "spreadsheet",
  tsv: "spreadsheet",
  ods: "spreadsheet",
  fods: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  txt: "text",
  md: "text",
  log: "text",
  js: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  json: "code",
  xml: "code",
  html: "code",
  css: "code",
  java: "code",
  py: "code",
  sh: "code",
  yml: "code",
  yaml: "code",
};

function kindFromMime(mime: string): FileIconKind | null {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m === "application/pdf") return "pdf";
  if (m.includes("zip") || m.includes("compressed") || m.includes("archive")) return "archive";
  if (m.includes("spreadsheet") || m.includes("excel") || m === "text/csv") return "spreadsheet";
  if (m.includes("presentation") || m.includes("powerpoint")) return "presentation";
  if (m.includes("word") || m.includes("document")) return "document";
  if (m.startsWith("text/")) return "text";
  return null;
}

export function getFileIconMeta(originalName: string, contentType?: string): FileIconMeta {
  const dot = originalName.lastIndexOf(".");
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase() : "";
  const kind = (ext && EXT_MAP[ext]) || (contentType && kindFromMime(contentType)) || "default";
  const label = ext ? ext.slice(0, 4).toUpperCase() : "FILE";
  return { kind, label, ext };
}

type Props = {
  originalName: string;
  contentType?: string;
  className?: string;
};

export default function FileIcon({ originalName, contentType, className }: Props) {
  const { kind, label, ext } = getFileIconMeta(originalName, contentType);

  const style = {
    color: ICON_COLORS[kind],
  } as CSSProperties;

  return (
    <span
      className={["file-icon", `file-icon--${kind}`, ext && `file-icon--ext-${ext}`, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden
      title={label}
    >
      <FileBrandMarkView kind={kind} />
    </span>
  );
}
