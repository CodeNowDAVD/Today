export type Role = "ADMIN" | "USER";

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  username: string;
  role: Role;
}

export interface FileTagItem {
  id: number;
  name: string;
  color: string;
}

export interface FolderTagItem extends FileTagItem {
  folderId: number;
}

export interface FileItem {
  id: number;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  section: string;
  createdAt: string;
  ownerUsername: string;
  deletedAt: string | null;
  daysUntilPermanentDelete: number | null;
  folderId: number | null;
  tags?: FileTagItem[];
}

export interface FolderItem {
  id: number;
  name: string;
  createdAt: string;
  fileCount: number;
}

export interface LinkItem {
  id: number;
  title: string;
  url: string;
  folderId: number | null;
  createdAt: string;
  tags?: FileTagItem[];
}

export type FolderQuery = "all" | "none" | number;

export interface PagedFiles {
  content: FileItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface FileCounts {
  active: number;
  trash: number;
}

export const FILES_PAGE_SIZE = 30;

export type ListFilesParams = {
  folder?: FolderQuery;
  day?: string;
  q?: string;
  tags?: number[];
  page?: number;
  size?: number;
};

export interface UserRow {
  id: number;
  username: string;
  role: Role;
  active: boolean;
}

const TOKEN_KEY = "sorbits_token";

/** Internal marker thrown on HTTP 401; map with userFacingError before showing in UI. */
export const SESSION_EXPIRED = "SESSION_EXPIRED";

export function isSessionExpired(message: string): boolean {
  return message === SESSION_EXPIRED;
}

export function userFacingError(message: string): string {
  if (isSessionExpired(message)) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  return message;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function probeTokenStillValid(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    if (token) {
      const stillValid = await probeTokenStillValid(token);
      if (stillValid) {
        throw new Error(
          "Esta acción no está en el servidor todavía. Falta desplegar el backend actualizado.",
        );
      }
      setToken(null);
    }
    throw new Error(SESSION_EXPIRED);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    let msg = err.error || res.statusText || "Error de servidor";
    if (typeof msg !== "string" || !msg.trim()) msg = "Error de servidor";
    if (res.status === 404 && path.includes("/rename")) {
      msg = "Renombrar no está disponible en el servidor. Despliega el backend actualizado.";
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 401) {
    const err = await res.json().catch(() => ({ error: "" }));
    const msg = typeof err.error === "string" ? err.error.trim() : "";
    throw new Error(
      msg && msg !== "No autenticado" ? msg : "Usuario o contraseña incorrectos",
    );
  }
  if (res.status === 429) {
    const err = await res.json().catch(() => ({ error: "" }));
    throw new Error(
      typeof err.error === "string" && err.error.trim()
        ? err.error
        : "Demasiados intentos. Espera un momento.",
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "No se pudo iniciar sesión");
  }
  return res.json() as Promise<LoginResponse>;
}

export async function register(
  username: string,
  password: string,
  email: string,
  inviteToken?: string | null,
): Promise<LoginResponse> {
  const res = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      email,
      inviteToken: inviteToken || null,
    }),
  });
  if (res.status === 429) {
    const err = await res.json().catch(() => ({ error: "" }));
    throw new Error(
      typeof err.error === "string" && err.error.trim()
        ? err.error
        : "Demasiados intentos. Espera un momento.",
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "No se pudo crear la cuenta");
  }
  return res.json() as Promise<LoginResponse>;
}

export interface MeResponse {
  id: number;
  username: string;
  role: Role;
}

export function fetchMe() {
  return api<MeResponse>("/api/v1/auth/me");
}

function folderParams(folder: FolderQuery = "all"): string {
  if (folder === "none") return "&uncategorized=true";
  if (typeof folder === "number") return `&folderId=${folder}`;
  return "";
}

function buildListQuery(base: string, params: ListFilesParams): string {
  const q = new URLSearchParams();
  q.set("section", "UTILS");
  if (params.day) q.set("day", params.day);
  if (params.q?.trim()) q.set("q", params.q.trim());
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? FILES_PAGE_SIZE));
  if (params.tags?.length) {
    for (const id of params.tags) q.append("tags", String(id));
  }
  const folder = folderParams(params.folder ?? "all");
  return `${base}?${q}${folder}`;
}

export function listFilesPage(params: ListFilesParams = {}) {
  return api<PagedFiles>(buildListQuery("/api/v1/files", params));
}

export function listTrashPage(params: Omit<ListFilesParams, "folder"> = {}) {
  const q = new URLSearchParams();
  q.set("section", "UTILS");
  if (params.day) q.set("day", params.day);
  if (params.q?.trim()) q.set("q", params.q.trim());
  q.set("page", String(params.page ?? 0));
  q.set("size", String(params.size ?? FILES_PAGE_SIZE));
  return api<PagedFiles>(`/api/v1/files/trash?${q}`);
}

export function fetchFileCounts() {
  return api<FileCounts>("/api/v1/files/counts?section=UTILS");
}

export function fetchFileDays(opts: {
  month: string;
  trash?: boolean;
  folder?: FolderQuery;
}) {
  const q = new URLSearchParams();
  q.set("section", "UTILS");
  q.set("month", opts.month);
  if (opts.trash) q.set("trash", "true");
  const folder = folderParams(opts.folder ?? "all");
  return api<string[]>(`/api/v1/files/days?${q}${folder}`);
}

export function listFolders() {
  return api<FolderItem[]>("/api/v1/folders");
}

export function createFolder(name: string) {
  return api<FolderItem>("/api/v1/folders", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function renameFolder(id: number, name: string) {
  return api<FolderItem>(`/api/v1/folders/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function deleteFolder(id: number) {
  return api<void>(`/api/v1/folders/${id}`, { method: "DELETE" });
}

export function listAllFolderTags() {
  return api<FolderTagItem[]>("/api/v1/tags");
}

export function listFolderTags(folderId: number) {
  return api<FolderTagItem[]>(`/api/v1/folders/${folderId}/tags`);
}

export function createFolderTag(folderId: number, name: string, color?: string) {
  return api<FolderTagItem>(`/api/v1/folders/${folderId}/tags`, {
    method: "POST",
    body: JSON.stringify({ name, color: color || null }),
  });
}

export function deleteFolderTag(tagId: number) {
  return api<void>(`/api/v1/tags/${tagId}`, { method: "DELETE" });
}

export function setFileTags(fileId: number, tagIds: number[]) {
  return api<FileTagItem[]>(`/api/v1/files/${fileId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
}

export type ListLinksParams = {
  folder?: FolderQuery;
  q?: string;
  tags?: number[];
};

function linksQuery(params?: ListLinksParams): string {
  const sp = new URLSearchParams();
  if (params?.folder === "none") sp.set("uncategorized", "true");
  else if (typeof params?.folder === "number") sp.set("folderId", String(params.folder));
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  if (params?.tags?.length) sp.set("tags", params.tags.join(","));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function listLinks(params?: ListLinksParams) {
  return api<LinkItem[]>(`/api/v1/links${linksQuery(params)}`);
}

export function createLink(title: string, url: string, folderId?: number | null) {
  return api<LinkItem>("/api/v1/links", {
    method: "POST",
    body: JSON.stringify({ title, url, folderId: folderId ?? null }),
  });
}

export function updateLink(id: number, title: string, url: string, folderId?: number | null) {
  return api<LinkItem>(`/api/v1/links/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, url, folderId: folderId ?? null }),
  });
}

export function assignLinkFolder(linkId: number, folderId: number | null) {
  return api<LinkItem>(`/api/v1/links/${linkId}/folder`, {
    method: "PUT",
    body: JSON.stringify({ folderId }),
  });
}

export function setLinkTags(linkId: number, tagIds: number[]) {
  return api<FileTagItem[]>(`/api/v1/links/${linkId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
}

export function deleteLink(id: number) {
  return api<void>(`/api/v1/links/${id}`, { method: "DELETE" });
}

export function assignFileFolder(fileId: number, folderId: number | null) {
  return api<FileItem>(`/api/v1/files/${fileId}/folder`, {
    method: "PUT",
    body: JSON.stringify({ folderId }),
  });
}

export function listUsers() {
  return api<UserRow[]>("/api/v1/admin/users");
}

export function createUser(username: string, password: string, role: Role) {
  return api<UserRow>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export function updateUser(
  id: number,
  patch: { password?: string; role?: Role; active?: boolean },
) {
  return api<UserRow>(`/api/v1/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteUser(id: number) {
  return api<void>(`/api/v1/admin/users/${id}`, { method: "DELETE" });
}

const UPLOAD_TIMEOUT_MS = 8 * 60 * 1000;
const UPLOAD_STALL_MS = 90 * 1000;
const UPLOAD_CONFIRM_STALL_MS = 75 * 1000;

/** Límite Spring/nginx en el servidor. */
export const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;
/** Cloudflare (proxy naranja) suele cortar ~100 MB; dejar margen. */
export const CLOUDFLARE_UPLOAD_BYTES = 92 * 1024 * 1024;

export function uploadBlockedReason(file: File): string | null {
  const size = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} (${size}): el máximo en SOrbitS es 128 MB.`;
  }
  const host = typeof location !== "undefined" ? location.hostname : "";
  const onPublicSite = host === "app.sorbits.site" || host.endsWith(".sorbits.site");
  const riskyName = /\.(exe|msi|zip|rar|7z|dmg|pkg)$/i.test(file.name);
  if (onPublicSite && (file.size > CLOUDFLARE_UPLOAD_BYTES || (riskyName && file.size > 80 * 1024 * 1024))) {
    return (
      `${file.name} (${size}) no puede subirse por Internet en app.sorbits.site. ` +
      `Cloudflare bloquea archivos ~100 MB (Bizagi ~99 MB). ` +
      `En tu WiFi abre http://192.168.2.16:8088 e inicia sesión ahí.`
    );
  }
  return null;
}

let activeUploadXhr: XMLHttpRequest | null = null;

export function cancelActiveUpload() {
  activeUploadXhr?.abort();
}

function isExecutableUploadName(name: string): boolean {
  return /\.(exe|msi|dll|bat|cmd|scr|com|app)$/i.test(name);
}

function uploadStallMessage(uploadBodyDone: boolean, fileName?: string): string {
  if (isExecutableUploadName(fileName ?? "")) {
    return uploadBodyDone
      ? "El servidor no confirmó la subida del .exe (Cloudflare u otro proxy puede bloquearlo). Prueba comprimirlo en .zip o renombrarlo."
      : "La subida del .exe se detuvo. Comprímelo en .zip o súbelo desde la red local si estás en casa.";
  }
  return uploadBodyDone
    ? "El servidor no respondió tras recibir el archivo. Intenta de nuevo o comprueba la conexión."
    : "La subida se detuvo (sin actividad). Revisa la conexión e intenta de nuevo.";
}

function multipartUploadError(status: number, responseText: string, fallback: string): string {
  if (status === 413) {
    return "Archivo demasiado grande (límite 128 MB en SOrbitS).";
  }
  if (status === 502 || status === 504) {
    return "El servidor tardó demasiado en recibir el archivo.";
  }
  try {
    const j = JSON.parse(responseText) as { error?: string };
    return j.error || fallback;
  } catch {
    const trimmed = responseText.trim();
    if (trimmed && !trimmed.startsWith("<")) return trimmed.slice(0, 240);
    return fallback;
  }
}

function sendMultipartXhr<T>(
  method: "POST" | "PUT",
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void,
  errorFallback = "Error al subir",
  fileName?: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    activeUploadXhr = xhr;
    let lastActivity = Date.now();
    let uploadBodyDone = false;

    const touch = () => {
      lastActivity = Date.now();
    };

    const cleanup = () => {
      clearInterval(stallTimer);
      if (activeUploadXhr === xhr) activeUploadXhr = null;
    };

    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };

    xhr.open(method, url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onloadstart = () => {
      touch();
      onProgress?.(-1);
    };
    xhr.upload.onprogress = (e) => {
      touch();
      if (!onProgress) return;
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (e.loaded >= e.total) uploadBodyDone = true;
        onProgress(Math.min(pct, 100));
      } else {
        onProgress(-1);
      }
    };
    xhr.upload.onload = () => {
      uploadBodyDone = true;
      touch();
      onProgress?.(100);
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status === 401) {
        setToken(null);
        reject(new Error(SESSION_EXPIRED));
        return;
      }
      if (xhr.status === 0) {
        fail(
          isExecutableUploadName(fileName ?? "")
            ? "Conexión cortada al subir .exe. Comprímelo en .zip e intenta otra vez."
            : "Conexión interrumpida al subir. Si el archivo es grande, el proxy puede estar limitando la subida.",
        );
        return;
      }
      if (xhr.status >= 400) {
        reject(new Error(multipartUploadError(xhr.status, xhr.responseText, errorFallback)));
        return;
      }
      resolve(JSON.parse(xhr.responseText) as T);
    };
    xhr.onerror = () => fail("Red no disponible");
    xhr.ontimeout = () =>
      fail(
        isExecutableUploadName(fileName ?? "")
          ? "Tiempo agotado subiendo .exe. Comprímelo en .zip — Cloudflare suele retener ejecutables."
          : "Tiempo de espera agotado al subir el archivo",
      );
    xhr.onabort = () => fail("Subida cancelada");

    const stallTimer = window.setInterval(() => {
      const limit = uploadBodyDone ? UPLOAD_CONFIRM_STALL_MS : UPLOAD_STALL_MS;
      if (Date.now() - lastActivity > limit) {
        xhr.abort();
        fail(uploadStallMessage(uploadBodyDone, fileName));
      }
    }, 4000);

    xhr.send(form);
  });
}

export function uploadFile(file: File, onProgress?: (pct: number) => void, folderId?: number | null) {
  const form = new FormData();
  form.append("file", file);
  form.append("section", "UTILS");
  if (folderId != null) form.append("folderId", String(folderId));
  return sendMultipartXhr<FileItem>("POST", "/api/v1/files", form, onProgress, "Error al subir", file.name);
}

export function fetchFileBlob(id: number, inline = false): Promise<Blob> {
  const token = getToken();
  const q = inline ? "?inline=true" : "";
  return fetch(`/api/v1/files/${id}/download${q}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    if (res.status === 401) {
      setToken(null);
      throw new Error(SESSION_EXPIRED);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "No se pudo leer el archivo" }));
      throw new Error(err.error || "No se pudo leer el archivo");
    }
    return res.blob();
  });
}

function officePreviewHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** PDF temporal generado en servidor (LibreOffice). Null si el conversor no está disponible (503). */
export function fetchOfficePreviewPdf(id: number): Promise<Blob | null> {
  return fetch(`/api/v1/files/${id}/preview/office.pdf`, {
    headers: officePreviewHeaders(),
  }).then(async (res) => {
    if (res.status === 503) return null;
    if (res.status === 401) {
      setToken(null);
      throw new Error(SESSION_EXPIRED);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "No se pudo generar la vista previa" }));
      throw new Error(err.error || "No se pudo generar la vista previa");
    }
    return res.blob();
  });
}

/** Libera el PDF temporal en el servidor al cerrar la vista previa. */
export function releaseOfficePreviewPdf(id: number): void {
  const token = getToken();
  if (!token) return;
  void fetch(`/api/v1/files/${id}/preview/office.pdf`, {
    method: "DELETE",
    headers: officePreviewHeaders(),
  });
}

export function downloadFile(id: number, name: string) {
  return fetchFileBlob(id).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function renameFile(id: number, name: string) {
  return api<FileItem>(`/api/v1/files/${id}/rename`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function duplicateFile(id: number) {
  return api<FileItem>(`/api/v1/files/${id}/copy`, { method: "POST" });
}

export function replaceFileContent(id: number, file: File, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append("file", file);
  return sendMultipartXhr<FileItem>(
    "PUT",
    `/api/v1/files/${id}/content`,
    form,
    onProgress,
    "Error al guardar",
    file.name,
  );
}

export function moveToTrash(id: number) {
  return api<void>(`/api/v1/files/${id}`, { method: "DELETE" });
}

export function restoreFile(id: number) {
  return api<FileItem>(`/api/v1/files/${id}/restore`, { method: "POST" });
}

export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface SpaceworkProject {
  id: number;
  name: string;
  description: string | null;
  createdByUsername: string;
  createdAt: string;
  myRole: ProjectRole;
  memberCount: number;
  itemCount: number;
  workspaceKind?: string;
  template?: string | null;
}

export interface SpaceworkMember {
  userId: number;
  username: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface SpaceworkItem {
  id: number;
  kind: "FILE" | "LINK";
  fileId: number | null;
  fileName: string | null;
  fileContentType: string | null;
  fileSizeBytes: number | null;
  fileOwnerUsername: string | null;
  linkId: number | null;
  linkTitle: string | null;
  linkUrl: string | null;
  addedByUsername: string;
  addedAt: string;
}

export interface SpaceworkActivity {
  id: number;
  actorUsername: string;
  activityType: string;
  summary: string;
  createdAt: string;
}

export function listSpaceworkProjects() {
  return api<SpaceworkProject[]>("/api/v1/spacework/projects");
}

export function createSpaceworkProject(name: string, description?: string) {
  return api<SpaceworkProject>("/api/v1/spacework/projects", {
    method: "POST",
    body: JSON.stringify({ name, description: description || null }),
  });
}

export function getSpaceworkProject(id: number) {
  return api<SpaceworkProject>(`/api/v1/spacework/projects/${id}`);
}

export function updateSpaceworkProject(id: number, name: string, description?: string) {
  return api<SpaceworkProject>(`/api/v1/spacework/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, description: description || null }),
  });
}

export function listSpaceworkMembers(projectId: number) {
  return api<SpaceworkMember[]>(`/api/v1/spacework/projects/${projectId}/members`);
}

export function addSpaceworkMember(projectId: number, username: string, role: ProjectRole) {
  return api<SpaceworkMember>(`/api/v1/spacework/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ username, role }),
  });
}

export function removeSpaceworkMember(projectId: number, userId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function listSpaceworkItems(projectId: number) {
  return api<SpaceworkItem[]>(`/api/v1/spacework/projects/${projectId}/items`);
}

export function addSpaceworkFile(projectId: number, fileId: number) {
  return api<SpaceworkItem>(`/api/v1/spacework/projects/${projectId}/items`, {
    method: "POST",
    body: JSON.stringify({ fileId, linkId: null }),
  });
}

export function addSpaceworkLink(projectId: number, linkId: number) {
  return api<SpaceworkItem>(`/api/v1/spacework/projects/${projectId}/items`, {
    method: "POST",
    body: JSON.stringify({ fileId: null, linkId }),
  });
}

export function removeSpaceworkItem(projectId: number, itemId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export function listSpaceworkActivity(projectId: number) {
  return api<SpaceworkActivity[]>(`/api/v1/spacework/projects/${projectId}/activity`);
}

export function archiveSpaceworkProject(projectId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/archive`, { method: "POST" });
}

export function updateSpaceworkMemberRole(projectId: number, userId: number, role: ProjectRole) {
  return api<SpaceworkMember>(`/api/v1/spacework/projects/${projectId}/members/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export function transferSpaceworkOwnership(projectId: number, newOwnerId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/transfer-ownership`, {
    method: "POST",
    body: JSON.stringify({ newOwnerId }),
  });
}

export interface SpaceworkInvitation {
  id: number;
  projectId: number;
  projectName: string;
  inviterUsername: string;
  inviteeUsername: string | null;
  email: string | null;
  role: ProjectRole;
  status: string;
  token?: string | null;
  inviteUrl?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationPreview {
  invitationId: number;
  projectId: number;
  projectName: string;
  inviterUsername: string;
  role: ProjectRole;
  status: string;
  email: string | null;
  expired: boolean;
  registrationRequired: boolean;
}

export function listSpaceworkInvitations(projectId: number) {
  return api<SpaceworkInvitation[]>(`/api/v1/spacework/projects/${projectId}/invitations`);
}

export function createSpaceworkInvitation(
  projectId: number,
  payload: { username?: string; email?: string; role: ProjectRole },
) {
  return api<SpaceworkInvitation>(`/api/v1/spacework/projects/${projectId}/invitations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelSpaceworkInvitation(projectId: number, invitationId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export function previewInvitation(token: string) {
  return fetch(`/api/v1/invitations/${encodeURIComponent(token)}`)
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Invitación inválida");
      }
      return res.json() as Promise<InvitationPreview>;
    });
}

export function acceptInvitation(token: string) {
  return api<SpaceworkInvitation>(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    body: "{}",
  });
}

export function declineInvitation(token: string) {
  return api<void>(`/api/v1/invitations/${encodeURIComponent(token)}/decline`, {
    method: "POST",
    body: "{}",
  });
}

export function listMyProjectInvitations() {
  return api<SpaceworkInvitation[]>("/api/v1/me/project-invitations");
}

export function acceptMyProjectInvitation(id: number) {
  return api<SpaceworkInvitation>(`/api/v1/me/project-invitations/${id}/accept`, {
    method: "POST",
    body: "{}",
  });
}

export function declineMyProjectInvitation(id: number) {
  return api<void>(`/api/v1/me/project-invitations/${id}/decline`, {
    method: "POST",
    body: "{}",
  });
}

export function searchUsers(q: string, projectId?: number) {
  const params = new URLSearchParams({ q });
  if (projectId != null) params.set("projectId", String(projectId));
  return api<{ id: number; username: string }[]>(`/api/v1/users/search?${params}`);
}

export function completeSpaceworkBoardTask(projectId: number, taskId: number, completed = true) {
  return api<BoardTask>(`/api/v1/spacework/projects/${projectId}/tasks/${taskId}/complete`, {
    method: "POST",
    body: JSON.stringify({ completed }),
  });
}

export interface SpaceworkChannel {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface SpaceworkMessage {
  id: number;
  channelId: number;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export function listSpaceworkChannels(projectId: number) {
  return api<SpaceworkChannel[]>(`/api/v1/spacework/projects/${projectId}/channels`);
}

export function createSpaceworkChannel(projectId: number, name: string, description?: string) {
  return api<SpaceworkChannel>(`/api/v1/spacework/projects/${projectId}/channels`, {
    method: "POST",
    body: JSON.stringify({ name, description: description || null }),
  });
}

export function listSpaceworkMessages(projectId: number, channelId: number) {
  return api<SpaceworkMessage[]>(
    `/api/v1/spacework/projects/${projectId}/channels/${channelId}/messages`,
  );
}

export function sendSpaceworkMessage(projectId: number, channelId: number, content: string) {
  return api<SpaceworkMessage>(
    `/api/v1/spacework/projects/${projectId}/channels/${channelId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export interface SpaceworkFileComment {
  id: number;
  fileId: number;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export function listSpaceworkFileComments(projectId: number, fileId: number) {
  return api<SpaceworkFileComment[]>(
    `/api/v1/spacework/projects/${projectId}/files/${fileId}/comments`,
  );
}

export function addSpaceworkFileComment(projectId: number, fileId: number, content: string) {
  return api<SpaceworkFileComment>(
    `/api/v1/spacework/projects/${projectId}/files/${fileId}/comments`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export function deleteSpaceworkFileComment(projectId: number, fileId: number, commentId: number) {
  return api<void>(
    `/api/v1/spacework/projects/${projectId}/files/${fileId}/comments/${commentId}`,
    { method: "DELETE" },
  );
}

export interface SpaceworkPresentation {
  active: boolean;
  hostUserId: number;
  hostUsername: string;
  fileIds: number[];
  currentFileIndex: number;
  startedAt: string;
  updatedAt: string;
}

export async function getSpaceworkPresentation(projectId: number) {
  const row = await api<SpaceworkPresentation>(
    `/api/v1/spacework/projects/${projectId}/presentation`,
  );
  return row.active ? row : null;
}

export function startSpaceworkPresentation(projectId: number, fileIds: number[]) {
  return api<SpaceworkPresentation>(`/api/v1/spacework/projects/${projectId}/presentation`, {
    method: "POST",
    body: JSON.stringify({ fileIds }),
  });
}

export function updateSpaceworkPresentation(projectId: number, currentFileIndex: number) {
  return api<SpaceworkPresentation>(`/api/v1/spacework/projects/${projectId}/presentation`, {
    method: "PUT",
    body: JSON.stringify({ currentFileIndex }),
  });
}

export function stopSpaceworkPresentation(projectId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/presentation`, {
    method: "DELETE",
  });
}

export interface BoardColumn {
  id: number;
  name: string;
  position: number;
}

export interface BoardTask {
  id: number;
  columnId: number;
  title: string;
  description: string | null;
  position: number;
  assigneeUserId: number | null;
  assigneeUsername: string | null;
  linkedFileId: number | null;
  linkedFileName: string | null;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  completedAt: string | null;
  tags: string[];
}

export interface SpaceworkBoard {
  columns: BoardColumn[];
  tasks: BoardTask[];
}

export function listSpaceworkBoard(projectId: number) {
  return api<SpaceworkBoard>(`/api/v1/spacework/projects/${projectId}/board`);
}

export function createSpaceworkBoardColumn(projectId: number, name: string) {
  return api<BoardColumn>(`/api/v1/spacework/projects/${projectId}/board/columns`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function createSpaceworkBoardTask(
  projectId: number,
  columnId: number,
  title: string,
  description?: string,
  assigneeUserId?: number,
  dueAt?: string | null,
  tags?: string[],
) {
  return api<BoardTask>(`/api/v1/spacework/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title,
      description: description || null,
      columnId,
      assigneeUserId: assigneeUserId ?? null,
      dueAt: dueAt ?? null,
      tags: tags ?? null,
    }),
  });
}

export function updateSpaceworkBoardTask(
  projectId: number,
  taskId: number,
  patch: {
    title?: string;
    description?: string;
    columnId?: number;
    position?: number;
    assigneeUserId?: number;
    clearAssignee?: boolean;
    linkedFileId?: number;
    clearLinkedFile?: boolean;
    dueAt?: string | null;
    clearDueAt?: boolean;
    complete?: boolean;
    reopen?: boolean;
    tags?: string[];
  },
) {
  return api<BoardTask>(`/api/v1/spacework/projects/${projectId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteSpaceworkBoardTask(projectId: number, taskId: number) {
  return api<void>(`/api/v1/spacework/projects/${projectId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export interface WikiPageSummary {
  id: number;
  slug: string;
  title: string;
  updatedByUsername: string;
  updatedAt: string;
}

export interface WikiPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  createdByUsername: string;
  updatedByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export function listSpaceworkWikiPages(projectId: number) {
  return api<WikiPageSummary[]>(`/api/v1/spacework/projects/${projectId}/wiki/pages`);
}

export function getSpaceworkWikiPage(projectId: number, slug: string) {
  return api<WikiPage>(`/api/v1/spacework/projects/${projectId}/wiki/pages/${encodeURIComponent(slug)}`);
}

export function createSpaceworkWikiPage(
  projectId: number,
  slug: string,
  title: string,
  content?: string,
) {
  return api<WikiPage>(`/api/v1/spacework/projects/${projectId}/wiki/pages`, {
    method: "POST",
    body: JSON.stringify({ slug, title, content: content ?? "" }),
  });
}

export function updateSpaceworkWikiPage(
  projectId: number,
  slug: string,
  patch: { title?: string; content?: string },
) {
  return api<WikiPage>(
    `/api/v1/spacework/projects/${projectId}/wiki/pages/${encodeURIComponent(slug)}`,
    { method: "PUT", body: JSON.stringify(patch) },
  );
}

export function deleteSpaceworkWikiPage(projectId: number, slug: string) {
  return api<void>(
    `/api/v1/spacework/projects/${projectId}/wiki/pages/${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}

export type SearchHitKind =
  | "FILE"
  | "LINK"
  | "PROJECT"
  | "WIKI"
  | "TASK"
  | "LIFE_TASK"
  | "INBOX_ITEM"
  | "CONTACT";

export interface SearchHit {
  kind: SearchHitKind;
  id: number;
  title: string;
  subtitle: string | null;
  projectId: number | null;
  slug: string | null;
}

export function globalSearch(q: string) {
  const params = new URLSearchParams({ q });
  return api<{ hits: SearchHit[] }>(`/api/v1/search?${params}`);
}

export interface ApiTokenSummary {
  id: number;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedApiToken extends ApiTokenSummary {
  token: string;
}

export function listApiTokens() {
  return api<ApiTokenSummary[]>("/api/v1/me/api-tokens");
}

export function createApiToken(name: string) {
  return api<CreatedApiToken>("/api/v1/me/api-tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function revokeApiToken(id: number) {
  return api<void>(`/api/v1/me/api-tokens/${id}`, { method: "DELETE" });
}

export interface AppNotification {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  projectId: number;
  projectName: string;
  targetTab: string | null;
  entityId: number | null;
  read: boolean;
  createdAt: string;
}

export function listNotifications() {
  return api<AppNotification[]>("/api/v1/me/notifications");
}

export function notificationUnreadCount() {
  return api<{ count: number }>("/api/v1/me/notifications/unread-count");
}

export function markNotificationRead(id: number) {
  return api<AppNotification>(`/api/v1/me/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return api<{ count: number }>("/api/v1/me/notifications/read-all", { method: "POST" });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Formato corto para tablas (p. ej. 765K, 1.1M). */
export function formatBytesCompact(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}K`;
  const mb = n / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)}M` : `${mb.toFixed(1)}M`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Formato corto para tablas (p. ej. 04/06 17:26). */
export function formatDateCompact(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

// —— Vida / Focus Mode ——

export interface LifeWorkspace {
  id: number;
  name: string;
  description: string | null;
  workspaceKind: string;
  template: string | null;
  createdByUsername: string;
  createdAt: string;
  itemCount: number;
}

export interface LifeTaskSummary {
  id: number;
  workspaceId: number;
  workspaceName: string;
  workspaceKind: string;
  columnId: number;
  columnName: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  linkedFileId: number | null;
  linkedFileName: string | null;
  tags: string[];
  /** OVERDUE | TODAY | SOON | LATER | NONE — asignado en servidor. */
  dueBucket?: string | null;
}

export interface LifeRecentFile {
  id: number;
  name: string;
  contentType: string | null;
  updatedAt: string;
}

export interface LifeInboxItem {
  id: number;
  content: string;
  kind: string;
  processed: boolean;
  createdAt: string;
}

export interface LifeTodayMeta {
  timezone: string;
  asOf: string;
  startOfToday: string;
  startOfTomorrow: string;
  soonDaysWindow: number;
  upcomingDaysWindow: number;
}

/** Misma zona que el backend (`app.timezone`). Fallback si la API aún no envía `meta`. */
export const DEFAULT_APP_TIMEZONE = "America/Mexico_City";

export interface LifeToday {
  meta?: LifeTodayMeta;
  tasksOverdue: LifeTaskSummary[];
  tasksDueToday: LifeTaskSummary[];
  tasksDueSoon: LifeTaskSummary[];
  inboxPending: LifeInboxItem[];
  recentFiles: LifeRecentFile[];
  activeWorkspaces: LifeWorkspace[];
  inboxPendingCount: number;
}

export interface LifeContact {
  id: number;
  name: string;
  roleLabel: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

export function listLifeWorkspaces() {
  return api<LifeWorkspace[]>("/api/v1/life/workspaces");
}

export function createLifeWorkspace(name: string, description?: string, template?: string) {
  return api<LifeWorkspace>("/api/v1/life/workspaces", {
    method: "POST",
    body: JSON.stringify({ name, description: description || null, template: template || null }),
  });
}

export function archiveLifeWorkspace(id: number) {
  return api<void>(`/api/v1/life/workspaces/${id}`, { method: "DELETE" });
}

export function promoteLifeWorkspace(id: number) {
  return api<{ id: number; workspaceKind: string }>(`/api/v1/life/workspaces/${id}/promote`, {
    method: "POST",
  });
}

export function getLifeToday() {
  return api<LifeToday>("/api/v1/life/today").then(normalizeLifeToday);
}

function normalizeLifeToday(data: LifeToday): LifeToday {
  const tasksOverdue = data.tasksOverdue ?? [];
  const tasksDueToday = data.tasksDueToday ?? [];
  const tasksDueSoon = data.tasksDueSoon ?? [];
  const inboxPending = data.inboxPending ?? [];
  const recentFiles = data.recentFiles ?? [];
  const activeWorkspaces = data.activeWorkspaces ?? [];
  const inboxPendingCount = data.inboxPendingCount ?? inboxPending.length;

  if (data.meta?.timezone) {
    return {
      ...data,
      tasksOverdue,
      tasksDueToday,
      tasksDueSoon,
      inboxPending,
      recentFiles,
      activeWorkspaces,
      inboxPendingCount,
    };
  }

  return {
    ...data,
    tasksOverdue,
    tasksDueToday,
    tasksDueSoon,
    inboxPending,
    recentFiles,
    activeWorkspaces,
    inboxPendingCount,
    meta: {
      timezone: DEFAULT_APP_TIMEZONE,
      asOf: new Date().toISOString(),
      startOfToday: "",
      startOfTomorrow: "",
      soonDaysWindow: 3,
      upcomingDaysWindow: 7,
    },
  };
}

export function listLifeTasks(filter = "all", tag?: string, workspaceId?: number) {
  const params = new URLSearchParams({ filter });
  if (tag) params.set("tag", tag);
  if (workspaceId != null) params.set("workspaceId", String(workspaceId));
  return api<LifeTaskSummary[]>(`/api/v1/life/tasks?${params}`);
}

export function completeLifeTask(workspaceId: number, taskId: number) {
  return api<BoardTask>(`/api/v1/life/tasks/${workspaceId}/${taskId}/complete`, { method: "POST" });
}

export function listLifeInbox() {
  return api<LifeInboxItem[]>("/api/v1/life/inbox");
}

export function lifeInboxCount() {
  return api<number>("/api/v1/life/inbox/count");
}

export function captureLifeInbox(content: string, kind?: string) {
  return api<LifeInboxItem>("/api/v1/life/inbox", {
    method: "POST",
    body: JSON.stringify({ content, kind: kind || null }),
  });
}

export function patchLifeInbox(
  id: number,
  patch: {
    processed?: boolean;
    workspaceId?: number;
    convertToTaskTitle?: string;
    convertToTaskColumnId?: number;
    convertToTaskDueAt?: string;
  },
) {
  return api<LifeInboxItem>(`/api/v1/life/inbox/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteLifeInbox(id: number) {
  return api<void>(`/api/v1/life/inbox/${id}`, { method: "DELETE" });
}

export function listLifeContacts() {
  return api<LifeContact[]>("/api/v1/life/contacts");
}

export function createLifeContact(
  name: string,
  roleLabel?: string,
  email?: string,
  notes?: string,
) {
  return api<LifeContact>("/api/v1/life/contacts", {
    method: "POST",
    body: JSON.stringify({ name, roleLabel: roleLabel || null, email: email || null, notes: notes || null }),
  });
}

export function updateLifeContact(
  id: number,
  patch: { name?: string; roleLabel?: string; email?: string; notes?: string },
) {
  return api<LifeContact>(`/api/v1/life/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteLifeContact(id: number) {
  return api<void>(`/api/v1/life/contacts/${id}`, { method: "DELETE" });
}

export function getLifeContactLinked(id: number) {
  return api<{
    contact: LifeContact;
    tasks: LifeTaskSummary[];
    files: LifeRecentFile[];
  }>(`/api/v1/life/contacts/${id}/linked`);
}

export function linkLifeContactTask(contactId: number, taskId: number) {
  return api<void>(`/api/v1/life/contacts/${contactId}/tasks/${taskId}`, { method: "POST" });
}

export function listLifeTaskContacts(taskId: number) {
  return api<LifeContact[]>(`/api/v1/life/tasks/${taskId}/contacts`);
}

export function setLifeTaskContacts(taskId: number, contactIds: number[]) {
  return api<LifeContact[]>(`/api/v1/life/tasks/${taskId}/contacts`, {
    method: "PUT",
    body: JSON.stringify({ contactIds }),
  });
}

export function linkLifeContactFile(contactId: number, fileId: number) {
  return api<void>(`/api/v1/life/contacts/${contactId}/files/${fileId}`, { method: "POST" });
}

export function listLifeFileContacts(fileId: number) {
  return api<LifeContact[]>(`/api/v1/life/files/${fileId}/contacts`);
}

export function setLifeFileContacts(fileId: number, contactIds: number[]) {
  return api<LifeContact[]>(`/api/v1/life/files/${fileId}/contacts`, {
    method: "PUT",
    body: JSON.stringify({ contactIds }),
  });
}

export function suggestLifeTags(prefix = "") {
  return api<string[]>(`/api/v1/life/tags/suggest?prefix=${encodeURIComponent(prefix)}`);
}
