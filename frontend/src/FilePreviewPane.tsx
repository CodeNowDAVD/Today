import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoPreviewPaneHandle } from "./VideoPreviewPane";
import { ImageIcon, Maximize2 } from "lucide-react";
import {
  fetchFileBlob,
  FileItem,
  formatBytes,
  formatDate,
} from "./api";
import FileIcon from "./FileIcon";
import FileRowActions from "./FileRowActions";
import LifeFileContacts from "./life/LifeFileContacts";
import {
  getFileClipboardMode,
  isEditableImage,
  MAX_AUDIO_PREVIEW_BYTES,
  MAX_CAD_PREVIEW_BYTES,
  MAX_CODE_PREVIEW_CHARS,
  MAX_PREVIEW_BYTES,
  MAX_SPREADSHEET_PREVIEW_BYTES,
  MAX_VIDEO_PREVIEW_BYTES,
  previewUnavailableMessage,
} from "./filePreview";
import { selectElementContents, usePreviewSelectAll } from "./usePreviewSelectAll";

const BpmnPreviewPane = lazy(() => import("./BpmnPreviewPane"));
const CadViewerPane = lazy(() => import("./CadViewerPane"));
const DocxPreviewPane = lazy(() => import("./DocxPreviewPane"));
const SpreadsheetPreviewPane = lazy(() => import("./SpreadsheetPreviewPane"));
const CodePreviewPane = lazy(() => import("./CodePreviewPane"));
const MarkdownPreviewPane = lazy(() => import("./MarkdownPreviewPane"));
const PDFPresentation = lazy(() => import("./pdf/PDFPresentation"));
const TextNotePane = lazy(() => import("./TextNotePane"));
const ImageEditorPane = lazy(() => import("./ImageEditorPane"));
const VideoPreviewPane = lazy(() => import("./VideoPreviewPane"));

type Props = {
  file: FileItem | null;
  isTrash: boolean;
  canEdit: boolean;
  copyBusy: boolean;
  onDownload: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  onRename?: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onClose: () => void;
  onFileUpdated?: (file: FileItem) => void;
  onPreviewError?: (message: string) => void;
  /** Cabecera mínima para ganar altura al documento. */
  compactHead?: boolean;
  showLifeContacts?: boolean;
  onSessionLost?: () => void;
  onLifeError?: (msg: string) => void;
};

function previewSizeLimit(mode: ReturnType<typeof getFileClipboardMode>): number {
  if (mode === "cad") return MAX_CAD_PREVIEW_BYTES;
  if (mode === "video") return MAX_VIDEO_PREVIEW_BYTES;
  if (mode === "audio") return MAX_AUDIO_PREVIEW_BYTES;
  if (mode === "spreadsheet") return MAX_SPREADSHEET_PREVIEW_BYTES;
  return MAX_PREVIEW_BYTES;
}

export default function FilePreviewPane({
  file,
  isTrash,
  canEdit,
  copyBusy,
  onDownload,
  onShare,
  onCopy,
  onRename,
  onTrash,
  onRestore,
  onClose,
  onFileUpdated,
  onPreviewError,
  compactHead = false,
  showLifeContacts = false,
  onSessionLost,
  onLifeError,
}: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [codeTruncated, setCodeTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageEditing, setImageEditing] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const textPreviewRef = useRef<HTMLDivElement>(null);
  const textPreRef = useRef<HTMLPreElement>(null);
  const videoPreviewRef = useRef<VideoPreviewPaneHandle>(null);

  useEffect(() => {
    setObjectUrl(null);
    setTextContent(null);
    setCodeTruncated(false);
    setError(null);
    setImageEditing(false);
    setImageBlob(null);
    if (!file) return;

    const mode = getFileClipboardMode(file);
    if (
      mode === "cad" ||
      mode === "pdf" ||
      mode === "docx" ||
      mode === "bpmn" ||
      mode === "spreadsheet" ||
      mode === "textNote"
    ) {
      setLoading(false);
      return;
    }

    if (mode === "unsupported" || file.sizeBytes > previewSizeLimit(mode)) {
      setLoading(false);
      return;
    }

    let revoked: string | null = null;
    let cancelled = false;
    setLoading(true);

    fetchFileBlob(file.id, true)
      .then(async (blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setObjectUrl(url);
        if (mode === "image") {
          setImageBlob(blob);
        }
        if (mode === "text" || mode === "code" || mode === "markdown") {
          const text = await blob.text();
          if (cancelled) return;
          const truncated = text.length > MAX_CODE_PREVIEW_CHARS;
          if (mode === "code" || mode === "markdown") {
            setCodeTruncated(truncated);
            setTextContent(truncated ? text.slice(0, MAX_CODE_PREVIEW_CHARS) : text);
            return;
          }
          setTextContent(text.slice(0, MAX_CODE_PREVIEW_CHARS));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudo cargar la vista previa");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file?.id, file?.sizeBytes, file?.contentType, file?.originalName, previewRevision]);

  const onSelectAllText = useCallback(() => {
    if (textPreRef.current) selectElementContents(textPreRef.current);
  }, []);

  const { focusRoot: focusTextRoot } = usePreviewSelectAll({
    rootRef: textPreviewRef,
    enabled: Boolean(file && getFileClipboardMode(file) === "text" && textContent != null),
    onSelectAll: onSelectAllText,
  });

  const handleImageSaved = useCallback(
    (updated: FileItem) => {
      setImageEditing(false);
      setPreviewRevision((r) => r + 1);
      onFileUpdated?.(updated);
    },
    [onFileUpdated],
  );

  const pdfPreviewFiles = useMemo(
    () => (file ? [{ id: file.id, name: file.originalName }] : []),
    [file?.id, file?.originalName],
  );

  if (!file) {
    return (
      <aside className="files-preview-pane files-preview-pane--empty" aria-label="Vista previa">
        <p className="files-preview-empty">Selecciona un archivo de la lista para verlo aquí.</p>
      </aside>
    );
  }

  const mode = getFileClipboardMode(file);
  const canPreview = mode !== "unsupported" && file.sizeBytes <= previewSizeLimit(mode);
  const canEditImage =
    canEdit && !isTrash && mode === "image" && canPreview && isEditableImage(file);
  const fillPreviewBody =
    mode === "pdf" ||
    mode === "video" ||
    mode === "cad" ||
    mode === "docx" ||
    mode === "bpmn" ||
    mode === "spreadsheet" ||
    mode === "code" ||
    mode === "markdown" ||
    mode === "textNote";
  const scrollPreviewBody = mode === "image" || mode === "text";

  return (
    <aside
      className={["files-preview-pane", compactHead && "files-preview-pane--compact-head"]
        .filter(Boolean)
        .join(" ")}
      aria-label="Vista previa"
    >
      <header className="files-preview-head">
        <div className="files-preview-head__info">
          {!compactHead && (
            <FileIcon originalName={file.originalName} contentType={file.contentType} />
          )}
          <div className="files-preview-head__text">
            <p
              className="files-preview-name"
              title={`${file.originalName} · ${formatBytes(file.sizeBytes)} · ${formatDate(file.createdAt)}`}
            >
              {file.originalName}
            </p>
            {!compactHead && (
              <p className="files-preview-meta">
                {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
              </p>
            )}
          </div>
        </div>
        <div className="files-preview-head__actions">
          {canEditImage && (
            <button
              type="button"
              className="files-preview-edit-btn"
              onClick={() => setImageEditing(true)}
              title="Editar imagen"
              aria-label="Editar imagen"
            >
              <ImageIcon size={16} strokeWidth={2.25} aria-hidden />
            </button>
          )}
          {mode === "video" && objectUrl && (
            <button
              type="button"
              className="files-preview-edit-btn"
              onClick={() => void videoPreviewRef.current?.enterFullscreen()}
              title="Pantalla completa"
              aria-label="Pantalla completa"
            >
              <Maximize2 size={16} strokeWidth={2.25} aria-hidden />
            </button>
          )}
          <FileRowActions
            file={file}
            isTrash={isTrash}
            canEdit={canEdit}
            variant="icons"
            onRename={onRename}
            onDownload={onDownload}
            onShare={onShare}
            onCopy={onCopy}
            onTrash={onTrash}
            onRestore={onRestore}
          />
          <button
            type="button"
            className="files-preview-close"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      </header>

      <div
        className={[
          "files-preview-body",
          fillPreviewBody && "files-preview-body--fill",
          scrollPreviewBody && "files-preview-body--scroll",
          copyBusy && "is-busy",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {copyBusy && <p className="files-preview-busy">Copiando…</p>}
        {loading && <p className="files-preview-status">Cargando…</p>}
        {error && <p className="files-preview-status files-preview-status--error">{error}</p>}

        {!loading && !error && canPreview && mode === "image" && objectUrl && (
          <img className="files-preview-image" src={objectUrl} alt={file.originalName} draggable={false} />
        )}

        {!loading && !error && canPreview && mode === "pdf" && (
          <Suspense fallback={<p className="files-preview-status">Cargando visor PDF…</p>}>
            <PDFPresentation
              key={file.id}
              className="files-preview-pdf"
              variant="embedded"
              files={pdfPreviewFiles}
              currentIndex={0}
              onIndexChange={() => {}}
            />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "video" && objectUrl && (
          <Suspense fallback={<p className="files-preview-status">Cargando reproductor…</p>}>
            <VideoPreviewPane
              ref={videoPreviewRef}
              key={file.id}
              className="files-preview-video"
              src={objectUrl}
              title={file.originalName}
            />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "audio" && objectUrl && (
          <audio className="files-preview-audio" src={objectUrl} controls />
        )}

        {!loading && !error && canPreview && mode === "text" && textContent != null && (
          <div
            ref={textPreviewRef}
            tabIndex={-1}
            className="files-preview-text-wrap preview-select-root"
            onMouseDownCapture={(event) => focusTextRoot(event.target)}
          >
            <pre ref={textPreRef} className="files-preview-text">
              {textContent}
            </pre>
          </div>
        )}

        {!loading && !error && canPreview && mode === "textNote" && (
          <Suspense fallback={<p className="files-preview-status">Cargando nota…</p>}>
            <TextNotePane
              key={file.id}
              file={file}
              canEdit={canEdit && !isTrash}
              onSaved={(updated) => onFileUpdated?.(updated)}
              onError={(msg) => onPreviewError?.(msg)}
            />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "markdown" && textContent != null && (
          <Suspense fallback={<p className="files-preview-status">Renderizando Markdown…</p>}>
            <MarkdownPreviewPane
              key={file.id}
              content={textContent}
              fileName={file.originalName}
              truncated={codeTruncated}
            />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "code" && textContent != null && (
          <Suspense fallback={<p className="files-preview-status">Preparando visor de código…</p>}>
            <CodePreviewPane
              key={file.id}
              content={textContent}
              fileName={file.originalName}
              contentType={file.contentType}
              truncated={codeTruncated}
            />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "cad" && (
          <Suspense fallback={<p className="files-preview-status">Cargando visor CAD…</p>}>
            <CadViewerPane key={file.id} file={file} />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "docx" && (
          <Suspense fallback={<p className="files-preview-status">Cargando documento…</p>}>
            <DocxPreviewPane key={file.id} file={file} />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "bpmn" && (
          <Suspense fallback={<p className="files-preview-status">Cargando diagrama BPMN…</p>}>
            <BpmnPreviewPane key={file.id} file={file} />
          </Suspense>
        )}

        {!loading && !error && canPreview && mode === "spreadsheet" && (
          <Suspense fallback={<p className="files-preview-status">Cargando hoja de cálculo…</p>}>
            <SpreadsheetPreviewPane key={file.id} file={file} />
          </Suspense>
        )}

        {!loading && !error && !canPreview && (
          <div className="files-preview-fallback">
            <FileIcon originalName={file.originalName} contentType={file.contentType} />
            <p>{previewUnavailableMessage(file)}</p>
            <button type="button" className="btn btn-compact" onClick={onDownload}>
              Descargar
            </button>
          </div>
        )}
      </div>

      {showLifeContacts && !isTrash && canEdit && onSessionLost && onLifeError && (
        <footer className="files-preview-life">
          <LifeFileContacts fileId={file.id} onSessionLost={onSessionLost} onError={onLifeError} />
        </footer>
      )}

      {imageEditing && objectUrl && (
        <Suspense fallback={null}>
          <ImageEditorPane
            file={file}
            sourceUrl={objectUrl}
            onSaved={handleImageSaved}
            onClose={() => setImageEditing(false)}
            onError={(msg) => onPreviewError?.(msg)}
          />
        </Suspense>
      )}
    </aside>
  );
}
