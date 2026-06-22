import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import PdfReactPage from "./PdfReactPage";
import {
  fallbackPdfSlotHeight,
  PDF_PAGE_GAP_PX,
} from "./pdfRenderUtils";

/** Margen extra alrededor del viewport para montar páginas antes de que entren. */
const ROOT_MARGIN_PX = 400;

type Props = {
  pageCount: number;
  width: number;
  /** Alturas estimadas (solo placeholders); deben corresponder a `heightsWidth`. */
  pageHeights?: number[];
  heightsWidth?: number;
  pageClassName: string;
  keyPrefix: string;
  scrollRef: RefObject<HTMLElement | null>;
};

export default function PdfVirtualPages({
  pageCount,
  width,
  pageHeights,
  heightsWidth,
  pageClassName,
  keyPrefix,
  scrollRef,
}: Props) {
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set([1, 2, 3]));

  const trustedHeights =
    pageHeights && heightsWidth === width && pageHeights.length === pageCount
      ? pageHeights
      : undefined;

  const placeholderHeights = useMemo(() => {
    const fallback = fallbackPdfSlotHeight(width);
    if (pageCount <= 0) return [];
    return Array.from({ length: pageCount }, (_, index) => trustedHeights?.[index] ?? fallback);
  }, [pageCount, trustedHeights, width]);

  useEffect(() => {
    slotRefs.current = [];
    setVisiblePages(new Set(Array.from({ length: Math.min(pageCount, 3) }, (_, i) => i + 1)));
  }, [pageCount, keyPrefix, width]);

  useLayoutEffect(() => {
    if (pageCount <= 0) return;

    const root = scrollRef.current;
    if (!root) return;

    const slots = slotRefs.current.filter(Boolean) as HTMLDivElement[];
    if (slots.length === 0) return;

    const markVisible = (pageNumber: number) => {
      setVisiblePages((prev) => {
        if (prev.has(pageNumber)) return prev;
        const next = new Set(prev);
        next.add(pageNumber);
        return next;
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (page > 0) markVisible(page);
        }
      },
      { root, rootMargin: `${ROOT_MARGIN_PX}px 0px`, threshold: 0 },
    );

    for (const slot of slots) io.observe(slot);

    return () => io.disconnect();
  }, [pageCount, scrollRef, width, keyPrefix, placeholderHeights]);

  if (pageCount <= 0 || width <= 0) return null;

  return (
    <>
      {Array.from({ length: pageCount }, (_, index) => {
        const pageNumber = index + 1;
        const visible = visiblePages.has(pageNumber);
        const placeholderHeight = Math.max(
          120,
          (placeholderHeights[index] ?? fallbackPdfSlotHeight(width)) - PDF_PAGE_GAP_PX,
        );

        return (
          <div
            key={`${keyPrefix}-slot-${pageNumber}`}
            ref={(el) => {
              slotRefs.current[index] = el;
            }}
            className="pdf-virtual-page-slot"
            data-page={pageNumber}
          >
            {visible ? (
              <PdfReactPage
                key={`${keyPrefix}-page-${pageNumber}-${width}`}
                pageNumber={pageNumber}
                width={width}
                className={pageClassName}
              />
            ) : (
              <div
                className="pdf-virtual-page-placeholder"
                style={{ width, height: placeholderHeight }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export { PDF_PAGE_GAP_PX };
