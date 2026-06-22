import { useEffect, useRef, useState } from "react";
import { AcApDocManager, AcApSettingManager, AcEdOpenMode } from "@mlightcad/cad-simple-viewer";
import { fetchFileBlob, type FileItem } from "./api";

const CAD_WORKER_URLS = {
  dwgParser: "/cad-workers/libredwg-parser-worker.js",
  mtextRender: "/cad-workers/mtext-renderer-worker.js",
} as const;

type Props = {
  file: FileItem;
};

export default function CadViewerPane({ file }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<AcApDocManager | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = hostRef.current;
    if (!container) return;
    const mountEl: HTMLDivElement = container;

    async function run() {
      setPhase("loading");
      setMessage(null);
      try {
        const blob = await fetchFileBlob(file.id, true);
        if (cancelled) return;

        const manager = AcApDocManager.createInstance({
          container: mountEl,
          autoResize: true,
          webworkerFileUrls: {
            dwgParser: CAD_WORKER_URLS.dwgParser,
            mtextRender: CAD_WORKER_URLS.mtextRender,
          },
        });
        if (!manager) {
          throw new Error("No se pudo iniciar el visor CAD");
        }
        managerRef.current = manager;

        const settings = AcApSettingManager.instance;
        settings.set("isShowCommandLine", false);
        settings.set("isShowToolbar", false);
        settings.set("isShowMainMenu", false);
        settings.set("isShowFileName", false);
        settings.set("isShowLanguageSelector", false);

        await manager.loadDefaultFonts();
        const ok = await manager.openDocument(file.originalName, await blob.arrayBuffer(), {
          mode: AcEdOpenMode.Read,
        });
        if (cancelled) return;
        if (!ok) {
          throw new Error("No se pudo abrir el dibujo");
        }
        setPhase("ready");
      } catch (error) {
        if (!cancelled) {
          setPhase("failed");
          setMessage(error instanceof Error ? error.message : "Error al cargar el CAD");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      const manager = managerRef.current;
      managerRef.current = null;
      if (manager) {
        void manager.destroy();
      }
      mountEl.replaceChildren();
    };
  }, [file.id, file.originalName]);

  return (
    <div className="files-preview-cad">
      {phase === "loading" && <p className="files-preview-status files-preview-cad-status">Cargando dibujo…</p>}
      {phase === "failed" && (
        <p className="files-preview-status files-preview-status--error">{message ?? "No se pudo cargar el dibujo."}</p>
      )}
      <div ref={hostRef} className="cad-viewer-host" hidden={phase === "failed"} />
    </div>
  );
}
