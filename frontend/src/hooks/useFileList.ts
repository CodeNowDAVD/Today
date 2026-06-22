import { useCallback, useEffect, useRef, useState } from "react";
import { todayStart, toYearMonth } from "../dateUtils";
import {
  fetchFileCounts,
  fetchFileDays,
  FileItem,
  isSessionExpired,
  listFilesPage,
  listTrashPage,
} from "../api";
import { toDayString } from "../dateUtils";
import type { FolderFilter } from "../ProjectsNav";

export type FilesView = "active" | "trash";

export type ListMeta = {
  totalElements: number;
  hasNext: boolean;
  page: number;
};

type CacheEntry = {
  files: FileItem[];
  listMeta: ListMeta;
};

type LoadFilesOptions = {
  force?: boolean;
};

type Options = {
  session: unknown;
  filesView: FilesView | null;
  listFolderFilter: FolderFilter;
  selectedTagIds: number[];
  onUnauthorized: () => void;
  onError: (message: string) => void;
};

function buildListCacheKey(
  filesView: FilesView,
  folderFilter: FolderFilter,
  selectedTagIds: number[],
  filterDayKey: string,
  debouncedQuery: string,
): string {
  const tags = [...selectedTagIds].sort((a, b) => a - b).join(",");
  return `${filesView}|${String(folderFilter)}|${tags}|${filterDayKey}|${debouncedQuery}`;
}

export function useFileList({
  session,
  filesView,
  listFolderFilter,
  selectedTagIds,
  onUnauthorized,
  onError,
}: Options) {
  const [files, setFilesState] = useState<FileItem[]>([]);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [fileCounts, setFileCounts] = useState<{ active: number; trash: number } | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFilterOn, setDateFilterOn] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => todayStart());
  const [daysWithFiles, setDaysWithFiles] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [query, setQuery] = useState("");

  const fetchGen = useRef(0);
  const listMetaRef = useRef(listMeta);
  const cacheRef = useRef(new Map<string, CacheEntry>());
  const currentCacheKeyRef = useRef<string | null>(null);
  listMetaRef.current = listMeta;

  const writeCache = useCallback((key: string, files: FileItem[], meta: ListMeta) => {
    cacheRef.current.set(key, { files, listMeta: meta });
    currentCacheKeyRef.current = key;
  }, []);

  const setFiles = useCallback(
    (updater: FileItem[] | ((prev: FileItem[]) => FileItem[])) => {
      setFilesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const key = currentCacheKeyRef.current;
        const meta = listMetaRef.current;
        if (key && meta) {
          cacheRef.current.set(key, { files: next, listMeta: meta });
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setFilesState([]);
    setListMeta(null);
    setFileCounts(null);
    setDateFilterOn(false);
    setDaysWithFiles([]);
    setQuery("");
    setDebouncedQuery("");
    cacheRef.current.clear();
    currentCacheKeyRef.current = null;
    fetchGen.current++;
  }, []);

  useEffect(() => {
    if (!session) reset();
  }, [session, reset]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadCounts = useCallback(async () => {
    try {
      setFileCounts(await fetchFileCounts());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (isSessionExpired(msg)) onUnauthorized();
    }
  }, [onUnauthorized]);

  const loadDaysForMonth = useCallback(
    async (yearMonth: string) => {
      if (!filesView) return;
      try {
        const days = await fetchFileDays({
          month: yearMonth,
          trash: filesView === "trash",
          folder: filesView === "active" ? listFolderFilter : undefined,
        });
        setDaysWithFiles(days);
      } catch {
        /* opcional */
      }
    },
    [filesView, listFolderFilter],
  );

  const loadFiles = useCallback(
    async (resetPage: boolean, options?: LoadFilesOptions) => {
      if (!filesView) return;
      const gen = ++fetchGen.current;
      const cacheKey = buildListCacheKey(
        filesView,
        listFolderFilter,
        selectedTagIds,
        dateFilterOn ? toDayString(selectedDay) : "",
        debouncedQuery,
      );

      if (resetPage) {
        const cached = !options?.force ? cacheRef.current.get(cacheKey) : undefined;
        if (cached) {
          setFilesState(cached.files);
          setListMeta(cached.listMeta);
          currentCacheKeyRef.current = cacheKey;
          setLoadingFiles(false);
          setLoadingMore(false);
          return;
        }
        setLoadingFiles(true);
        setListMeta(null);
      } else {
        setLoadingMore(true);
      }

      const page = resetPage ? 0 : (listMetaRef.current?.page ?? 0) + 1;
      const day = dateFilterOn ? toDayString(selectedDay) : undefined;
      const q = debouncedQuery;

      try {
        const folderIdForTags = typeof listFolderFilter === "number" ? listFolderFilter : null;
        const tagFilter =
          filesView === "active" && folderIdForTags != null && selectedTagIds.length > 0
            ? selectedTagIds
            : undefined;
        const result =
          filesView === "active"
            ? await listFilesPage({ folder: listFolderFilter, day, q, page, tags: tagFilter })
            : await listTrashPage({ day, q, page });
        if (gen !== fetchGen.current) return;

        const nextMeta = {
          totalElements: result.totalElements,
          hasNext: result.hasNext,
          page: result.page,
        };

        setFilesState((prev) => {
          const nextFiles = resetPage ? result.content : [...prev, ...result.content];
          writeCache(cacheKey, nextFiles, nextMeta);
          return nextFiles;
        });
        setListMeta(nextMeta);
      } catch (e) {
        if (gen !== fetchGen.current) return;
        const msg = e instanceof Error ? e.message : "Error";
        if (isSessionExpired(msg)) onUnauthorized();
        else onError(msg);
      } finally {
        if (gen === fetchGen.current) {
          setLoadingFiles(false);
          setLoadingMore(false);
        }
      }
    },
    [
      filesView,
      listFolderFilter,
      selectedTagIds,
      dateFilterOn,
      selectedDay,
      debouncedQuery,
      onUnauthorized,
      onError,
      writeCache,
    ],
  );

  const filterDayKey = dateFilterOn ? toDayString(selectedDay) : "";

  const enableDateFilter = useCallback(() => {
    const today = todayStart();
    setSelectedDay(today);
    setDateFilterOn(true);
    void loadDaysForMonth(toYearMonth(today));
  }, [loadDaysForMonth]);

  const disableDateFilter = useCallback(() => {
    setDateFilterOn(false);
    setDaysWithFiles([]);
  }, []);

  return {
    files,
    setFiles,
    listMeta,
    fileCounts,
    loadingFiles,
    loadingMore,
    dateFilterOn,
    selectedDay,
    setSelectedDay,
    daysWithFiles,
    query,
    setQuery,
    filterDayKey,
    loadFiles,
    loadCounts,
    loadDaysForMonth,
    enableDateFilter,
    disableDateFilter,
    reset,
    fetchGen,
  };
}
