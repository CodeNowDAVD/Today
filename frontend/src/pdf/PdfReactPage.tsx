import type { PDFPageProxy } from "pdfjs-dist";
import { useState } from "react";
import { Page } from "./pdfReact";
import PdfPageTextLayer from "./PdfPageTextLayer";
import { isRenderCancelled } from "./pdfUtils";

type Props = {
  pageNumber: number;
  width: number;
  className?: string;
};

export default function PdfReactPage({ pageNumber, width, className }: Props) {
  const [page, setPage] = useState<PDFPageProxy | null>(null);

  return (
    <Page
      pageNumber={pageNumber}
      width={width}
      className={className}
      loading={null}
      renderTextLayer={false}
      renderAnnotationLayer={false}
      onLoadSuccess={(loaded) => {
        setPage(loaded as unknown as PDFPageProxy);
      }}
      onRenderError={(err) => {
        if (isRenderCancelled(err)) return;
        setPage(null);
      }}
    >
      {page && width > 0 ? <PdfPageTextLayer page={page} width={width} /> : null}
    </Page>
  );
}
