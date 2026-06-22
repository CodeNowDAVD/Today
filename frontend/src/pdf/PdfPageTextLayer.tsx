import { TextLayer } from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import { useLayoutEffect, useRef } from "react";
import { layoutPdfPage } from "./pdfRenderUtils";
import { bindPdfTextLayer } from "./pdfTextLayerSelection";
import { tunePdfTextLayerSelection } from "./pdfTextLayerTune";
import { isRenderCancelled } from "./pdfUtils";

type Props = {
  page: PDFPageProxy;
  width: number;
};

export default function PdfPageTextLayer({ page, width }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || width <= 0) return;

    let cancelled = false;
    let unbindSelection: (() => void) | null = null;
    layer.innerHTML = "";

    const { viewport } = layoutPdfPage(page, width);
    const textLayer = new TextLayer({
      container: layer,
      textContentSource: page.streamTextContent({
        includeMarkedContent: true,
        disableNormalization: true,
      }),
      viewport,
    });

    void textLayer
      .render()
      .then(() => {
        if (cancelled) return;
        tunePdfTextLayerSelection(layer);
        const end = document.createElement("div");
        end.className = "endOfContent";
        layer.append(end);
        unbindSelection = bindPdfTextLayer(layer, end);
      })
      .catch((err) => {
        if (cancelled || isRenderCancelled(err)) return;
        if (import.meta.env.DEV) {
          console.warn("[PdfPageTextLayer] render failed", err);
        }
      });

    return () => {
      cancelled = true;
      unbindSelection?.();
      textLayer.cancel();
    };
  }, [page, width]);

  return <div ref={layerRef} className="textLayer" />;
}
