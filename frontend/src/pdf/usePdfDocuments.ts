import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFileBlob } from "../api";
import { warmPdfPage } from "./pdfRenderUtils";
import type { PdfFileEntry } from "./pdfFiles";

export type PdfDocMeta = {
  id: number;
  name: string;
  pageCount: number | null;
  status: "pending" | "loading" | "ready" | "error";
  error: string | null;
};

export type PdfFileSource = { data: Uint8Array };

const MAX_CACHE_ENTRIES = 8;

const bytesCache = new Map<number, Uint8Array>();
const pdfCache = new Map<number, PDFDocumentProxy>();
const scrollMemory = new Map<number, number>();
const cacheOrder: number[] = [];

export function clearPdfDocumentCache(): void {
  for (const pdf of pdfCache.values()) {
    void pdf.cleanup();
  }
  bytesCache.clear();
  pdfCache.clear();
  scrollMemory.clear();
  cacheOrder.length = 0;
}

function touchCacheKey(key: number): void {
  const idx = cacheOrder.indexOf(key);
  if (idx >= 0) cacheOrder.splice(idx, 1);
  cacheOrder.push(key);

  while (cacheOrder.length > MAX_CACHE_ENTRIES) {
    const evictKey = cacheOrder.shift();
    if (evictKey == null) break;
    pdfCache.get(evictKey)?.cleanup();
    pdfCache.delete(evictKey);
    bytesCache.delete(evictKey);
  }
}

function filesSignature(files: PdfFileEntry[]): string {
  return files.map((f) => `${f.id}:${f.name}`).join("|");
}

async function fetchPdfBytes(fileId: number): Promise<Uint8Array> {
  const blob = await fetchFileBlob(fileId, true);
  if (!blob) {
    throw new Error("No se pudo generar la vista previa PDF.");
  }
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

async function ensurePdfBytes(file: PdfFileEntry): Promise<Uint8Array> {
  const key = file.id;
  const cached = bytesCache.get(key);
  if (cached) {
    touchCacheKey(key);
    return cached;
  }

  const data = await fetchPdfBytes(file.id);
  bytesCache.set(key, data);
  touchCacheKey(key);
  return data;
}

/** Copia fresca: pdf.js puede invalidar el buffer tras parsear el documento. */
async function fetchPdfSource(file: PdfFileEntry): Promise<PdfFileSource> {
  const data = await ensurePdfBytes(file);
  return { data: data.slice() };
}

async function openPdfDocument(file: PdfFileEntry): Promise<PDFDocumentProxy> {
  const key = file.id;
  const cached = pdfCache.get(key);
  if (cached) {
    touchCacheKey(key);
    return cached;
  }

  const data = await ensurePdfBytes(file);
  const pdf = await getDocument({ data: data.slice() }).promise;
  pdfCache.set(key, pdf);
  touchCacheKey(key);
  return pdf;
}

async function prefetchFirstPage(pdf: PDFDocumentProxy): Promise<void> {
  await warmPdfPage(pdf, 1);
}

export function getPdfScrollPosition(fileId: number): number {
  return scrollMemory.get(fileId) ?? 0;
}

function rememberPdfScrollPosition(fileId: number, scrollTop: number): void {
  scrollMemory.set(fileId, scrollTop);
}

type UsePdfDocumentsOptions = {
  files: PdfFileEntry[];
  currentIndex: number;
  enabled?: boolean;
};

export function usePdfDocuments({ files, currentIndex, enabled = true }: UsePdfDocumentsOptions) {
  const [metas, setMetas] = useState<PdfDocMeta[]>([]);
  const [activeFileSource, setActiveFileSource] = useState<PdfFileSource | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const prefetchGen = useRef(0);
  const metaLoadGen = useRef(0);

  const currentFile = files[currentIndex] ?? null;
  const filesKey = filesSignature(files);

  useEffect(() => {
    if (!enabled || files.length === 0) {
      setMetas([]);
      return;
    }

    const loadGen = ++metaLoadGen.current;
    let cancelled = false;

    setMetas(
      files.map((f) => ({
        id: f.id,
        name: f.name,
        pageCount: null,
        status: "pending",
        error: null,
      })),
    );

    void (async () => {
      await Promise.all(
        files.map(async (file) => {
          setMetas((prev) => {
            if (metaLoadGen.current !== loadGen) return prev;
            const idx = prev.findIndex((m) => m.id === file.id);
            if (idx < 0) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], status: "loading" };
            return next;
          });

          try {
            const pdf = await openPdfDocument(file);
            if (cancelled || metaLoadGen.current !== loadGen) return;
            setMetas((prev) => {
              const idx = prev.findIndex((m) => m.id === file.id);
              if (idx < 0) return prev;
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                pageCount: pdf.numPages,
                status: "ready",
                error: null,
              };
              return next;
            });
          } catch (e) {
            if (cancelled || metaLoadGen.current !== loadGen) return;
            const message = e instanceof Error ? e.message : "No se pudo cargar el PDF";
            setMetas((prev) => {
              const idx = prev.findIndex((m) => m.id === file.id);
              if (idx < 0) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], status: "error", error: message };
              return next;
            });
          }
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, filesKey]);

  useEffect(() => {
    if (!enabled || !currentFile) {
      setActiveFileSource(null);
      setActiveError(null);
      setActiveLoading(false);
      return;
    }

    let cancelled = false;
    setActiveLoading(true);
    setActiveError(null);
    setActiveFileSource(null);

    void fetchPdfSource(currentFile)
      .then((source) => {
        if (cancelled) return;
        setActiveFileSource(source);
        setActiveLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setActiveFileSource(null);
        setActiveLoading(false);
        setActiveError(e instanceof Error ? e.message : "No se pudo cargar el PDF");
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, currentFile?.id]);

  useEffect(() => {
    if (!enabled || files.length === 0) return;

    const nextFile = files[currentIndex + 1];
    if (!nextFile) return;

    const gen = ++prefetchGen.current;
    void openPdfDocument(nextFile)
      .then((pdf) => {
        if (prefetchGen.current !== gen) return;
        return prefetchFirstPage(pdf);
      })
      .catch(() => {
        /* prefetch best-effort */
      });
  }, [enabled, filesKey, currentIndex]);

  const currentMeta = currentFile
    ? (metas.find((m) => m.id === currentFile.id) ?? null)
    : null;

  const rememberScroll = useCallback((fileId: number, scrollTop: number) => {
    rememberPdfScrollPosition(fileId, scrollTop);
  }, []);

  return {
    metas,
    currentFile,
    currentMeta,
    activeFileSource,
    activeLoading,
    activeError,
    rememberScroll,
  };
}

export type PdfDocumentsState = ReturnType<typeof usePdfDocuments>;
