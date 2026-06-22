import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from "pdfjs-dist";

/** Subconjunto mínimo para medir layout (compatible con react-pdf y pdfjs-dist). */
export type PdfPageLike = {
  rotate: number;
  getViewport(params: { scale: number; rotation?: number }): PageViewport;
};

export type PdfDocumentLike = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageLike>;
};

export type PdfPageLayout = {
  viewport: PageViewport;
  cssWidth: number;
  cssHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  transform: number[] | undefined;
};

/** Gap vertical entre páginas en el visor. */
export const PDF_PAGE_GAP_PX = 20;

/** Relación alto/ancho típica (Letter US) — solo fallback antes de medir. */
export const PDF_PAGE_FALLBACK_ASPECT = 11 / 8.5;

export function fallbackPdfSlotHeight(width: number, gap = PDF_PAGE_GAP_PX): number {
  return Math.max(160, Math.round(width * PDF_PAGE_FALLBACK_ASPECT) + gap);
}

export function pdfSlotHeightAtWidth(page: PdfPageLike, width: number, gap = PDF_PAGE_GAP_PX): number {
  return layoutPdfPage(page, width).cssHeight + gap;
}

/** Alturas de slot por página al ancho de render (para virtual scroll). */
export async function measurePdfPageSlotHeights(
  pdf: PdfDocumentLike,
  width: number,
  gap = PDF_PAGE_GAP_PX,
): Promise<number[]> {
  if (width <= 0 || pdf.numPages <= 0) return [];
  const heights: number[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    heights.push(pdfSlotHeightAtWidth(page, width, gap));
  }
  return heights;
}

/** Páginas visibles ± buffer según alturas reales de slot. */
export function visiblePdfPageRange(
  scrollTop: number,
  viewHeight: number,
  slotHeights: number[],
  bufferPages = 2,
): { start: number; end: number } {
  const pageCount = slotHeights.length;
  if (pageCount === 0) return { start: 1, end: 0 };

  const avg = slotHeights.reduce((sum, h) => sum + h, 0) / pageCount;
  const bufferPx = bufferPages * avg;
  const viewTop = scrollTop - bufferPx;
  const viewBottom = scrollTop + viewHeight + bufferPx;

  let start = pageCount + 1;
  let end = 0;
  let offset = 0;

  for (let i = 0; i < pageCount; i++) {
    const pageStart = offset;
    const pageEnd = offset + slotHeights[i];
    if (pageEnd > viewTop && pageStart < viewBottom) {
      start = Math.min(start, i + 1);
      end = Math.max(end, i + 1);
    }
    offset = pageEnd;
  }

  if (end === 0) {
    return { start: 1, end: Math.min(pageCount, bufferPages * 2 + 1) };
  }
  return { start, end };
}

/** Viewport + canvas sizing aligned with pdf.js viewer (rotation + HiDPI transform). */
export function layoutPdfPage(page: PdfPageLike, maxWidth: number): PdfPageLayout {
  const rotation = page.rotate;
  const baseViewport = page.getViewport({ scale: 1, rotation });
  const scale = maxWidth / baseViewport.width;
  const viewport = page.getViewport({ scale, rotation });
  const outputScale = window.devicePixelRatio || 1;
  const cssWidth = Math.floor(viewport.width);
  const cssHeight = Math.floor(viewport.height);

  return {
    viewport,
    cssWidth,
    cssHeight,
    canvasWidth: Math.floor(viewport.width * outputScale),
    canvasHeight: Math.floor(viewport.height * outputScale),
    transform:
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
  };
}

/** Warm operator list without painting a canvas (avoids races with the main viewer). */
export async function warmPdfPage(pdf: PDFDocumentProxy, pageNumber = 1): Promise<void> {
  if (pdf.numPages < pageNumber) return;
  const page = await pdf.getPage(pageNumber);
  await page.getOperatorList({ intent: "display" });
}
