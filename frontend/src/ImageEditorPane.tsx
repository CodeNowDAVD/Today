import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";
import { fetchFileBlob, replaceFileContent, type FileItem } from "./api";
import { defaultImageSaveType } from "./filePreview";
import ImageInkEditor from "./ImageInkEditor";

type Props = {
  file: FileItem;
  sourceUrl: string;
  onSaved: (file: FileItem) => void;
  onClose: () => void;
  onError: (message: string) => void;
};

type SavedImagePayload = {
  mimeType: string;
  fullName?: string;
  name?: string;
  extension?: string;
  imageBase64?: string;
  imageCanvas?: HTMLCanvasElement;
  quality?: number;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo exportar la imagen"))),
      mimeType,
      quality,
    );
  });
}

async function savedImageToBlob(payload: SavedImagePayload): Promise<Blob> {
  if (payload.imageCanvas) {
    return canvasToBlob(payload.imageCanvas, payload.mimeType, payload.quality);
  }
  if (payload.imageBase64) {
    return dataUrlToBlob(payload.imageBase64);
  }
  throw new Error("La imagen editada no tiene datos exportables");
}

function saveFileName(file: FileItem, payload: SavedImagePayload): string {
  if (payload.fullName?.trim()) return payload.fullName.trim();
  const ext = payload.extension?.replace(/^\./, "") ?? "png";
  const base = payload.name?.trim() || file.originalName.replace(/\.[^.]+$/, "");
  return `${base}.${ext}`;
}

function editorBackgroundColor(): string {
  if (typeof document === "undefined") return "#1c1c1e";
  const theme = document.documentElement.dataset.theme;
  return theme === "light" ? "#f5f5f7" : "#1c1c1e";
}

function AdvancedAdjustSheet({
  file,
  sourceUrl,
  onSaved,
  onClose,
  onError,
}: Props) {
  const [saving, setSaving] = useState(false);
  const saveType = defaultImageSaveType(file.originalName);
  const pixelRatio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);

  const handleSave = useCallback(
    async (imageData: SavedImagePayload) => {
      if (saving) return;
      setSaving(true);
      try {
        const blob = await savedImageToBlob(imageData);
        const name = saveFileName(file, imageData);
        const updated = await replaceFileContent(
          file.id,
          new File([blob], name, { type: imageData.mimeType || blob.type }),
        );
        onSaved(updated);
      } catch (e) {
        onError(e instanceof Error ? e.message : "No se pudo guardar la imagen");
      } finally {
        setSaving(false);
      }
    },
    [file, onError, onSaved, saving],
  );

  return createPortal(
    <div className="image-editor-advanced-sheet" role="dialog" aria-modal="true" aria-label="Recortar y ajustar">
      <header className="image-editor-advanced-sheet__head">
        <button type="button" className="image-editor-advanced-sheet__back" onClick={onClose}>
          Volver a anotar
        </button>
        <span className="image-editor-advanced-sheet__title">Recortar y ajustar</span>
      </header>
      <div className="image-editor-advanced-sheet__body">
        {saving && (
          <div className="image-editor-saving" role="status" aria-live="polite">
            Guardando…
          </div>
        )}
        <FilerobotImageEditor
          source={sourceUrl}
          language="es"
          closeAfterSave
          showBackButton={false}
          onClose={onClose}
          onSave={(imageData) => void handleSave(imageData)}
          tabsIds={[TABS.ADJUST, TABS.FINETUNE]}
          defaultTabId={TABS.ADJUST}
          defaultToolId={TOOLS.CROP}
          defaultSavedImageName={file.originalName.replace(/\.[^.]+$/, "")}
          defaultSavedImageType={saveType}
          defaultSavedImageQuality={0.92}
          savingPixelRatio={pixelRatio}
          previewPixelRatio={pixelRatio}
          backgroundColor={editorBackgroundColor()}
          observePluginContainerSize
        />
      </div>
    </div>,
    document.body,
  );
}

export default function ImageEditorPane({ file, sourceUrl: initialSourceUrl, onSaved, onClose, onError }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [sourceRevoke, setSourceRevoke] = useState<string | null>(null);

  useEffect(() => {
    setSourceUrl(initialSourceUrl);
  }, [initialSourceUrl]);

  useEffect(() => {
    return () => {
      if (sourceRevoke) URL.revokeObjectURL(sourceRevoke);
    };
  }, [sourceRevoke]);

  const refreshSourceFromFile = useCallback(async (updated: FileItem) => {
    const blob = await fetchFileBlob(updated.id, true);
    const url = URL.createObjectURL(blob);
    setSourceRevoke((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setSourceUrl(url);
  }, []);

  const handleInkSaved = useCallback(
    (updated: FileItem) => {
      void refreshSourceFromFile(updated).finally(() => onSaved(updated));
    },
    [onSaved, refreshSourceFromFile],
  );

  const handleAdvancedSaved = useCallback(
    (updated: FileItem) => {
      setAdvancedOpen(false);
      void refreshSourceFromFile(updated).finally(() => onSaved(updated));
    },
    [onSaved, refreshSourceFromFile],
  );

  return (
    <>
      <ImageInkEditor
        file={file}
        sourceUrl={sourceUrl}
        onSaved={handleInkSaved}
        onClose={onClose}
        onError={onError}
        onOpenAdvanced={() => setAdvancedOpen(true)}
      />
      {advancedOpen && (
        <AdvancedAdjustSheet
          file={file}
          sourceUrl={sourceUrl}
          onSaved={handleAdvancedSaved}
          onClose={() => setAdvancedOpen(false)}
          onError={onError}
        />
      )}
    </>
  );
}
