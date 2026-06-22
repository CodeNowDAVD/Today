import { fetchFileBlob, type FileItem } from "./api";
import { getFileClipboardMode, isTextLikeMode, type FileClipboardMode } from "./filePreview";

/** Límite razonable para pegar en WhatsApp u otras apps. */
const MAX_CLIPBOARD_BYTES = 16 * 1024 * 1024;

export async function copyFileToClipboard(file: FileItem): Promise<string> {
  if (file.sizeBytes > MAX_CLIPBOARD_BYTES) {
    throw new Error("El archivo supera 16 MB; no se puede copiar para pegar.");
  }
  if (!navigator.clipboard) {
    throw new Error("Tu navegador no permite copiar al portapapeles aquí.");
  }

  const mode = getFileClipboardMode(file);

  if (mode === "docx" || mode === "spreadsheet") {
    throw new Error("Selecciona y copia las celdas en la vista previa, o usa Descargar.");
  }

  if (mode === "unsupported" || mode === "cad") {
    throw unsupportedMessage(mode);
  }

  if (isTextLikeMode(mode)) {
    await writeTextLikeToClipboard(file);
    return "Copiado al portapapeles — ya puedes pegar en otra app.";
  }

  if (mode === "image") {
    await writeImageFileToClipboard(file);
    return "Copiado al portapapeles — ya puedes pegar en otra app.";
  }

  if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
    throw unsupportedMessage(mode);
  }

  await writeBlobFileToClipboard(file, mode);
  return "Copiado al portapapeles — ya puedes pegar en otra app.";
}

/** Escribe en el portapapeles en el mismo turno del clic (blob vía Promise en ClipboardItem). */
async function writeTextLikeToClipboard(file: FileItem): Promise<void> {
  const textPromise = fetchFileBlob(file.id, true).then((blob) => blob.text());

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": textPromise.then((text) => new Blob([text], { type: "text/plain" })),
        }),
      ]);
      return;
    } catch {
      /* fallback */
    }
  }

  const text = await textPromise;
  await navigator.clipboard.writeText(text);
}

async function writeBlobFileToClipboard(file: FileItem, mode: FileClipboardMode): Promise<void> {
  const type = guessClipboardType(file, mode);
  const blobPromise = fetchFileBlob(file.id, true).then((blob) => coerceBlobType(blob, type));

  try {
    await navigator.clipboard.write([new ClipboardItem({ [type]: blobPromise })]);
  } catch {
    throw unsupportedMessage(mode);
  }
}

async function writeImageFileToClipboard(file: FileItem): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
    throw new Error("No se pudo copiar la imagen en este navegador.");
  }

  const pngPromise = fetchFileBlob(file.id, true).then((blob) => blobToClipboardPng(blob));

  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngPromise })]);
  } catch {
    throw new Error("No se pudo copiar la imagen en este navegador.");
  }
}

async function blobToClipboardPng(blob: Blob): Promise<Blob> {
  const type = blob.type?.toLowerCase() || "";
  if (type === "image/png" || type === "image/gif") {
    return blob;
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo preparar la imagen");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo convertir la imagen"))),
      "image/png",
    );
  });
}

function unsupportedMessage(mode: FileClipboardMode): Error {
  if (mode === "video" || mode === "audio") {
    return new Error(
      "Tu navegador no permite copiar este video/audio para pegar. Usa Descargar y compártelo desde el teléfono.",
    );
  }
  return new Error("Este tipo de archivo no se puede copiar para pegar. Prueba Descargar o Duplicar.");
}

function guessClipboardType(
  file: Pick<FileItem, "originalName" | "contentType">,
  mode: FileClipboardMode,
): string {
  const ct = file.contentType?.toLowerCase() || "";
  if (ct && ct !== "application/octet-stream") return ct;

  const ext = file.originalName.includes(".")
    ? file.originalName.slice(file.originalName.lastIndexOf(".") + 1).toLowerCase()
    : "";

  if (mode === "pdf") return "application/pdf";
  if (mode === "video") {
    if (ext === "webm") return "video/webm";
    if (ext === "mov") return "video/quicktime";
    return "video/mp4";
  }
  if (mode === "audio") {
    if (ext === "ogg") return "audio/ogg";
    if (ext === "wav") return "audio/wav";
    if (ext === "m4a") return "audio/mp4";
    return "audio/mpeg";
  }
  return "application/octet-stream";
}

function coerceBlobType(blob: Blob, type: string): Blob {
  const current = blob.type?.toLowerCase() || "";
  if (current === type || (!current && type === "application/octet-stream")) {
    return blob;
  }
  if (current && current !== "application/octet-stream") {
    return blob;
  }
  return blob.slice(0, blob.size, type);
}
