/**
 * Reduce artefactos de selección (franjas verticales azules) en PDFs exportados
 * de PowerPoint: spans de layout de ancho ~0 o texto vertical en el margen.
 */
export function tunePdfTextLayerSelection(layer: HTMLElement): void {
  const layerRect = layer.getBoundingClientRect();
  const layerWidth = layerRect.width;
  if (layerWidth <= 0) return;

  for (const span of layer.querySelectorAll("span")) {
    if (span.getAttribute("role") === "img") continue;

    const rect = span.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (h < 8) continue;

    const leftRatio = (rect.left - layerRect.left) / layerWidth;
    const isDegenerateColumn = w <= 1.5 && h >= 20;
    const isVerticalMargin = leftRatio < 0.1 && w <= 28 && h > w * 2;

    if (isDegenerateColumn || isVerticalMargin) {
      span.style.userSelect = "none";
      span.style.pointerEvents = "none";
    }
  }
}
