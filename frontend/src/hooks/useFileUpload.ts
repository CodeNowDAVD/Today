import { useRef, useState } from "react";
import { cancelActiveUpload, isSessionExpired, uploadBlockedReason, uploadFile } from "../api";
import { toYearMonth } from "../dateUtils";
import type { MainView } from "../appTypes";

export type UploadState = {
  pct: number;
  label: string;
};

type Options = {
  mainView: MainView;
  uploadFolderId: number | null;
  selectedDay: Date;
  logout: () => void;
  onError: (msg: string | null) => void;
  loadCounts: () => void;
  loadDaysForMonth: (yearMonth: string) => void;
  loadFiles: (reset: boolean, options?: { force?: boolean }) => Promise<void>;
  loadFolders: () => void;
};

function uploadLabel(fileName: string, pct: number): string {
  if (pct >= 100) return `Confirmando ${fileName} en servidor…`;
  if (pct >= 0) return `Subiendo ${fileName} · ${pct}%`;
  return `Subiendo ${fileName}…`;
}

export function useFileUpload({
  mainView,
  uploadFolderId,
  selectedDay,
  logout,
  onError,
  loadCounts,
  loadDaysForMonth,
  loadFiles,
  loadFolders,
}: Options) {
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function cancelUpload() {
    cancelActiveUpload();
  }

  async function handleUpload(
    fileList: FileList | null,
    targetFolderId: number | null | undefined = undefined,
  ) {
    if (!fileList?.length || mainView !== "active") return;
    const folderId = targetFolderId !== undefined ? targetFolderId : uploadFolderId;
    onError(null);
    let uploadedAny = false;
    try {
      for (const file of Array.from(fileList)) {
        const blocked = uploadBlockedReason(file);
        if (blocked) {
          onError(blocked);
          return;
        }
        setUploadState({ pct: -1, label: uploadLabel(file.name, -1) });
        try {
          await uploadFile(
            file,
            (pct) => setUploadState({ pct, label: uploadLabel(file.name, pct) }),
            folderId,
          );
          uploadedAny = true;
        } catch (err) {
          const base = err instanceof Error ? err.message : "Error";
          const msg = file.name ? `${file.name}: ${base}` : base;
          if (isSessionExpired(base)) logout();
          else onError(msg);
          return;
        }
      }
    } finally {
      setUploadState(null);
    }

    if (uploadedAny) {
      loadCounts();
      loadDaysForMonth(toYearMonth(selectedDay));
      void loadFiles(true, { force: true });
      loadFolders();
    }
  }

  return { uploadState, fileInputRef, handleUpload, cancelUpload };
}
