import { ChevronLeft, ChevronRight, Maximize2, MoreHorizontal, StickyNote, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { FileItem } from "../api";
import PreviewZoomViewport from "../PreviewZoomViewport";
import { usePdfDocuments } from "../pdf/usePdfDocuments";
import { upsertPresentationSession } from "./storage";
import { sessionToPdfEntries } from "./sessionUtils";
import SessionPanelSidebar from "./SessionPanelSidebar";
import type { PresentationSession } from "./types";

const PDFPresentation = lazy(() => import("../pdf/PDFPresentation"));

type Props = {
  session: PresentationSession;
  files: FileItem[];
  availableFiles: FileItem[];
  onClose: () => void;
  onSessionChange?: (session: PresentationSession) => void;
};

export default function PresentationSessionPanel({
  session: initialSession,
  files,
  availableFiles,
  onClose,
  onSessionChange,
}: Props) {
  const [session, setSession] = useState(initialSession);
  const [activeFileId, setActiveFileId] = useState<number | null>(
    initialSession.items[0]?.fileId ?? null,
  );
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pdfEntries = useMemo(
    () => sessionToPdfEntries(session, files),
    [session, files],
  );

  const currentIndex = useMemo(() => {
    if (activeFileId == null) return 0;
    const idx = pdfEntries.findIndex((e) => e.id === activeFileId);
    return idx >= 0 ? idx : 0;
  }, [pdfEntries, activeFileId]);

  const setCurrentIndex = useCallback(
    (index: number) => {
      const entry = pdfEntries[index];
      if (entry) setActiveFileId(entry.id);
    },
    [pdfEntries],
  );

  const pdfDocuments = usePdfDocuments({
    files: pdfEntries,
    currentIndex,
    enabled: pdfEntries.length > 0,
  });
  const { metas, currentFile } = pdfDocuments;

  useEffect(() => {
    setSession(initialSession);
    setActiveFileId(initialSession.items[0]?.fileId ?? null);
    setFullscreenOpen(false);
    setMenuOpen(false);
  }, [initialSession]);

  useEffect(() => {
    upsertPresentationSession(session);
    onSessionChange?.(session);
  }, [session, onSessionChange]);

  useEffect(() => {
    if (pdfEntries.length === 0) {
      setActiveFileId(null);
      return;
    }
    if (activeFileId == null || !pdfEntries.some((e) => e.id === activeFileId)) {
      setActiveFileId(pdfEntries[0].id);
    }
  }, [pdfEntries, activeFileId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (fullscreenOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenOpen, onClose]);

  const handleSessionChange = useCallback((next: PresentationSession) => {
    setSession(next);
  }, []);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex, setCurrentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < pdfEntries.length - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, pdfEntries.length, setCurrentIndex]);

  const docTitle = currentFile?.name ?? "Documento";
  const total = pdfEntries.length;

  return (
    <div className="session-panel-overlay" role="dialog" aria-modal="true" aria-label="Sesión de presentación">
      <div className="session-panel">
        <SessionPanelSidebar
          session={session}
          files={files}
          availableFiles={availableFiles}
          activeIndex={currentIndex}
          metas={metas}
          onSessionChange={handleSessionChange}
          onSelectIndex={setCurrentIndex}
        />

        <div className="session-panel__viewer">
          <header className="session-panel__topbar">
            <div className="session-panel__topbar-nav">
              <button
                type="button"
                className="session-panel__icon-btn"
                onClick={goPrev}
                disabled={currentIndex === 0 || total === 0}
                aria-label="Documento anterior"
              >
                <ChevronLeft size={20} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="session-panel__icon-btn"
                onClick={goNext}
                disabled={currentIndex >= total - 1 || total === 0}
                aria-label="Documento siguiente"
              >
                <ChevronRight size={20} strokeWidth={2.25} />
              </button>
              <p className="session-panel__doc-title" title={docTitle}>
                {docTitle}
              </p>
              {total > 0 && (
                <span className="session-panel__doc-counter">
                  {currentIndex + 1}/{total}
                </span>
              )}
            </div>
            <div className="session-panel__topbar-actions">
              <button
                type="button"
                className="session-panel__fullscreen-btn"
                onClick={() => setFullscreenOpen(true)}
                disabled={total === 0}
              >
                <Maximize2 size={16} strokeWidth={2.25} aria-hidden />
                Pantalla completa
              </button>
              <div className="session-panel__menu-wrap">
                <button
                  type="button"
                  className="session-panel__icon-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Más opciones"
                  aria-expanded={menuOpen}
                >
                  <MoreHorizontal size={20} strokeWidth={2.25} />
                </button>
                {menuOpen && (
                  <div className="session-panel__menu" role="menu">
                    <button
                      type="button"
                      className="session-panel__menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        onClose();
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="session-panel__icon-btn"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>
          </header>

          <div className="session-panel__preview">
            {total === 0 ? (
              <p className="session-panel__empty">Agrega al menos un PDF a la sesión.</p>
            ) : (
              <PreviewZoomViewport
                resetKey={activeFileId ?? currentIndex}
                className="session-panel__zoom preview-zoom-viewport--session"
              >
                {!fullscreenOpen && (
                  <Suspense fallback={<p className="session-panel__empty">Cargando visor…</p>}>
                    <PDFPresentation
                      variant="embedded"
                      files={pdfEntries}
                      currentIndex={currentIndex}
                      onIndexChange={setCurrentIndex}
                      className="session-panel__pdf"
                      documents={pdfDocuments}
                    />
                  </Suspense>
                )}
              </PreviewZoomViewport>
            )}
          </div>

          <footer className="session-panel__footer">
            <div className="session-panel__dots" aria-label="Documentos">
              {pdfEntries.map((file, index) => (
                <button
                  key={file.id}
                  type="button"
                  className={[
                    "session-panel__dot",
                    index === currentIndex && "session-panel__dot--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`${file.name} (${index + 1} de ${total})`}
                  aria-current={index === currentIndex ? "true" : undefined}
                />
              ))}
            </div>
            <span className="session-panel__footer-label">
              Documento {total === 0 ? 0 : currentIndex + 1} de {total}
            </span>
            <button type="button" className="session-panel__notes-btn" disabled title="Próximamente">
              <StickyNote size={15} strokeWidth={2} aria-hidden />
              Notas
            </button>
          </footer>
        </div>
      </div>

      {fullscreenOpen && total > 0 && (
        <div className="session-panel__fullscreen-host">
          <PreviewZoomViewport
            resetKey={activeFileId ?? currentIndex}
            className="session-panel__fullscreen-zoom preview-zoom-viewport--session"
          >
            <Suspense fallback={null}>
              <PDFPresentation
                variant="fullscreen"
                files={pdfEntries}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onClose={() => setFullscreenOpen(false)}
                documents={pdfDocuments}
              />
            </Suspense>
          </PreviewZoomViewport>
        </div>
      )}
    </div>
  );
}
