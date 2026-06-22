import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  isSessionExpired,
  ProjectRole,
  SpaceworkItem,
  SpaceworkPresentation,
  startSpaceworkPresentation,
  stopSpaceworkPresentation,
  updateSpaceworkPresentation,
} from "./api";
import { isPdfFile, toPdfFileEntry } from "./pdf/pdfFiles";
import PreviewZoomViewport from "./PreviewZoomViewport";
import { spaceworkItemToFile } from "./spaceworkUtils";
import { subscribeSpaceworkPresentationStream } from "./spaceworkPresentationStream";
import { SpaceworkEmpty, SpaceworkLiveBadge, SpaceworkLoading } from "./spaceworkUi";
import { MonitorPlay } from "lucide-react";

const PDFPresentation = lazy(() => import("./pdf/PDFPresentation"));

type Props = {
  projectId: number;
  myRole: ProjectRole;
  sessionUsername: string;
  items: SpaceworkItem[];
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

function pdfItems(items: SpaceworkItem[]) {
  return items.filter((item) => {
    const file = spaceworkItemToFile(item);
    return file != null && isPdfFile(file);
  });
}

export default function SpaceworkPresentationPanel({
  projectId,
  myRole,
  sessionUsername,
  items,
  onSessionLost,
  onError,
}: Props) {
  const [presentation, setPresentation] = useState<SpaceworkPresentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const canPresent = myRole !== "VIEWER";
  const pdfProjectItems = useMemo(() => pdfItems(items), [items]);

  const fileById = useMemo(() => {
    const map = new Map<number, SpaceworkItem>();
    for (const item of pdfProjectItems) {
      if (item.fileId != null) map.set(item.fileId, item);
    }
    return map;
  }, [pdfProjectItems]);

  const pdfEntries = useMemo(() => {
    if (!presentation?.active) return [];
    return presentation.fileIds
      .map((id) => fileById.get(id))
      .filter((item): item is SpaceworkItem => item != null)
      .map((item) => {
        const file = spaceworkItemToFile(item)!;
        return toPdfFileEntry(file);
      });
  }, [presentation, fileById]);

  const isHost = presentation?.hostUsername === sessionUsername;
  const currentIndex = presentation?.currentFileIndex ?? 0;
  const total = pdfEntries.length;

  const handleErr = useCallback(
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) {
        onSessionLost();
        return;
      }
      onError(msg);
    },
    [onError, onSessionLost],
  );

  useEffect(() => {
    setSelectedIds(pdfProjectItems.map((i) => i.fileId!).filter(Boolean));
  }, [pdfProjectItems]);

  useEffect(() => {
    setLoading(true);
    const stop = subscribeSpaceworkPresentationStream(projectId, {
      onConnected: () => {
        setLiveConnected(true);
        setLoading(false);
      },
      onState: (state) => {
        setLiveConnected(true);
        if (state.active) {
          setPresentation(state);
          if (state.hostUsername === sessionUsername) setJoined(true);
        } else {
          setPresentation(null);
          setJoined(false);
        }
      },
      onStopped: () => {
        setPresentation(null);
        setJoined(false);
        setFullscreenOpen(false);
      },
      onError: (msg) => {
        setLiveConnected(false);
        setLoading(false);
        if (isSessionExpired(msg)) onSessionLost();
      },
    });
    return () => {
      stop();
      setLiveConnected(false);
      setLoading(false);
    };
  }, [projectId, sessionUsername, onSessionLost]);

  const pushIndex = useCallback(
    async (index: number): Promise<boolean> => {
      if (!presentation?.active || !isHost) return true;
      try {
        const updated = await updateSpaceworkPresentation(projectId, index);
        setPresentation(updated);
        return true;
      } catch (err) {
        handleErr(err);
        return false;
      }
    },
    [presentation?.active, isHost, projectId, handleErr],
  );

  const setCurrentIndex = useCallback(
    (index: number) => {
      if (!presentation) return;
      const previousIndex = presentation.currentFileIndex;
      setPresentation({ ...presentation, currentFileIndex: index });
      if (isHost) {
        void pushIndex(index).then((ok) => {
          if (!ok) {
            setPresentation((prev) =>
              prev ? { ...prev, currentFileIndex: previousIndex } : prev,
            );
          }
        });
      }
    },
    [presentation, isHost, pushIndex],
  );

  async function handleStart() {
    if (!canPresent || selectedIds.length === 0) return;
    setStarting(true);
    try {
      const created = await startSpaceworkPresentation(projectId, selectedIds);
      setPresentation(created);
      setJoined(true);
    } catch (err) {
      handleErr(err);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await stopSpaceworkPresentation(projectId);
      setPresentation(null);
      setJoined(false);
      setFullscreenOpen(false);
    } catch (err) {
      handleErr(err);
    } finally {
      setStopping(false);
    }
  }

  function toggleFile(fileId: number) {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId],
    );
  }

  if (loading) {
    return <SpaceworkLoading label="Conectando presentación…" />;
  }

  if (!presentation && !joined) {
    return (
      <div className="spacework-presentation-setup pad">
        <header className="spacework-presentation-setup__head">
          <h2>Presentación en vivo</h2>
          <p className="muted">
            Comparte PDFs del proyecto con el equipo. Tú controlas el documento; los demás siguen
            en tiempo real.
          </p>
          {liveConnected ? <SpaceworkLiveBadge /> : null}
        </header>

        {presentation === null && pdfProjectItems.length === 0 ? (
          <SpaceworkEmpty
            icon={MonitorPlay}
            title="Sin PDFs en el proyecto"
            hint="Enlaza archivos PDF en la pestaña Archivos para poder presentarlos en vivo."
          />
        ) : canPresent ? (
          <>
            <ul className="spacework-presentation-pick-list">
              {pdfProjectItems.map((item) => (
                <li key={item.id}>
                  <label className="spacework-presentation-pick">
                    <input
                      type="checkbox"
                      checked={item.fileId != null && selectedIds.includes(item.fileId)}
                      onChange={() => item.fileId != null && toggleFile(item.fileId)}
                    />
                    <span>{item.fileName}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn primary"
              disabled={starting || selectedIds.length === 0}
              onClick={() => void handleStart()}
            >
              {starting ? "Iniciando…" : "Iniciar presentación"}
            </button>
          </>
        ) : (
          <p className="muted">Esperando a que alguien inicie una presentación…</p>
        )}
      </div>
    );
  }

  if (presentation && !joined) {
    return (
      <div className="spacework-presentation-join pad">
        <p>
          <strong>{presentation.hostUsername}</strong> está presentando ({total} documento
          {total === 1 ? "" : "s"}).
        </p>
        {liveConnected ? (
          <span className="spacework-chat-live" title="Conectado en tiempo real">
            en vivo
          </span>
        ) : null}
        <button type="button" className="btn primary" onClick={() => setJoined(true)}>
          Unirse
        </button>
      </div>
    );
  }

  const docTitle = pdfEntries[currentIndex]?.name ?? "Documento";

  return (
    <div className="spacework-presentation">
      <aside className="spacework-presentation-sidebar" aria-label="Documentos">
        <p className="spacework-presentation-sidebar__title">Documentos</p>
        <ul className="spacework-presentation-doc-list">
          {pdfEntries.map((file, index) => (
            <li key={file.id}>
              <button
                type="button"
                className={[
                  "spacework-presentation-doc-btn",
                  index === currentIndex && "on",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!isHost}
                onClick={() => isHost && setCurrentIndex(index)}
              >
                {file.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="spacework-presentation-main">
        <header className="spacework-presentation-header">
          <div className="spacework-presentation-header__left">
            {isHost ? (
              <>
                <button
                  type="button"
                  className="session-panel__icon-btn"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  aria-label="Documento anterior"
                >
                  <ChevronLeft size={20} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  className="session-panel__icon-btn"
                  onClick={() => setCurrentIndex(Math.min(total - 1, currentIndex + 1))}
                  disabled={currentIndex >= total - 1}
                  aria-label="Documento siguiente"
                >
                  <ChevronRight size={20} strokeWidth={2.25} />
                </button>
              </>
            ) : (
              <span className="muted sm">Siguiendo a {presentation?.hostUsername}</span>
            )}
            <p className="spacework-presentation-doc-title" title={docTitle}>
              {docTitle}
            </p>
            {total > 0 && (
              <span className="session-panel__doc-counter">
                {currentIndex + 1}/{total}
              </span>
            )}
            {liveConnected ? (
              <span className="spacework-chat-live" title="Sincronizado en tiempo real">
                en vivo
              </span>
            ) : null}
          </div>
          <div className="spacework-presentation-header__actions">
            <button
              type="button"
              className="session-panel__fullscreen-btn"
              onClick={() => setFullscreenOpen(true)}
              disabled={total === 0}
            >
              <Maximize2 size={16} strokeWidth={2.25} aria-hidden />
              Pantalla completa
            </button>
            {isHost || myRole === "OWNER" || myRole === "ADMIN" ? (
              <button
                type="button"
                className="btn ghost danger sm"
                disabled={stopping}
                onClick={() => void handleStop()}
              >
                {stopping ? "…" : "Finalizar"}
              </button>
            ) : (
              <button type="button" className="btn ghost sm" onClick={() => setJoined(false)}>
                Salir
              </button>
            )}
            <button
              type="button"
              className="session-panel__icon-btn"
              onClick={() => (isHost ? void handleStop() : setJoined(false))}
              aria-label="Cerrar"
            >
              <X size={20} strokeWidth={2.25} />
            </button>
          </div>
        </header>

        <div className="spacework-presentation-viewer">
          {total === 0 ? (
            <p className="muted pad">Sin documentos en la presentación.</p>
          ) : (
            <PreviewZoomViewport
              resetKey={`${presentation?.updatedAt ?? ""}-${currentIndex}`}
              className="spacework-presentation-zoom preview-zoom-viewport--session"
            >
              <Suspense fallback={<p className="muted pad">Cargando visor…</p>}>
                <PDFPresentation
                  variant="embedded"
                  files={pdfEntries}
                  currentIndex={currentIndex}
                  onIndexChange={isHost ? setCurrentIndex : () => {}}
                  className="session-panel__pdf"
                />
              </Suspense>
            </PreviewZoomViewport>
          )}
        </div>
      </div>

      {fullscreenOpen && total > 0 && (
        <div className="session-panel__fullscreen-host">
          <PreviewZoomViewport
            resetKey={`${presentation?.updatedAt ?? ""}-${currentIndex}-fs`}
            className="session-panel__fullscreen-zoom preview-zoom-viewport--session"
          >
            <Suspense fallback={null}>
              <PDFPresentation
                variant="fullscreen"
                files={pdfEntries}
                currentIndex={currentIndex}
                onIndexChange={isHost ? setCurrentIndex : () => {}}
                onClose={() => setFullscreenOpen(false)}
              />
            </Suspense>
          </PreviewZoomViewport>
        </div>
      )}
    </div>
  );
}
