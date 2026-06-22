import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  downloadFile,
  duplicateFile,
  FileItem,
  FolderItem,
  FolderTagItem,
  formatBytes,
  formatBytesCompact,
  formatDate,
  formatDateCompact,
  renameFile,
  uploadFile,
} from "./api";
import type { UploadState } from "./hooks/useFileUpload";
import AddToSpaceworkDialog from "./AddToSpaceworkDialog";
import CreateTextNoteDialog from "./CreateTextNoteDialog";
import FileIcon from "./FileIcon";
import FilePreviewPane from "./FilePreviewPane";
import { copyFileToClipboard } from "./copyFileToClipboard";
import { isNativeShareAvailable, shareFileNative } from "./shareFileNative";
import FileRowFolderPicker from "./FileRowFolderPicker";
import FileTagChips from "./FileTagChips";
import FolderFilterControl from "./FolderFilterControl";
import FolderTagFilterBar from "./FolderTagFilterBar";
import FileRowMenuButton, { type FileRowMenuItem } from "./FileRowMenuButton";
import DateFilterControl from "./DateFilterControl";
import SelectionActionBar from "./SelectionActionBar";
import ToolbarOverflowMenu from "./ToolbarOverflowMenu";
import { clearDraggedFileId, writeDraggedFileIds } from "./fileDrag";
import { isFileRowInteractiveTarget } from "./fileRowClick";
import { LOOSE_FOLDER_LABEL } from "./folderUi";
import type { ListMeta } from "./hooks/useFileList";
import { useResizablePreviewWidth } from "./hooks/useResizablePreviewWidth";
import { type FolderFilter } from "./ProjectsNav";
import ToolbarIcon from "./ToolbarIcons";
import WorkspaceChrome from "./WorkspaceChrome";
import { createTagDropHandlers } from "./tagDrag";
import { FileMoveHintIcon, TableFolderIcon } from "./SidebarIcons";
import {
  isPdfFile,
  pdfFilesFromList,
  pdfFilesFromSelection,
  toPdfFileEntry,
} from "./pdf/pdfFiles";
import { loadPresentationSession, createPresentationSession } from "./presentation/storage";
import type { PresentationSession } from "./presentation/types";
const PDFPresentation = lazy(() => import("./pdf/PDFPresentation"));
const PresentationSessionPanel = lazy(() => import("./presentation/PresentationSessionPanel"));
const PresentationSessionsDialog = lazy(
  () => import("./presentation/PresentationSessionsDialog"),
);

type FilesViewMode = "active" | "trash";

type Props = {
  mainView: FilesViewMode;
  isAdmin: boolean;
  sessionUsername: string;
  files: FileItem[];
  folders: FolderItem[];
  listFolderFilter: FolderFilter;
  foldersLoading?: boolean;
  sidebarCollapsed?: boolean;
  onListFolderFilter: (f: FolderFilter) => void;
  folderTitle: string | null;
  pageSubText: string | null;
  listMeta: ListMeta | null;
  loadingFiles: boolean;
  loadingMore: boolean;
  showSkeleton: boolean;
  totalBytes: number;
  dateFilterOn: boolean;
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  daysWithFiles: string[];
  onEnableDateFilter: () => void;
  onDisableDateFilter: () => void;
  onVisibleMonthChange: (yearMonth: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onToggleLooseFilter: () => void;
  uploadState: UploadState | null;
  onCancelUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadInput: (files: FileList | null) => void;
  dragOver: boolean;
  onFileDropEnter?: (e: React.DragEvent) => void;
  onFileDropOver?: (e: React.DragEvent) => void;
  onFileDropLeave?: (e: React.DragEvent) => void;
  onFileDrop?: (e: React.DragEvent) => void;
  uploadDropLabel: string;
  activeFolderId: number | null;
  folderTags: FolderTagItem[];
  selectedTagIds: number[];
  onToggleTagFilter: (tagId: number) => void;
  onClearTagFilter: () => void;
  onManageTags: () => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedFileIds: number[];
  selectedCount: number;
  allSelectedOnPage: boolean;
  onToggleRowSelection: (fileId: number, checked: boolean, modifiers?: { shiftKey?: boolean; metaKey?: boolean }) => void;
  onSelectFileRow: (fileId: number, modifiers?: { shiftKey?: boolean; metaKey?: boolean }) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onBulkTrash: () => void;
  tagDropTargetId: number | null;
  tagPinning: boolean;
  onPinTagOnFile: (file: FileItem, tagId: number) => void;
  onUnpinTagFromFile: (file: FileItem, tagId: number) => void;
  onTagDropTargetChange: React.Dispatch<React.SetStateAction<number | null>>;
  onRefresh: () => void;
  onFileUpdated: (file: FileItem) => void;
  onLoadMore: () => void;
  onRequestTrash: (file: FileItem) => void;
  onRestore: (file: FileItem) => void;
  onMoveToFolder: (fileId: number, target: FolderFilter) => void;
  onFileDragStart: () => void;
  onFileDragEnd: () => void;
  onError: (msg: string) => void;
  onSessionLost: () => void;
};

export default function FilesWorkspace({
  mainView,
  isAdmin,
  sessionUsername,
  files,
  folders,
  listFolderFilter,
  foldersLoading = false,
  sidebarCollapsed = false,
  onListFolderFilter,
  folderTitle,
  pageSubText,
  listMeta,
  loadingFiles,
  loadingMore,
  showSkeleton,
  totalBytes,
  dateFilterOn,
  selectedDay,
  onSelectDay,
  daysWithFiles,
  onEnableDateFilter,
  onDisableDateFilter,
  onVisibleMonthChange,
  query,
  onQueryChange,
  onToggleLooseFilter,
  uploadState,
  onCancelUpload,
  fileInputRef,
  onUploadInput,
  dragOver,
  onFileDropEnter,
  onFileDropOver,
  onFileDropLeave,
  onFileDrop,
  uploadDropLabel,
  activeFolderId,
  folderTags,
  selectedTagIds,
  onToggleTagFilter,
  onClearTagFilter,
  onManageTags,
  selectionMode,
  onToggleSelectionMode,
  selectedFileIds,
  selectedCount,
  allSelectedOnPage,
  onToggleRowSelection,
  onSelectFileRow,
  onToggleSelectAll,
  onBulkTrash,
  tagDropTargetId,
  tagPinning,
  onPinTagOnFile,
  onUnpinTagFromFile,
  onTagDropTargetChange,
  onRefresh,
  onFileUpdated,
  onLoadMore,
  onRequestTrash,
  onRestore,
  onMoveToFolder,
  onFileDragStart,
  onFileDragEnd,
  onError,
  onSessionLost,
}: Props) {
  const [renamingFileId, setRenamingFileId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameSavingId, setRenameSavingId] = useState<number | null>(null);
  const [copyBusyId, setCopyBusyId] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [duplicateBusyId, setDuplicateBusyId] = useState<number | null>(null);
  const [shareBusyId, setShareBusyId] = useState<number | null>(null);
  const [rowMenuFileId, setRowMenuFileId] = useState<number | null>(null);
  const [spaceworkTarget, setSpaceworkTarget] = useState<FileItem | null>(null);
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const [textNoteDialogOpen, setTextNoteDialogOpen] = useState(false);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [presentationFiles, setPresentationFiles] = useState<
    ReturnType<typeof toPdfFileEntry>[]
  >([]);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<PresentationSession | null>(null);
  const [sessionsListOpen, setSessionsListOpen] = useState(false);
  const [sessionFileHints, setSessionFileHints] = useState<Map<number, string>>(
    () => new Map(),
  );
  const workspaceRef = useRef<HTMLDivElement>(null);
  const { previewWidth, onSplitterPointerDown, resetPreviewWidth } =
    useResizablePreviewWidth(workspaceRef);
  const renameRef = useRef<HTMLInputElement>(null);
  const renameOpenedAt = useRef(0);

  useEffect(() => {
    if (renamingFileId != null) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renamingFileId]);

  function startRename(file: FileItem) {
    setRowMenuFileId(null);
    renameOpenedAt.current = Date.now();
    setRenamingFileId(file.id);
    setRenameDraft(file.originalName);
  }

  function cancelRename() {
    setRenamingFileId(null);
    setRenameDraft("");
  }

  async function commitRename(fileId: number, fromBlur = false) {
    const name = renameDraft.trim();
    const current = files.find((f) => f.id === fileId);
    if (!name) {
      cancelRename();
      return;
    }
    if (!current || current.originalName === name) {
      cancelRename();
      return;
    }
    if (fromBlur && Date.now() - renameOpenedAt.current < 250) {
      return;
    }
    if (renameSavingId === fileId) return;

    setRenameSavingId(fileId);
    try {
      const updated = await renameFile(fileId, name);
      onFileUpdated(updated);
      cancelRename();
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo renombrar");
    } finally {
      setRenameSavingId(null);
    }
  }

  async function handleCopy(file: FileItem) {
    setCopyBusyId(file.id);
    setCopyNotice(null);
    try {
      const notice = await copyFileToClipboard(file);
      setCopyNotice(notice);
      window.setTimeout(() => setCopyNotice(null), 3500);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo copiar");
    } finally {
      setCopyBusyId(null);
    }
  }

  async function handleDuplicate(file: FileItem) {
    setDuplicateBusyId(file.id);
    try {
      const copied = await duplicateFile(file.id);
      onRefresh();
      setCopyNotice(`Duplicado como «${copied.originalName}».`);
      window.setTimeout(() => setCopyNotice(null), 3500);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo duplicar");
    } finally {
      setDuplicateBusyId(null);
    }
  }

  async function handleShare(file: FileItem) {
    setShareBusyId(file.id);
    try {
      await shareFileNative(file);
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo compartir");
    } finally {
      setShareBusyId(null);
    }
  }

  function dragFilesForRow(file: FileItem): FileItem[] {
    const ids =
      selectedFileIds.includes(file.id) && selectedFileIds.length > 1
        ? selectedFileIds.filter((id) => {
            const item = files.find((x) => x.id === id);
            return item != null && item.ownerUsername === sessionUsername;
          })
        : [file.id];
    return ids
      .map((id) => files.find((x) => x.id === id))
      .filter((x): x is FileItem => x != null);
  }

  function fileDragTitle(file: FileItem, count: number): string {
    if (count > 1) {
      return `Arrastra ${count} archivos al proyecto en el sidebar`;
    }
    if (isPdfFile(file)) {
      return "Arrastra al proyecto en el sidebar";
    }
    return "Arrastra al proyecto en el sidebar";
  }

  function buildRowMenuItems(f: FileItem, canRename: boolean): FileRowMenuItem[] {
    const canEdit = f.ownerUsername === sessionUsername;
    const items: FileRowMenuItem[] = [
      {
        key: "download",
        label: "Descargar",
        onClick: () => {
          downloadFile(f.id, f.originalName).catch((e) =>
            onError(e instanceof Error ? e.message : "Error"),
          );
        },
      },
    ];
    if (canRename) {
      items.push({
        key: "rename",
        label: "Renombrar",
        onClick: () => startRename(f),
      });
    }
    if (mainView === "active" && isNativeShareAvailable()) {
      items.push({
        key: "share",
        label: shareBusyId === f.id ? "Compartiendo…" : "Compartir…",
        onClick: () => void handleShare(f),
      });
    }
    if (canEdit && mainView === "active") {
      items.push({
        key: "duplicate",
        label: duplicateBusyId === f.id ? "Duplicando…" : "Duplicar",
        onClick: () => void handleDuplicate(f),
      });
      items.push({
        key: "copy",
        label: copyBusyId === f.id ? "Copiando…" : "Copiar para pegar",
        onClick: () => void handleCopy(f),
      });
      items.push({
        key: "spacework",
        label: "Añadir a Spacework…",
        onClick: () => setSpaceworkTarget(f),
      });
    }
    if (mainView === "trash") {
      items.push({
        key: "restore",
        label: "Restaurar",
        onClick: () => void onRestore(f),
      });
    } else if (canEdit) {
      items.push({
        key: "trash",
        label: "Mover a papelera",
        danger: true,
        onClick: () => onRequestTrash(f),
      });
    }
    return items;
  }

  function fileRowTagDropHandlers(file: FileItem) {
    const canPin = mainView === "active" && file.folderId != null;
    return createTagDropHandlers(file.id, canPin, onTagDropTargetChange, (_id, tagId) =>
      void onPinTagOnFile(file, tagId),
    );
  }

  const pageTitle = useMemo(() => {
    if (mainView === "active") {
      if (folderTitle) return folderTitle;
      return isAdmin ? "Archivos activos" : "Mis archivos";
    }
    return "Eliminados";
  }, [mainView, folderTitle, isAdmin]);

  const inFolderView = mainView === "active" && activeFolderId != null;
  const showProjectColumn = mainView === "active" && !inFolderView;

  const showRowMenuColumn = !selectionMode;
  const showBulkSelectionBar = selectionMode && selectedCount > 0;

  const fileTableColCount = useMemo(() => {
    let cols = 2;
    if (mainView === "active") cols += 1;
    if (showProjectColumn) cols += 1;
    if (isAdmin) cols += 1;
    if (mainView === "active" && selectionMode) cols += 1;
    if (showRowMenuColumn) cols += 1;
    return cols;
  }, [mainView, showProjectColumn, isAdmin, selectionMode, showRowMenuColumn]);

  const previewFile = useMemo(
    () => (previewFileId == null ? null : files.find((f) => f.id === previewFileId) ?? null),
    [files, previewFileId],
  );

  const showFolderFilterInToolbar =
    mainView === "active" && (sidebarCollapsed || !inFolderView);
  const previewOpen = previewFile != null;

  const selectedPdfFiles = useMemo(
    () => pdfFilesFromSelection(files, selectedFileIds),
    [files, selectedFileIds],
  );
  const folderPdfFiles = useMemo(() => pdfFilesFromList(files), [files]);

  function openPresentationFromSelection() {
    const pdfs = selectedPdfFiles;
    if (pdfs.length === 0) {
      onError("No hay PDFs en la selección.");
      return;
    }
    setPresentationFiles(pdfs.map(toPdfFileEntry));
    setPresentationIndex(0);
    setPresentationOpen(true);
  }

  function openPresentationFromFolder() {
    const pdfs = folderPdfFiles;
    if (pdfs.length === 0) {
      onError("No hay PDFs en la lista actual.");
      return;
    }
    setPresentationFiles(pdfs.map(toPdfFileEntry));
    setPresentationIndex(0);
    setPresentationOpen(true);
  }

  function closePresentation() {
    setPresentationOpen(false);
    setPresentationFiles([]);
    setPresentationIndex(0);
  }

  function openSessionFromSelection() {
    const pdfs = selectedPdfFiles;
    if (pdfs.length === 0) {
      onError("No hay PDFs en la selección.");
      return;
    }
    const session = createPresentationSession(
      pdfs.map((f) => f.id),
      "Presentación técnica",
    );
    setActiveSession(session);
    setSessionPanelOpen(true);
  }

  function openSessionFromPreview() {
    if (!previewFile || !isPdfFile(previewFile)) {
      onError("La vista previa no es un PDF.");
      return;
    }
    const session = createPresentationSession([previewFile.id], "Presentación técnica");
    setActiveSession(session);
    setSessionPanelOpen(true);
  }

  function openSavedSession(session: PresentationSession) {
    const fresh = loadPresentationSession(session.id) ?? session;
    setActiveSession(fresh);
    setSessionsListOpen(false);
    setSessionPanelOpen(true);
  }

  function closeSessionPanel() {
    setSessionPanelOpen(false);
    setActiveSession(null);
    setSessionFileHints(new Map());
  }

  function stubPdfFileItem(fileId: number, name: string): FileItem {
    return {
      id: fileId,
      originalName: name,
      contentType: "application/pdf",
      sizeBytes: 0,
      section: "active",
      createdAt: "",
      ownerUsername: sessionUsername,
      deletedAt: null,
      daysUntilPermanentDelete: null,
      folderId: null,
    };
  }

  const sessionPanelFiles = useMemo(() => {
    if (sessionFileHints.size === 0) return files;
    const byId = new Map(files.map((f) => [f.id, f]));
    const merged = [...files];
    for (const [fileId, name] of sessionFileHints) {
      if (!byId.has(fileId)) merged.push(stubPdfFileItem(fileId, name));
    }
    return merged;
  }, [files, sessionFileHints, sessionUsername]);

  useEffect(() => {
    if (previewFileId != null && !files.some((f) => f.id === previewFileId)) {
      setPreviewFileId(null);
    }
  }, [files, previewFileId]);

  const handleCreateTextNote = useCallback(
    async (name: string, content: string) => {
      const folderId =
        typeof listFolderFilter === "number" ? listFolderFilter : activeFolderId;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const file = new File([blob], name, { type: "text/plain;charset=utf-8" });
      const created = await uploadFile(file, undefined, folderId);
      onFileUpdated(created);
      setPreviewFileId(created.id);
      onRefresh();
    },
    [activeFolderId, listFolderFilter, onFileUpdated, onRefresh],
  );

  const toolbarOverflowItems = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      onClick: () => void;
      checked?: boolean;
    }> = [];
    if (!dateFilterOn) {
      items.push({
        key: "date",
        label: "Filtrar por fecha",
        onClick: () => {
          setToolbarMenuOpen(false);
          onEnableDateFilter();
        },
      });
    } else {
      items.push({
        key: "date-off",
        label: "Quitar filtro de fecha",
        checked: true,
        onClick: () => {
          setToolbarMenuOpen(false);
          onDisableDateFilter();
        },
      });
    }
    if (
      mainView === "active" &&
      !showFolderFilterInToolbar &&
      typeof listFolderFilter !== "number"
    ) {
      items.push({
        key: "loose",
        label: "Solo sueltos",
        checked: listFolderFilter === "none",
        onClick: () => {
          setToolbarMenuOpen(false);
          onToggleLooseFilter();
        },
      });
    }
    if (folderPdfFiles.length > 0) {
      items.push({
        key: "present-folder",
        label: `Presentar carpeta (${folderPdfFiles.length} PDF${folderPdfFiles.length === 1 ? "" : "s"})`,
        onClick: () => {
          setToolbarMenuOpen(false);
          openPresentationFromFolder();
        },
      });
    }
    if (mainView === "active" && previewFile && isPdfFile(previewFile)) {
      items.push({
        key: "create-session-preview",
        label: "Crear sesión con vista previa",
        onClick: () => {
          setToolbarMenuOpen(false);
          openSessionFromPreview();
        },
      });
    }
    if (mainView === "active") {
      items.push({
        key: "presentation-sessions",
        label: "Mis sesiones",
        onClick: () => {
          setToolbarMenuOpen(false);
          setSessionsListOpen(true);
        },
      });
    }
    return items;
  }, [
    dateFilterOn,
    listFolderFilter,
    folderPdfFiles.length,
    mainView,
    previewFile,
    showFolderFilterInToolbar,
    onEnableDateFilter,
    onDisableDateFilter,
    onToggleLooseFilter,
    openPresentationFromFolder,
    openSessionFromPreview,
  ]);

  return (
    <div
      className={
        mainView === "active"
          ? [
              "files-active-zone",
              inFolderView && "files-active-zone--in-folder",
              previewOpen && "files-active-zone--preview-open",
              dragOver && "is-drag-over",
            ]
              .filter(Boolean)
              .join(" ")
          : [
              "files-view-wrap",
              previewOpen && "files-view-wrap--preview-open",
            ]
              .filter(Boolean)
              .join(" ")
      }
      onDragEnter={onFileDropEnter}
      onDragOver={onFileDropOver}
      onDragLeave={onFileDropLeave}
      onDrop={onFileDrop}
    >
      {mainView === "active" && dragOver && (
        <div className="files-drag-overlay" aria-hidden>
          <span className="files-drag-overlay-icon">↑</span>
          <p className="files-drag-overlay-title">Suelta para subir</p>
          <p className="files-drag-overlay-sub">
            {uploadDropLabel === LOOSE_FOLDER_LABEL
              ? LOOSE_FOLDER_LABEL
              : `Carpeta «${uploadDropLabel}»`}
          </p>
        </div>
      )}

      <WorkspaceChrome
        title={pageTitle}
        subtitle={
          previewOpen
            ? null
            : inFolderView
              ? (
                  <span className="workspace-breadcrumb">
                    Mis archivos · {pageTitle}
                    <span className="workspace-breadcrumb-meta">
                      {" · "}
                      {listMeta?.totalElements ?? files.length} en total · {files.length} en pantalla (
                      {formatBytes(totalBytes)})
                    </span>
                  </span>
                )
              : pageSubText
        }
        stats={
          previewOpen || inFolderView ? undefined : (
            <>
              <span>
                {listMeta?.totalElements ?? files.length}{" "}
                {dateFilterOn
                  ? mainView === "active"
                    ? "en este día"
                    : "eliminados (día)"
                  : "en total"}
              </span>
              <span className="page-meta-sep">·</span>
              <span>
                {files.length} en pantalla ({formatBytes(totalBytes)})
              </span>
              {loadingFiles && (
                <>
                  <span className="page-meta-sep">·</span>
                  <span className="page-meta-loading">actualizando…</span>
                </>
              )}
            </>
          )
        }
        progress={
          mainView === "active" && uploadState ? (
            <div className="upload-status-strip" role="status" aria-live="polite">
              <div className="upload-status-strip__track" aria-hidden>
                <div
                  className={[
                    "upload-status-strip__fill",
                    uploadState.pct < 0 && "upload-status-strip__fill--indeterminate",
                    uploadState.pct >= 100 && "upload-status-strip__fill--confirming",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    uploadState.pct >= 0 && uploadState.pct < 100
                      ? { width: `${uploadState.pct}%` }
                      : uploadState.pct >= 100
                        ? { width: "100%" }
                        : undefined
                  }
                />
              </div>
              <div className="upload-status-strip__row">
                <span className="upload-status-strip__label">{uploadState.label}</span>
                <button
                  type="button"
                  className="upload-status-strip__cancel"
                  onClick={onCancelUpload}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : undefined
        }
        banner={
          mainView === "trash" ? (
            <p className="workspace-banner" role="note">
              Los archivos permanecen <strong>30 días</strong> antes de borrarse del servidor.
            </p>
          ) : undefined
        }
        toolbar={
          <div
            className={[
              "workspace-toolbar-stack",
              inFolderView && "workspace-toolbar-stack--folder",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                onUploadInput(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              className={[
                "workspace-toolbar-row",
                "workspace-toolbar-row--command",
                inFolderView && "workspace-toolbar-row--folder",
                previewOpen && "workspace-toolbar-row--preview",
                mainView === "active" && showBulkSelectionBar && "workspace-toolbar-row--selection",
              ]
                .filter(Boolean)
                .join(" ")}
            >
            <div className="workspace-toolbar-actions">
              {!(mainView === "active" && showBulkSelectionBar) &&
                (inFolderView || typeof listFolderFilter === "number") && (
                <button
                  type="button"
                  className="btn btn-icon workspace-toolbar-btn workspace-toolbar-btn--tags"
                  onClick={onManageTags}
                  aria-label="Gestionar etiquetas"
                  title="Gestionar etiquetas"
                >
                  <ToolbarIcon name="tags" />
                </button>
              )}
              {!(mainView === "active" && showBulkSelectionBar) && mainView === "active" && (
                <>
                  <button
                    type="button"
                    className="btn btn-icon workspace-toolbar-btn workspace-toolbar-btn--text-note"
                    onClick={() => setTextNoteDialogOpen(true)}
                    disabled={uploadState !== null}
                    aria-label="Nueva nota de texto"
                    title="Nueva nota (.text)"
                  >
                    <span className="workspace-toolbar-btn__glyph" aria-hidden>
                      T
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon primary workspace-toolbar-btn workspace-toolbar-btn--upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadState !== null}
                    aria-label="Subir archivos"
                    title="Subir archivos"
                  >
                    <ToolbarIcon name="upload" />
                  </button>
                </>
              )}
              {!(mainView === "active" && showBulkSelectionBar) && (
                <button
                  type="button"
                  className="btn btn-icon workspace-toolbar-btn"
                  onClick={onRefresh}
                  disabled={loadingFiles}
                  aria-label={loadingFiles ? "Actualizando" : "Actualizar"}
                  title={loadingFiles ? "Actualizando…" : "Actualizar"}
                >
                  <ToolbarIcon name="refresh" />
                </button>
              )}
              {mainView === "active" && (
                <button
                  type="button"
                  className="btn btn-icon workspace-toolbar-btn"
                  onClick={onToggleSelectionMode}
                  aria-label={selectionMode ? "Cancelar selección" : "Seleccionar"}
                  aria-pressed={selectionMode}
                  title={selectionMode ? "Cancelar selección" : "Seleccionar"}
                >
                  <ToolbarIcon name={selectionMode ? "select" : "selectOff"} />
                </button>
              )}
              {!(mainView === "active" && showBulkSelectionBar) &&
                toolbarOverflowItems.length > 0 && (
                <ToolbarOverflowMenu
                  items={toolbarOverflowItems}
                  open={toolbarMenuOpen}
                  onOpenChange={setToolbarMenuOpen}
                />
              )}
            </div>
            <div className="workspace-toolbar-leading">
              {mainView === "active" && showBulkSelectionBar ? (
                <SelectionActionBar
                  inline
                  count={selectedCount}
                  pdfCount={selectedPdfFiles.length}
                  onPresent={
                    selectedPdfFiles.length > 0 ? openPresentationFromSelection : undefined
                  }
                  onCreateSession={
                    selectedPdfFiles.length > 0 ? openSessionFromSelection : undefined
                  }
                  onTrash={onBulkTrash}
                  onDone={onToggleSelectionMode}
                />
              ) : (
                <>
                  {dateFilterOn && (
                    <DateFilterControl
                      selected={selectedDay}
                      onSelect={onSelectDay}
                      onDisable={onDisableDateFilter}
                      daysWithFiles={daysWithFiles}
                      onVisibleMonthChange={onVisibleMonthChange}
                    />
                  )}
                  {showFolderFilterInToolbar && (
                    <FolderFilterControl
                      filter={listFolderFilter}
                      folders={folders}
                      loading={foldersLoading}
                      onSelect={onListFolderFilter}
                    />
                  )}
                  <input
                    className="workspace-search"
                    placeholder="Buscar"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    aria-label="Buscar por nombre"
                  />
                  {(inFolderView || typeof listFolderFilter === "number") && (
                    <FolderTagFilterBar
                      strip
                      tags={folderTags}
                      selectedTagIds={selectedTagIds}
                      onToggle={onToggleTagFilter}
                      onClear={onClearTagFilter}
                      onManage={onManageTags}
                    />
                  )}
                </>
              )}
            </div>
            </div>
          </div>
        }
      />

      {copyNotice && (
        <p className="alert ok files-copy-notice" role="status">
          {copyNotice}
        </p>
      )}

      <div
        ref={workspaceRef}
        className={[
          "files-workspace",
          previewOpen && "files-workspace--split files-workspace--preview-open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="files-list-slot">
          <div
            className={`pf-table-wrap ${loadingFiles && !showSkeleton ? "is-loading" : ""} ${mainView === "active" ? "pf-table-wrap--upload-target" : ""} ${mainView === "active" && dragOver ? "pf-table-wrap--drop" : ""}`}
            onDragEnter={onFileDropEnter}
            onDragOver={onFileDropOver}
            onDragLeave={onFileDropLeave}
            onDrop={onFileDrop}
          >
            <div className="pf-table-inner">
              <table
                className={[
                  "pf-table",
                  isAdmin && "pf-table--admin",
                  mainView === "trash" && "pf-table--trash",
                  inFolderView && "pf-table--in-folder",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <colgroup>
                  {mainView === "active" && selectionMode && <col className="col-w-check" />}
                  <col className="col-w-name" />
                  {mainView === "active" && <col className="col-w-tags" />}
                  {showProjectColumn && <col className="col-w-folder" />}
                  <col className="col-w-detail" />
                  {isAdmin && <col className="col-w-user" />}
                  {showRowMenuColumn && <col className="col-w-row-menu" />}
                </colgroup>
                <thead>
                  <tr>
                    {mainView === "active" && selectionMode && (
                      <th className="col-check">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todos"
                          checked={allSelectedOnPage}
                          onChange={(e) => onToggleSelectAll(e.target.checked)}
                        />
                      </th>
                    )}
                    <th className="col-name-h">Nombre</th>
                    {mainView === "active" && <th className="col-tags-h">Etiquetas</th>}
                    {showProjectColumn && <th className="col-folder-h">Proyecto</th>}
                    <th className="col-detail-h">Detalle</th>
                    {isAdmin && <th className="col-user-h">Usuario</th>}
                    {showRowMenuColumn && (
                      <th className="col-row-menu-h" aria-hidden />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="skeleton-row">
                        <td colSpan={fileTableColCount}>
                          <div className="skeleton-bar" style={{ width: `${60 + i * 8}%` }} />
                        </td>
                      </tr>
                    ))
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={fileTableColCount} className="empty">
                        {loadingFiles
                          ? "Cargando…"
                          : dateFilterOn
                            ? "Sin archivos en este día."
                            : mainView === "active"
                              ? typeof listFolderFilter === "number"
                                ? inFolderView
                                  ? `Carpeta vacía. Arrastra archivos aquí o muévelos desde «Todos los archivos».`
                                  : "Sin archivos en esta carpeta."
                                : listFolderFilter === "none"
                                  ? "Sin archivos sueltos."
                                  : "Sin archivos activos."
                              : "No hay archivos eliminados."}
                      </td>
                    </tr>
                  ) : (
                    files.map((f) => {
                      const rowTags = f.tags ?? [];
                      const canPin = mainView === "active" && f.folderId != null;
                      const canDragFile = mainView === "active" && f.ownerUsername === sessionUsername;
                      const canRename = mainView === "active" && f.ownerUsername === sessionUsername;
                      const showRowMenu =
                        showRowMenuColumn && !(previewOpen && previewFileId === f.id);
                      const dropHandlers = fileRowTagDropHandlers(f);
                      return (
                        <tr
                          key={f.id}
                          className={[
                            previewFileId === f.id ? "file-row--preview-selected" : "",
                            selectedFileIds.includes(f.id) ? "file-row--bulk-selected" : "",
                            rowTags.length > 0 ? "file-row--tagged" : "",
                            tagDropTargetId === f.id ? "file-row--pin-target" : "",
                            canPin ? "file-row--pin-droppable" : "",
                            canDragFile ? "file-row--draggable" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={(e) => {
                            if (isFileRowInteractiveTarget(e.target)) return;
                            setRowMenuFileId(null);
                            const mod = e.shiftKey || e.metaKey || e.ctrlKey;
                            if (mainView === "active" && mod) {
                              onSelectFileRow(f.id, {
                                shiftKey: e.shiftKey,
                                metaKey: e.metaKey || e.ctrlKey,
                              });
                              return;
                            }
                            setPreviewFileId(f.id);
                          }}
                          title={
                            canPin
                              ? rowTags.length > 0
                                ? undefined
                                : "Suelta aquí una etiqueta"
                              : canDragFile
                                ? "Arrastra el nombre al proyecto en el sidebar"
                                : undefined
                          }
                          {...dropHandlers}
                        >
                          {mainView === "active" && selectionMode && (
                            <td className="col-check">
                              <input
                                type="checkbox"
                                checked={selectedFileIds.includes(f.id)}
                                onClick={(e) => {
                                  if (e.shiftKey) {
                                    e.preventDefault();
                                    onToggleRowSelection(f.id, true, {
                                      shiftKey: true,
                                      metaKey: e.metaKey || e.ctrlKey,
                                    });
                                  }
                                }}
                                onChange={(e) => {
                                  if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey) {
                                    return;
                                  }
                                  onToggleRowSelection(f.id, e.target.checked);
                                }}
                                aria-label={`Seleccionar ${f.originalName}`}
                              />
                            </td>
                          )}
                          <td className="col-name">
                            <div
                              className={[
                                "file-name-row",
                                canDragFile && "file-name-row--draggable",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              draggable={canDragFile}
                              title={canDragFile ? fileDragTitle(f, dragFilesForRow(f).length) : undefined}
                              onDragStart={
                                canDragFile
                                  ? (e) => {
                                      e.stopPropagation();
                                      const dragMetas = dragFilesForRow(f);
                                      const dragIds = dragMetas.map((item) => item.id);
                                      writeDraggedFileIds(e.dataTransfer, dragIds);
                                      e.currentTarget.classList.add("is-dragging");
                                      onFileDragStart();
                                    }
                                  : undefined
                              }
                              onDragEnd={
                                canDragFile
                                  ? (e) => {
                                      e.currentTarget.classList.remove("is-dragging");
                                      clearDraggedFileId();
                                      onFileDragEnd();
                                    }
                                  : undefined
                              }
                            >
                              {canDragFile && (
                                <span className="file-drag-hint" aria-hidden>
                                  <FileMoveHintIcon />
                                </span>
                              )}
                              <div className="file-name-cell">
                                <FileIcon originalName={f.originalName} contentType={f.contentType} />
                                {renamingFileId === f.id ? (
                                  <input
                                    ref={renameRef}
                                    className="file-inline-rename-input"
                                    value={renameDraft}
                                    onChange={(e) => setRenameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelRename();
                                      }
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void commitRename(f.id);
                                      }
                                    }}
                                    onBlur={() => void commitRename(f.id, true)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={renameSavingId === f.id}
                                    maxLength={255}
                                    aria-label="Nuevo nombre del archivo"
                                  />
                                ) : (
                                  <span
                                    className={`fname${canRename ? " fname--editable" : ""}`}
                                    title={
                                      canRename
                                        ? `${f.originalName} — doble clic para renombrar`
                                        : f.originalName
                                    }
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (canRename) startRename(f);
                                    }}
                                  >
                                    {f.originalName}
                                  </span>
                                )}
                              </div>
                            </div>
                            {mainView === "trash" && f.daysUntilPermanentDelete != null && (
                              <span className="purge-chip">
                                Purga en {f.daysUntilPermanentDelete} días
                              </span>
                            )}
                          </td>
                          {mainView === "active" && (
                            <td className="col-tags col-row-pill">
                              <div
                                className={`file-tags-slot ${canPin ? "file-tags-slot--droppable" : ""}`}
                                aria-label="Etiquetas del archivo"
                              >
                                {rowTags.length > 0 ? (
                                  <FileTagChips
                                    tags={rowTags}
                                    size="sm"
                                    removable={canPin && !tagPinning}
                                    onRemove={(tagId) => void onUnpinTagFromFile(f, tagId)}
                                  />
                                ) : canPin ? (
                                  <span className="file-tags-placeholder" aria-hidden>
                                    —
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          )}
                          {showProjectColumn && (
                            <td className="col-folder col-row-pill">
                              {f.ownerUsername === sessionUsername ? (
                                <FileRowFolderPicker
                                  file={f}
                                  folders={folders}
                                  onMove={(folderId) =>
                                    void onMoveToFolder(f.id, folderId == null ? "none" : folderId)
                                  }
                                />
                              ) : (
                                <span className="file-folder-readonly row-pill-text">
                                  <span className="col-folder-icon" aria-hidden>
                                    <TableFolderIcon />
                                  </span>
                                  {f.folderId == null
                                    ? LOOSE_FOLDER_LABEL
                                    : (folders.find((fo) => fo.id === f.folderId)?.name ?? "—")}
                                </span>
                              )}
                            </td>
                          )}
                          <td
                            className="col-meta col-detail"
                            title={`${formatBytes(f.sizeBytes)} · ${formatDate(mainView === "trash" && f.deletedAt ? f.deletedAt : f.createdAt)}`}
                          >
                            <div className="col-detail-inner">
                              <span className="col-detail-size">{formatBytesCompact(f.sizeBytes)}</span>
                              <span className="col-detail-sep" aria-hidden>
                                ·
                              </span>
                              <span className="col-detail-date">
                                {formatDateCompact(
                                  mainView === "trash" && f.deletedAt ? f.deletedAt : f.createdAt,
                                )}
                              </span>
                            </div>
                          </td>
                          {isAdmin && <td className="col-meta col-user">{f.ownerUsername}</td>}
                          {showRowMenu && (
                            <td className="col-row-menu">
                              <FileRowMenuButton
                                items={buildRowMenuItems(f, canRename)}
                                open={rowMenuFileId === f.id}
                                onOpenChange={(open) =>
                                  setRowMenuFileId(open ? f.id : null)
                                }
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {listMeta?.hasNext && (
              <div className="load-more-row">
                <button type="button" className="btn" disabled={loadingMore} onClick={onLoadMore}>
                  {loadingMore
                    ? "Cargando…"
                    : `Cargar más (${files.length} de ${listMeta.totalElements})`}
                </button>
              </div>
            )}
          </div>
        </div>

        {previewOpen && (
          <>
            <div
              className="files-preview-splitter"
              role="separator"
              aria-orientation="vertical"
              aria-label="Ajustar ancho de vista previa"
              aria-valuemin={200}
              aria-valuemax={900}
              aria-valuenow={previewWidth}
              title="Arrastra para redimensionar · doble clic para restablecer"
              tabIndex={0}
              onPointerDown={onSplitterPointerDown}
              onDoubleClick={resetPreviewWidth}
            />
            <div
              className="files-preview-slot"
              style={{ width: previewWidth, flexBasis: previewWidth }}
            >
              <FilePreviewPane
                compactHead
                file={previewFile}
                isTrash={mainView === "trash"}
                canEdit={previewFile?.ownerUsername === sessionUsername}
                showLifeContacts={mainView === "active"}
                onSessionLost={onSessionLost}
                onLifeError={onError}
                copyBusy={previewFile != null && copyBusyId === previewFile.id}
                onDownload={() => {
                  if (!previewFile) return;
                  downloadFile(previewFile.id, previewFile.originalName).catch((e) =>
                    onError(e instanceof Error ? e.message : "Error"),
                  );
                }}
                onShare={
                  previewFile && mainView === "active" && isNativeShareAvailable()
                    ? () => void handleShare(previewFile)
                    : undefined
                }
                onCopy={
                  previewFile && previewFile.ownerUsername === sessionUsername
                    ? () => void handleCopy(previewFile)
                    : undefined
                }
                onRename={
                  previewFile &&
                  mainView === "active" &&
                  previewFile.ownerUsername === sessionUsername
                    ? () => startRename(previewFile)
                    : undefined
                }
                onTrash={() => {
                  if (previewFile) onRequestTrash(previewFile);
                }}
                onRestore={() => {
                  if (previewFile) void onRestore(previewFile);
                }}
                onClose={() => setPreviewFileId(null)}
                onFileUpdated={onFileUpdated}
                onPreviewError={onError}
              />
            </div>
          </>
        )}
      </div>

      {presentationOpen && presentationFiles.length > 0 && (
        <Suspense fallback={null}>
          <PDFPresentation
            variant="fullscreen"
            files={presentationFiles}
            currentIndex={presentationIndex}
            onIndexChange={setPresentationIndex}
            onClose={closePresentation}
          />
        </Suspense>
      )}

      {sessionsListOpen && (
        <Suspense fallback={null}>
          <PresentationSessionsDialog
            open={sessionsListOpen}
            onClose={() => setSessionsListOpen(false)}
            onOpenSession={openSavedSession}
          />
        </Suspense>
      )}

      {sessionPanelOpen && activeSession && (
        <Suspense fallback={null}>
          <PresentationSessionPanel
            session={activeSession}
            files={sessionPanelFiles}
            availableFiles={folderPdfFiles}
            onClose={closeSessionPanel}
            onSessionChange={setActiveSession}
          />
        </Suspense>
      )}

      <CreateTextNoteDialog
        open={textNoteDialogOpen}
        onClose={() => setTextNoteDialogOpen(false)}
        onCreate={async (name, content) => {
          try {
            await handleCreateTextNote(name, content);
          } catch (e) {
            onError(e instanceof Error ? e.message : "No se pudo crear la nota");
            throw e;
          }
        }}
      />

      <AddToSpaceworkDialog
        open={spaceworkTarget != null}
        fileId={spaceworkTarget?.id}
        onClose={() => setSpaceworkTarget(null)}
        onError={onError}
        onSessionLost={onSessionLost}
      />

    </div>
  );
}
