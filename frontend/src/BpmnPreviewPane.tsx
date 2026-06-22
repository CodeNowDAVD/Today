import BpmnNavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import { useEffect, useRef, useState } from "react";
import { fetchFileBlob, type FileItem } from "./api";

type Props = {
  file: FileItem;
};

type BpmnViewer = InstanceType<typeof BpmnNavigatedViewer>;

export default function BpmnPreviewPane({ file }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnViewer | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = hostRef.current;
    if (!container) return;

    const viewer = new BpmnNavigatedViewer({ container });
    viewerRef.current = viewer;

    async function run() {
      setPhase("loading");
      setMessage(null);
      try {
        const blob = await fetchFileBlob(file.id, true);
        if (cancelled) return;

        const xml = await blob.text();
        const { warnings } = await viewer.importXML(xml);
        if (cancelled) return;

        if (warnings.length > 0) {
          console.warn("BPMN import warnings:", warnings);
        }

        const canvas = viewer.get("canvas") as { zoom: (mode: string) => void; resized: () => void };
        canvas.zoom("fit-viewport");
        setPhase("ready");
      } catch (error) {
        if (!cancelled) {
          setPhase("failed");
          setMessage(
            error instanceof Error ? error.message : "No se pudo renderizar el diagrama BPMN.",
          );
        }
      }
    }

    void run();

    const resizeObserver = new ResizeObserver(() => {
      const canvas = viewerRef.current?.get("canvas") as { resized?: () => void } | undefined;
      canvas?.resized?.();
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      viewer.destroy();
      viewerRef.current = null;
      container.replaceChildren();
    };
  }, [file.id]);

  return (
    <div className="files-preview-bpmn">
      {phase === "loading" && (
        <p className="files-preview-status files-preview-bpmn-status">Cargando diagrama…</p>
      )}
      {phase === "failed" && (
        <p className="files-preview-status files-preview-status--error">
          {message ?? "No se pudo cargar el diagrama BPMN."}
        </p>
      )}
      <div ref={hostRef} className="bpmn-viewer-host" hidden={phase === "failed"} />
    </div>
  );
}
