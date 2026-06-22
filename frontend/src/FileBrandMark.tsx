import type { FileIconKind } from "./FileIcon";
import {
  ArchiveFileIcon,
  AudioFileIcon,
  CodeFileIcon,
  CsvFileIcon,
  GenericFileIcon,
  ImageFileIcon,
  PdfFileIcon,
  PresentationFileIcon,
  TextFileIcon,
  VideoFileIcon,
} from "./fileBrandCustomIcons";

type Props = {
  kind: FileIconKind;
};

export default function FileBrandMarkView({ kind }: Props) {
  const className = "file-icon__brand-svg";

  switch (kind) {
    case "pdf":
      return <PdfFileIcon className={className} />;
    case "image":
      return <ImageFileIcon className={className} />;
    case "text":
    case "document":
      return <TextFileIcon className={className} />;
    case "code":
      return <CodeFileIcon className={className} />;
    case "spreadsheet":
      return <CsvFileIcon className={className} />;
    case "presentation":
      return <PresentationFileIcon className={className} />;
    case "video":
      return <VideoFileIcon className={className} />;
    case "audio":
      return <AudioFileIcon className={className} />;
    case "archive":
      return <ArchiveFileIcon className={className} />;
    case "cad":
      return <GenericFileIcon className={className} />;
    default:
      return <GenericFileIcon className={className} />;
  }
}
