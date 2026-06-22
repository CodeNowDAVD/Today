import { getToken, isSessionExpired, SESSION_EXPIRED } from "./api";

export type SseFetchStreamOptions = {
  url: string;
  onBlock: (block: string) => void;
  onError: (msg: string) => void;
  /** Reintentos tras cierre/error de stream (default 12). */
  maxRetries?: number;
};

const BASE_RETRY_MS = 900;
const MAX_RETRY_MS = 30_000;

/**
 * SSE vía fetch con reconexión exponencial. Abort del cleanup cancela reintentos.
 */
export function subscribeReconnectingSseStream({
  url,
  onBlock,
  onError,
  maxRetries = 12,
}: SseFetchStreamOptions): () => void {
  const controller = new AbortController();
  let retries = 0;
  let retryTimer: number | null = null;
  let connecting = false;

  const clearRetry = () => {
    if (retryTimer != null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleRetry = () => {
    if (controller.signal.aborted) return;
    if (retries >= maxRetries) {
      onError("Conexión en vivo perdida");
      return;
    }
    const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 1.6 ** retries);
    retries += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  };

  const connect = async () => {
    if (controller.signal.aborted || connecting) return;
    connecting = true;

    const token = getToken();
    let buffer = "";

    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });

      if (res.status === 401) {
        onError(SESSION_EXPIRED);
        return;
      }
      if (!res.ok || !res.body) {
        throw new Error("SSE connection failed");
      }

      retries = 0;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let splitAt = buffer.indexOf("\n\n");
        while (splitAt >= 0) {
          const block = buffer.slice(0, splitAt);
          buffer = buffer.slice(splitAt + 2);
          if (block.trim()) {
            onBlock(block);
          }
          splitAt = buffer.indexOf("\n\n");
        }
      }

      scheduleRetry();
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Stream desconectado";
      if (isSessionExpired(msg)) {
        onError(SESSION_EXPIRED);
        return;
      }
      scheduleRetry();
    } finally {
      connecting = false;
    }
  };

  void connect();

  return () => {
    controller.abort();
    clearRetry();
  };
}
