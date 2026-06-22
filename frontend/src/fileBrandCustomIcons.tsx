import type { CSSProperties, ReactNode } from "react";

type IconProps = { className?: string; style?: CSSProperties };

function SvgIcon({
  className,
  style,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      {children}
    </svg>
  );
}

export function ImageFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.5" cy="10" r="1.45" fill="currentColor" />
      <path
        d="M3 16.5 8.5 11l3.5 3.5L15 11.5 21 17.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </SvgIcon>
  );
}

export function TextFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8.5 12h7M8.5 15h7M8.5 18h4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function PdfFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M8 3h6l4 4v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path
        d="M9 14.5c0-1.2 1-2 2.2-2h1.6c1.2 0 2.2.8 2.2 2s-1 2-2.2 2h-1.1v1.5H9V14.5zm3.8 0c0-.45-.35-.75-.85-.75h-.75v1.5h.75c.5 0 .85-.3.85-.75z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function VideoFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 9.5v5l5.5-2.5L10 9.5z" fill="currentColor" />
    </SvgIcon>
  );
}

export function AudioFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M10 6.5v11.2c-.85-.55-1.9-.85-3-.85-1.65 0-3 1-3 2.25S5.35 21 7 21s3-1 3-2.25V8.8l8-2.1v7.55c-.85-.55-1.9-.85-3-.85-1.65 0-3 1-3 2.25S9.35 18 11 18s3-1 3-2.25V6.5l-4 1z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function ArchiveFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M4 7.5h16v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-11z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M4 7.5 6 4.5h12l2 3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 12h6M12 9.5v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function GenericFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function CsvFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 9.5h16M4 13h16M4 16.5h16M9.5 5v14M15 5v14" stroke="currentColor" strokeWidth="1.2" opacity="0.85" />
    </SvgIcon>
  );
}

export function CodeFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path
        d="m9.5 13.5-1.5 1.5 1.5 1.5M14.5 13.5l1.5 1.5-1.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function PresentationFileIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <rect x="8.5" y="12" width="7" height="5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 14.5h4M10 16h2.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </SvgIcon>
  );
}
