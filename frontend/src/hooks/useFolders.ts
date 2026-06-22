import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FolderItem,
  FolderTagItem,
  isSessionExpired,
  listAllFolderTags,
  listFolderTags,
  listFolders,
  type LoginResponse,
} from "../api";
import type { MainView } from "../appTypes";
import type { FolderFilter } from "../ProjectsNav";

function folderIdsKey(folders: FolderItem[]): string {
  return folders
    .map((f) => f.id)
    .sort((a, b) => a - b)
    .join(",");
}

export function useFolders(
  session: LoginResponse | null,
  mainView: MainView,
  listFolderFilter: FolderFilter,
  onUnauthorized: () => void,
) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [folderTags, setFolderTags] = useState<FolderTagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [allLinkTags, setAllLinkTags] = useState<FolderTagItem[]>([]);

  const foldersLoadGen = useRef(0);
  const folderTagsGen = useRef(0);
  const allLinkTagsGen = useRef(0);

  const activeFolderId = typeof folderFilter === "number" ? folderFilter : null;
  const inFolderNav = typeof folderFilter === "number";
  const tagFolderId = inFolderNav
    ? folderFilter
    : typeof listFolderFilter === "number"
      ? listFolderFilter
      : null;
  const linkFolderIdsKey = useMemo(() => folderIdsKey(folders), [folders]);

  const loadFolders = useCallback(async () => {
    const gen = ++foldersLoadGen.current;
    setFoldersLoading(true);
    try {
      const rows = await listFolders();
      if (gen !== foldersLoadGen.current) return;
      setFolders(rows);
    } catch (e) {
      if (gen !== foldersLoadGen.current) return;
      const msg = e instanceof Error ? e.message : "Error";
      if (isSessionExpired(msg)) onUnauthorized();
    } finally {
      if (gen === foldersLoadGen.current) setFoldersLoading(false);
    }
  }, [onUnauthorized]);

  const mergeFolder = useCallback((folder: FolderItem) => {
    setFolders((prev) => {
      const next = prev.some((f) => f.id === folder.id)
        ? prev.map((f) => (f.id === folder.id ? folder : f))
        : [...prev, folder];
      return next.sort((a, b) => a.name.localeCompare(b.name, "es"));
    });
  }, []);

  const loadFolderTags = useCallback(
    async (folderId: number) => {
      const gen = ++folderTagsGen.current;
      try {
        const tags = await listFolderTags(folderId);
        if (gen !== folderTagsGen.current) return;
        setFolderTags(tags);
      } catch (e) {
        if (gen !== folderTagsGen.current) return;
        const msg = e instanceof Error ? e.message : "Error";
        if (isSessionExpired(msg)) {
          onUnauthorized();
          return;
        }
        setFolderTags([]);
      }
    },
    [onUnauthorized],
  );

  const loadAllLinkTags = useCallback(async () => {
    const gen = ++allLinkTagsGen.current;
    try {
      const tags = await listAllFolderTags();
      if (gen !== allLinkTagsGen.current) return;
      setAllLinkTags(tags);
    } catch (e) {
      if (gen !== allLinkTagsGen.current) return;
      const msg = e instanceof Error ? e.message : "Error";
      if (isSessionExpired(msg)) {
        onUnauthorized();
        return;
      }
      setAllLinkTags([]);
    }
  }, [onUnauthorized]);

  const reset = useCallback(() => {
    foldersLoadGen.current++;
    folderTagsGen.current++;
    allLinkTagsGen.current++;
    setFoldersLoading(false);
    setFolders([]);
    setFolderTags([]);
    setSelectedTagIds([]);
    setAllLinkTags([]);
    setFolderFilter("all");
  }, []);

  useEffect(() => {
    if (!session) {
      reset();
      return;
    }
    void loadFolders();
  }, [session, loadFolders, reset]);

  useEffect(() => {
    if (mainView !== "links") return;
    void loadAllLinkTags();
  }, [mainView, linkFolderIdsKey, loadAllLinkTags]);

  useEffect(() => {
    if (mainView !== "active") {
      setFolderTags([]);
      setSelectedTagIds([]);
      return;
    }
    if (tagFolderId == null) {
      setFolderTags([]);
      setSelectedTagIds([]);
      return;
    }
    void loadFolderTags(tagFolderId);
    setSelectedTagIds([]);
  }, [tagFolderId, loadFolderTags, mainView]);

  useEffect(() => {
    if (typeof folderFilter !== "number") return;
    if (folders.length === 0) return;
    if (!folders.some((f) => f.id === folderFilter)) {
      setFolderFilter("all");
    }
  }, [folderFilter, folders]);

  return {
    folders,
    foldersLoading,
    folderFilter,
    setFolderFilter,
    projectsExpanded,
    setProjectsExpanded,
    folderTags,
    selectedTagIds,
    setSelectedTagIds,
    allLinkTags,
    activeFolderId,
    tagFolderId,
    loadFolders,
    loadFolderTags,
    mergeFolder,
    reset,
  };
}
