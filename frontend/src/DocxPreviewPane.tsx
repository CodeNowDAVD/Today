import { renderAsync } from "docx-preview";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  fetchFileBlob,
  fetchOfficePreviewPdf,
  releaseOfficePreviewPdf,
  type FileItem,
} from "./api";
import { isDocxBlob, isLegacyDocBlob } from "./docxPreview";
import PreviewZoomViewport from "./PreviewZoomViewport";

const OfficePdfViewer = lazy(() => import("./OfficePdfViewer"));

type Props = {
  file: FileItem;
};

type PreviewMode = "checking" | "pdf" | "client" | "error";

const RENDER_OPTIONS = {
  className: "docx-preview-sorbits",
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
  ignoreFonts: false,
  breakPages: true,
  ignoreLastRenderedPageBreak: false,
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
  renderAltChunks: true,
  experimental: true,
  useBase64URL: true,
} as const;

export default function DocxPreviewPane({ file }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<PreviewMode>("checking");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setMode("checking");
    setError(null);
    setPdfUrl(null);

    void fetchOfficePreviewPdf(file.id)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
          setMode("pdf");
          return;
        }
        setMode("client");
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudo preparar la vista previa.");
          setMode("error");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      releaseOfficePreviewPdf(file.id);
    };
  }, [file.id]);

  useEffect(() => {
    if (mode !== "client") return;

    let cancelled = false;
    const bodyEl = bodyRef.current;
    const styleEl = styleRef.current;
    if (!bodyEl || !styleEl) return;

    setClientLoading(true);
    setError(null);
    bodyEl.replaceChildren();
    styleEl.replaceChildren();

    fetchFileBlob(file.id, true)
      .then(async (blob) => {
        if (cancelled) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());

        if (isLegacyDocBlob(bytes)) {
          setError(
            "Word antiguo (.doc). Descárgalo y ábrelo en Word o LibreOffice; la vista previa en el navegador solo soporta .docx.",
          );
          setMode("error");
          return;
        }

        if (!isDocxBlob(bytes)) {
          setError("No se reconoce como documento Word (.docx).");
          setMode("error");
          return;
        }

        await renderAsync(blob, bodyEl, styleEl, RENDER_OPTIONS);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "No se pudo renderizar el documento.",
          );
          setMode("error");
        }
      })
      .finally(() => {
        if (!cancelled) setClientLoading(false);
      });

    return () => {
      cancelled = true;
      bodyEl.replaceChildren();
      styleEl.replaceChildren();
    };
  }, [file.id, mode]);

  if (mode === "checking") {
    return (
      <div className="docx-preview-pane files-preview-docx">
        <p className="docx-preview-pane__status">Convirtiendo documento a PDF…</p>
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="docx-preview-pane files-preview-docx">
        <p className="docx-preview-pane__status docx-preview-pane__status--error">{error}</p>
      </div>
    );
  }

  if (mode === "pdf" && pdfUrl) {
    return (
      <PreviewZoomViewport
        resetKey={file.id}
        className="docx-preview-pane files-preview-docx files-preview-pdf"
      >
        <Suspense fallback={<p className="files-preview-status">Cargando visor PDF…</p>}>
          <OfficePdfViewer key={file.id} fileUrl={pdfUrl} className="office-pdf-viewer" />
        </Suspense>
      </PreviewZoomViewport>
    );
  }

  return (
    <PreviewZoomViewport resetKey={file.id} className="docx-preview-pane files-preview-docx">
      {clientLoading ? (
        <p className="docx-preview-pane__status">Renderizando documento…</p>
      ) : null}
      <div ref={styleRef} className="docx-preview-pane__styles" aria-hidden />
      <div ref={bodyRef} className="docx-preview-pane__body" />
    </PreviewZoomViewport>
  );
}
