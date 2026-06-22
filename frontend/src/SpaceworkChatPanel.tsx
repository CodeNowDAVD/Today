import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  createSpaceworkChannel,
  formatDateCompact,
  isSessionExpired,
  listSpaceworkChannels,
  listSpaceworkMessages,
  ProjectRole,
  sendSpaceworkMessage,
  SpaceworkChannel,
  SpaceworkMessage,
} from "./api";
import { appendMessage, subscribeSpaceworkChatStream } from "./spaceworkChatStream";
import { SpaceworkLiveBadge, SpaceworkLoading } from "./spaceworkUi";

type Props = {
  projectId: number;
  myRole: ProjectRole;
  sessionUsername: string;
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function SpaceworkChatPanel({
  projectId,
  myRole,
  sessionUsername,
  onSessionLost,
  onError,
}: Props) {
  const [channels, setChannels] = useState<SpaceworkChannel[]>([]);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SpaceworkMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = myRole !== "VIEWER";
  const canCreateChannel = myRole === "OWNER" || myRole === "ADMIN";

  const handleErr = useCallback(
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error";
      if (isSessionExpired(msg)) {
        onSessionLost();
        return;
      }
      onError(msg);
    },
    [onError, onSessionLost],
  );

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const rows = await listSpaceworkChannels(projectId);
      setChannels(rows);
      setChannelId((current) => {
        if (current != null && rows.some((c) => c.id === current)) return current;
        return rows[0]?.id ?? null;
      });
    } catch (err) {
      handleErr(err);
    } finally {
      setLoadingChannels(false);
    }
  }, [projectId, handleErr]);

  const loadMessages = useCallback(async () => {
    if (channelId == null) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      setMessages(await listSpaceworkMessages(projectId, channelId));
    } catch (err) {
      handleErr(err);
    } finally {
      setLoadingMessages(false);
    }
  }, [projectId, channelId, handleErr]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (channelId == null) {
      setLiveConnected(false);
      return;
    }
    setLiveConnected(false);
    const stop = subscribeSpaceworkChatStream(
      projectId,
      channelId,
      (msg) => setMessages((prev) => appendMessage(prev, msg)),
      (msg) => {
        setLiveConnected(false);
        if (isSessionExpired(msg)) onSessionLost();
      },
      () => setLiveConnected(true),
    );
    return () => {
      stop();
      setLiveConnected(false);
    };
  }, [projectId, channelId, onSessionLost]);

  useEffect(() => {
    if (channelId == null || liveConnected) return;
    const timer = window.setInterval(() => void loadMessages(), 15000);
    return () => window.clearInterval(timer);
  }, [channelId, liveConnected, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!canSend || channelId == null || !draft.trim()) return;
    setSending(true);
    try {
      const msg = await sendSpaceworkMessage(projectId, channelId, draft.trim());
      setDraft("");
      setMessages((prev) => appendMessage(prev, msg));
    } catch (err) {
      handleErr(err);
    } finally {
      setSending(false);
    }
  }

  async function handleCreateChannel(e: FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const created = await createSpaceworkChannel(projectId, newChannelName.trim());
      setNewChannelOpen(false);
      setNewChannelName("");
      await loadChannels();
      setChannelId(created.id);
    } catch (err) {
      handleErr(err);
    } finally {
      setCreatingChannel(false);
    }
  }

  const activeChannel = channels.find((c) => c.id === channelId);

  return (
    <div className="spacework-chat">
      <aside className="spacework-chat-channels" aria-label="Canales">
        {loadingChannels ? (
          <SpaceworkLoading label="Cargando canales…" />
        ) : (
          <ul className="spacework-chat-channel-list">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`spacework-chat-channel-btn ${channelId === c.id ? "on" : ""}`}
                  onClick={() => setChannelId(c.id)}
                >
                  #{c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {canCreateChannel && (
          <button
            type="button"
            className="btn ghost sm spacework-chat-new-channel"
            onClick={() => setNewChannelOpen(true)}
          >
            + Canal
          </button>
        )}
      </aside>

      <div className="spacework-chat-main">
        <header className="spacework-chat-header">
          <span className="spacework-chat-header-title">
            {activeChannel ? `#${activeChannel.name}` : "Chat"}
            {liveConnected ? <SpaceworkLiveBadge /> : null}
          </span>
          <button type="button" className="btn ghost sm" onClick={() => void loadMessages()}>
            Actualizar
          </button>
        </header>

        <div className="spacework-chat-messages" aria-live="polite">
          {loadingMessages && messages.length === 0 ? (
            <p className="muted pad-sm">Cargando mensajes…</p>
          ) : messages.length === 0 ? (
            <p className="muted pad-sm">Sin mensajes. Escribe el primero.</p>
          ) : (
            messages.map((m) => (
              <article
                key={m.id}
                className={[
                  "spacework-chat-message",
                  m.authorUsername === sessionUsername && "spacework-chat-message--mine",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <header className="spacework-chat-message-head">
                  <strong>{m.authorUsername}</strong>
                  <time dateTime={m.createdAt}>{formatDateCompact(m.createdAt)}</time>
                </header>
                <p className="spacework-chat-message-body">{m.content}</p>
              </article>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {canSend ? (
          <form className="spacework-chat-compose" onSubmit={(e) => void handleSend(e)}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Mensaje en #${activeChannel?.name ?? "…"}`}
              rows={2}
              maxLength={4000}
            />
            <button type="submit" className="btn primary" disabled={sending || !draft.trim()}>
              {sending ? "…" : "Enviar"}
            </button>
          </form>
        ) : (
          <p className="spacework-chat-readonly muted pad-sm">Solo lectura en este proyecto.</p>
        )}
      </div>

      {newChannelOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setNewChannelOpen(false)}>
          <form
            className="confirm-card spacework-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleCreateChannel(e)}
          >
            <h2>Nuevo canal</h2>
            <label className="field">
              <span>Nombre</span>
              <input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="diseno"
                pattern="[a-zA-Z0-9_\-]+"
                required
                autoFocus
              />
            </label>
            <p className="muted">Letras, números, guión o guión bajo. Sin espacios.</p>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setNewChannelOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={creatingChannel}>
                {creatingChannel ? "Creando…" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
