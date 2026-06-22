import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document } from "./pdfReact";
import PdfVirtualPages from "./PdfVirtualPages";
import type { PdfFileEntry } from "./pdfFiles";
import { measurePdfPageSlotHeights, type PdfDocumentLike } from "./pdfRenderUtils";
import {
  getPdfScrollPosition,
  usePdfDocuments,
  type PdfDocumentsState,
} from "./usePdfDocuments";
import { useDebouncedViewportWidth } from "./useDebouncedViewportWidth";

type Props = {
  files: PdfFileEntry[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  variant: "embedded" | "fullscreen";
  onClose?: () => void;
  className?: string;
  /** Estado compartido (p. ej. sesión de presentación) para evitar cargas duplicadas. */
  documents?: PdfDocumentsState;
};

export default function PDFPresentation({
  files,
  currentIndex,
  onIndexChange,
  variant,
  onClose,
  className,
  documents,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocumentLike | null>(null);
  const [docVisible, setDocVisible] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [pageLayout, setPageLayout] = useState<{ width: number; heights: number[] } | null>(null);
  const [docLoadError, setDocLoadError] = useState<string | null>(null);
  const prevIndexRef = useRef(currentIndex);

  const internalDocuments = usePdfDocuments({
    files,
    currentIndex,
    enabled: documents == null && files.length > 0,
  });

  const {
    currentFile,
    currentMeta,
    activeFileSource,
    activeLoading,
    activeError,
    rememberScroll,
  } = documents ?? internalDocuments;

  const isFullscreen = variant === "fullscreen";
  const showFileNav = isFullscreen && files.length > 1;
  const resolvedPageCount = numPages || currentMeta?.pageCount || 0;
  const measuredWidth = useDebouncedViewportWidth(scrollRef, isFullscreen ? 48 : 16);
  const contentMaxWidth = measuredWidth;
  const widthReady = contentMaxWidth > 0;

  useEffect(() => {
    setNumPages(0);
    setPageLayout(null);
    setDocLoadError(null);
    pdfDocRef.current = null;
  }, [currentFile?.id]);

  useEffect(() => {
    setPageLayout(null);
    const pdf = pdfDocRef.current;
    if (!pdf || contentMaxWidth <= 0 || numPages <= 0) return;

    let cancelled = false;
    void measurePdfPageSlotHeights(pdf, contentMaxWidth).then((heights) => {
      if (!cancelled) setPageLayout({ width: contentMaxWidth, heights });
    });

    return () => {
      cancelled = true;
    };
  }, [contentMaxWidth, numPages, activeFileSource]);

  useEffect(() => {
    if (prevIndexRef.current === currentIndex) return;
    prevIndexRef.current = currentIndex;
    setDocVisible(false);
    const t = window.setTimeout(() => setDocVisible(true), 120);
    return () => window.clearTimeout(t);
  }, [currentIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !currentFile || resolvedPageCount === 0) return;

    const saved = getPdfScrollPosition(currentFile.id);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        el.scrollTop = saved;
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [currentFile?.id, activeFileSource, resolvedPageCount]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !currentFile) return;
    rememberScroll(currentFile.id, el.scrollTop);
  }, [currentFile, rememberScroll]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onIndexChange(currentIndex - 1);
  }, [currentIndex, onIndexChange]);

  const goNext = useCallback(() => {
    if (currentIndex < files.length - 1) onIndexChange(currentIndex + 1);
  }, [currentIndex, files.length, onIndexChange]);

  useEffect(() => {
    if (!isFullscreen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, onClose, goPrev, goNext]);

  const pages =
    activeFileSource && resolvedPageCount > 0
      ? Array.from({ length: resolvedPageCount }, (_, i) => i + 1)
      : [];

  const metadataKnownEmpty =
    currentMeta?.status === "ready" && currentMeta.pageCount === 0 && numPages === 0;
  const showEmptyMessage =
    !activeLoading &&
    !activeError &&
    !docLoadError &&
    activeFileSource &&
    metadataKnownEmpty;

  const showPreparingPages =
    !activeLoading &&
    !activeError &&
    !docLoadError &&
    activeFileSource &&
    resolvedPageCount === 0 &&
    currentMeta?.status !== "ready";

  const rootClass = [
    "pdf-presentation",
    isFullscreen && "pdf-presentation--fullscreen",
    !isFullscreen && "pdf-presentation--embedded",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {isFullscreen && (
        <header className="pdf-presentation__head">
          <div className="pdf-presentation__head-info">
            <p className="pdf-presentation__title" title={currentFile?.name}>
              {currentFile?.name ?? "PDF"}
            </p>
            {showFileNav && (
              <p className="pdf-presentation__counter">
                {currentIndex + 1}/{files.length}
              </p>
            )}
          </div>
          <div className="pdf-presentation__head-actions">
            {showFileNav && (
              <>
                <button
                  type="button"
                  className="pdf-presentation__nav-btn"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  aria-label="Documento anterior"
                  title="Anterior"
                >
                  <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
                </button>
                <button
                  type="button"
                  className="pdf-presentation__nav-btn"
                  onClick={goNext}
                  disabled={currentIndex >= files.length - 1}
                  aria-label="Documento siguiente"
                  title="Siguiente"
                >
                  <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
                </button>
              </>
            )}
            <button
              type="button"
              className="pdf-presentation__close"
              onClick={onClose}
              aria-label="Salir de presentación"
              title="Salir (Esc)"
            >
              <X size={20} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>
      )}

      <div
        ref={scrollRef}
        className={[
          "pdf-presentation__scroll",
          docVisible ? "pdf-presentation__scroll--visible" : "pdf-presentation__scroll--fade",
        ].join(" ")}
        onScroll={onScroll}
      >
        {activeLoading && <p className="pdf-presentation__status">Cargando PDF…</p>}
        {activeError && (
          <p className="pdf-presentation__status pdf-presentation__status--error">{activeError}</p>
        )}
        {docLoadError && !activeError && (
          <p className="pdf-presentation__status pdf-presentation__status--error">{docLoadError}</p>
        )}
        {showPreparingPages && (
          <p className="pdf-presentation__status">Preparando páginas…</p>
        )}
        {!activeLoading && !activeError && !docLoadError && activeFileSource && pages.length > 0 && !widthReady && (
          <p className="pdf-presentation__status">Ajustando visor…</p>
        )}
        {!activeLoading && !activeError && !docLoadError && activeFileSource && pages.length > 0 && widthReady && (
          <Document
            key={currentFile?.id}
            file={activeFileSource}
            loading={null}
            onLoadSuccess={(pdf) => {
              pdfDocRef.current = pdf;
              setDocLoadError(null);
              setNumPages(pdf.numPages);
              if (contentMaxWidth > 0) {
                void measurePdfPageSlotHeights(pdf, contentMaxWidth).then((heights) =>
                  setPageLayout({ width: contentMaxWidth, heights }),
                );
              }
            }}
            onLoadError={(err) => {
              setDocLoadError(err?.message ?? "No se pudo abrir este PDF.");
            }}
            className="pdf-presentation__document"
          >
            <div className="pdf-presentation__pages">
              <PdfVirtualPages
                pageCount={pages.length}
                width={contentMaxWidth}
                pageHeights={pageLayout?.heights}
                heightsWidth={pageLayout?.width}
                pageClassName="pdf-presentation__page pdf-viewer-page"
                keyPrefix={String(currentFile?.id ?? "pdf")}
                scrollRef={scrollRef}
              />
            </div>
          </Document>
        )}
        {showEmptyMessage && (
          <p className="pdf-presentation__status">Este PDF no tiene páginas.</p>
        )}
      </div>

      {showFileNav && (
        <footer className="pdf-presentation__footer" aria-label="Documentos">
          <div className="pdf-presentation__dots">
            {files.map((file, index) => (
              <button
                key={file.id}
                type="button"
                className={[
                  "pdf-presentation__dot",
                  index === currentIndex && "pdf-presentation__dot--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onIndexChange(index)}
                aria-label={`${file.name} (${index + 1} de ${files.length})`}
                aria-current={index === currentIndex ? "true" : undefined}
                title={file.name}
              />
            ))}
          </div>
        </footer>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <div className={rootClass} role="dialog" aria-modal="true" aria-label="Presentación PDF">
        {body}
      </div>
    );
  }

  return <div className={rootClass}>{body}</div>;
}
