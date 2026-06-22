import { fetchFileBlob, type FileItem } from "./api";

/** Mismo tope que subida; apps destino pueden imponer menos. */
const MAX_SHARE_BYTES = 128 * 1024 * 1024;

export function isNativeShareAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function shareFileNative(file: FileItem): Promise<void> {
  if (!isNativeShareAvailable()) {
    throw new Error("Compartir no está disponible en este navegador. Prueba Descargar.");
  }
  if (file.sizeBytes > MAX_SHARE_BYTES) {
    throw new Error("El archivo supera 128 MB; no se puede compartir desde aquí.");
  }

  const blob = await fetchFileBlob(file.id, true);
  const type = blob.type || file.contentType || "application/octet-stream";
  const shareFile = new File([blob], file.originalName, { type });

  if (navigator.canShare && !navigator.canShare({ files: [shareFile] })) {
    throw new Error("Este tipo de archivo no se puede compartir desde aquí. Prueba Descargar.");
  }

  try {
    await navigator.share({
      files: [shareFile],
      title: file.originalName,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    throw e instanceof Error ? e : new Error("No se pudo compartir");
  }
}
