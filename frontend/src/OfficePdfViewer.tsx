import { useEffect, useRef, useState } from "react";
import { Document } from "./pdf/pdfReact";
import PdfVirtualPages from "./pdf/PdfVirtualPages";
import { measurePdfPageSlotHeights, type PdfDocumentLike } from "./pdf/pdfRenderUtils";
import { useDebouncedViewportWidth } from "./pdf/useDebouncedViewportWidth";

type Props = {
  fileUrl: string;
  className?: string;
};

export default function OfficePdfViewer({ fileUrl, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocumentLike | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageLayout, setPageLayout] = useState<{ width: number; heights: number[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const measuredWidth = useDebouncedViewportWidth(scrollRef, 24);
  const renderWidth = measuredWidth > 0 ? Math.min(measuredWidth, 920) : 0;
  const widthReady = renderWidth > 0;

  useEffect(() => {
    pdfDocRef.current = null;
    setNumPages(0);
    setPageLayout(null);
    setLoadError(null);
  }, [fileUrl]);

  useEffect(() => {
    setPageLayout(null);
    const pdf = pdfDocRef.current;
    if (!pdf || renderWidth <= 0 || numPages <= 0) return;

    let cancelled = false;
    void measurePdfPageSlotHeights(pdf, renderWidth).then((heights) => {
      if (!cancelled) setPageLayout({ width: renderWidth, heights });
    });

    return () => {
      cancelled = true;
    };
  }, [renderWidth, numPages, fileUrl]);

  return (
    <div ref={scrollRef} className={className ?? "office-pdf-viewer"}>
      {loadError && (
        <p className="pdf-presentation__status pdf-presentation__status--error">{loadError}</p>
      )}
      <Document
        file={fileUrl}
        loading={<p className="docx-preview-pane__status">Cargando PDF…</p>}
        onLoadSuccess={(pdf) => {
          pdfDocRef.current = pdf;
          setLoadError(null);
          setNumPages(pdf.numPages);
          if (renderWidth > 0) {
            void measurePdfPageSlotHeights(pdf, renderWidth).then((heights) =>
              setPageLayout({ width: renderWidth, heights }),
            );
          }
        }}
        onLoadError={(err) => {
          setNumPages(0);
          setLoadError(err?.message ?? "No se pudo abrir la vista previa PDF.");
        }}
      >
        {widthReady ? (
        <PdfVirtualPages
          pageCount={numPages}
          width={renderWidth}
          pageHeights={pageLayout?.heights}
          heightsWidth={pageLayout?.width}
          pageClassName="office-pdf-viewer__page pdf-viewer-page"
          keyPrefix={fileUrl}
          scrollRef={scrollRef}
        />
        ) : (
          <p className="docx-preview-pane__status">Ajustando visor…</p>
        )}
      </Document>
    </div>
  );
}
