/**
 * Lógica de selección de TextLayerBuilder (pdf.js viewer).
 * Sin esto, endOfContent expande toda la página y la selección salta a bloques enteros.
 */

type LayerEntry = {
  endDiv: HTMLElement;
  abort: AbortController;
};

const textLayers = new Map<HTMLElement, LayerEntry>();
let globalSelectionAc: AbortController | null = null;

function resetEndDiv(end: HTMLElement, textLayer: HTMLElement): void {
  textLayer.append(end);
  end.style.width = "";
  end.style.height = "";
  end.style.userSelect = "";
  textLayer.classList.remove("selecting");
}

function removeGlobalSelectionListener(): void {
  if (textLayers.size === 0 && globalSelectionAc) {
    globalSelectionAc.abort();
    globalSelectionAc = null;
  }
}

function enableGlobalSelectionListener(): void {
  if (globalSelectionAc) return;

  globalSelectionAc = new AbortController();
  const { signal } = globalSelectionAc;

  const resetAll = () => {
    for (const [textLayer, { endDiv }] of textLayers) {
      resetEndDiv(endDiv, textLayer);
    }
  };

  let isPointerDown = false;
  let isFirefox: boolean | undefined;
  let prevRange: Range | null = null;

  document.addEventListener("pointerdown", () => {
    isPointerDown = true;
  }, { signal });

  document.addEventListener("pointerup", () => {
    isPointerDown = false;
    resetAll();
  }, { signal });

  window.addEventListener("blur", () => {
    isPointerDown = false;
    resetAll();
  }, { signal });

  document.addEventListener("keyup", () => {
    if (!isPointerDown) resetAll();
  }, { signal });

  document.addEventListener("selectionchange", () => {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      resetAll();
      return;
    }

    const activeTextLayers = new Set<HTMLElement>();
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      for (const textLayerDiv of textLayers.keys()) {
        if (!activeTextLayers.has(textLayerDiv) && range.intersectsNode(textLayerDiv)) {
          activeTextLayers.add(textLayerDiv);
        }
      }
    }

    for (const [textLayerDiv, { endDiv }] of textLayers) {
      if (activeTextLayers.has(textLayerDiv)) {
        textLayerDiv.classList.add("selecting");
      } else {
        resetEndDiv(endDiv, textLayerDiv);
      }
    }

    const firstLayer = textLayers.keys().next().value as HTMLElement | undefined;
    if (!firstLayer) return;

    isFirefox ??=
      getComputedStyle(firstLayer).getPropertyValue("-moz-user-select") === "none";
    if (isFirefox) return;

    const range = selection.getRangeAt(0);
    const modifyStart =
      prevRange != null &&
      (range.compareBoundaryPoints(Range.END_TO_END, prevRange) === 0 ||
        range.compareBoundaryPoints(Range.START_TO_END, prevRange) === 0);

    let anchor: Node = modifyStart ? range.startContainer : range.endContainer;
    if (anchor.nodeType === Node.TEXT_NODE) {
      anchor = anchor.parentNode as Node;
    }
    if (anchor instanceof HTMLElement && anchor.classList.contains("highlight")) {
      anchor = anchor.parentNode as Node;
    }

    if (!modifyStart && range.endOffset === 0) {
      do {
        while (!anchor.previousSibling) {
          anchor = anchor.parentNode as Node;
        }
        anchor = anchor.previousSibling;
      } while (!anchor.childNodes.length);
    }

    const parentTextLayer =
      anchor instanceof Element ? anchor.parentElement?.closest(".textLayer") : null;
    if (!(parentTextLayer instanceof HTMLElement)) return;

    const entry = textLayers.get(parentTextLayer);
    if (!entry) return;

    const { endDiv } = entry;
    const layerWidth = parentTextLayer.offsetWidth;
    const layerHeight = parentTextLayer.offsetHeight;
    if (layerWidth > 0) endDiv.style.width = `${layerWidth}px`;
    if (layerHeight > 0) endDiv.style.height = `${layerHeight}px`;
    endDiv.style.userSelect = "text";

    if (anchor instanceof Element && anchor.parentElement) {
      anchor.parentElement.insertBefore(
        endDiv,
        modifyStart ? anchor : anchor.nextSibling,
      );
    }

    prevRange = range.cloneRange();
  }, { signal });
}

export function bindPdfTextLayer(
  textLayerDiv: HTMLElement,
  endDiv: HTMLElement,
): () => void {
  const abort = new AbortController();
  const opts = { signal: abort.signal };

  textLayers.set(textLayerDiv, { endDiv, abort });

  textLayerDiv.addEventListener("mousedown", () => {
    textLayerDiv.classList.add("selecting");
  }, opts);

  enableGlobalSelectionListener();

  return () => {
    abort.abort();
    textLayers.delete(textLayerDiv);
    removeGlobalSelectionListener();
  };
}
