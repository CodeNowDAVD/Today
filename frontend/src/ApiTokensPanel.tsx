import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiTokenSummary,
  createApiToken,
  formatDateCompact,
  isSessionExpired,
  listApiTokens,
  revokeApiToken,
} from "./api";
import WorkspaceChrome from "./WorkspaceChrome";

type Props = {
  onSessionLost: () => void;
  onError: (msg: string) => void;
};

export default function ApiTokensPanel({ onSessionLost, onError }: Props) {
  const [tokens, setTokens] = useState<ApiTokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTokens(await listApiTokens());
    } catch (err) {
      handleErr(err);
    } finally {
      setLoading(false);
    }
  }, [handleErr]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const created = await createApiToken(trimmed);
      setFreshToken(created.token);
      setCopied(false);
      setName("");
      setTokens((prev) => [
        {
          id: created.id,
          name: created.name,
          tokenPrefix: created.tokenPrefix,
          createdAt: created.createdAt,
          lastUsedAt: null,
        },
        ...prev,
      ]);
    } catch (err) {
      handleErr(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    try {
      await revokeApiToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      handleErr(err);
    }
  }

  async function handleCopy() {
    if (!freshToken) return;
    try {
      await navigator.clipboard.writeText(freshToken);
      setCopied(true);
    } catch {
      onError("No se pudo copiar al portapapeles");
    }
  }

  return (
    <div className="api-tokens-view">
      <WorkspaceChrome
        title="Tokens de API"
        subtitle="Acceso programático con Bearer token (scripts, n8n, curl)"
        stats={loading ? undefined : `${tokens.length} activo${tokens.length === 1 ? "" : "s"}`}
      />
      <div className="api-tokens-panel pad">
        <p className="api-tokens-intro muted">
          Usa <code>Authorization: Bearer sor_…</code> en lugar del JWT de sesión. El valor completo
          solo se muestra una vez al crear el token.
        </p>

        <form className="api-tokens-create" onSubmit={(e) => void handleCreate(e)}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (ej. n8n, backup script)"
            maxLength={80}
          />
          <button type="submit" className="btn sm" disabled={creating || !name.trim()}>
            {creating ? "…" : "Crear token"}
          </button>
        </form>

        {freshToken && (
          <div className="api-tokens-reveal" role="alert">
            <p className="api-tokens-reveal__title">Copia este token ahora — no volverá a mostrarse</p>
            <code className="api-tokens-reveal__value">{freshToken}</code>
            <div className="api-tokens-reveal__actions">
              <button type="button" className="btn sm" onClick={() => void handleCopy()}>
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setFreshToken(null)}>
                Entendido
              </button>
            </div>
          </div>
        )}

        <section className="api-tokens-list">
          <h2 className="api-tokens-list__title">Tokens activos</h2>
          {loading ? (
            <p className="muted">Cargando…</p>
          ) : tokens.length === 0 ? (
            <p className="muted">Sin tokens. Crea uno para integraciones externas.</p>
          ) : (
            <ul className="api-tokens-rows">
              {tokens.map((t) => (
                <li key={t.id} className="api-tokens-row">
                  <div className="api-tokens-row__main">
                    <span className="api-tokens-row__name">{t.name}</span>
                    <span className="api-tokens-row__prefix muted">{t.tokenPrefix}…</span>
                  </div>
                  <div className="api-tokens-row__meta muted">
                    <span>Creado {formatDateCompact(t.createdAt)}</span>
                    {t.lastUsedAt ? (
                      <span> · Último uso {formatDateCompact(t.lastUsedAt)}</span>
                    ) : (
                      <span> · Sin usar</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm danger"
                    onClick={() => void handleRevoke(t.id)}
                  >
                    Revocar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="api-tokens-example muted">
          <h3>Ejemplo</h3>
          <pre>{`curl -H "Authorization: Bearer sor_TU_TOKEN" \\
  https://app.sorbits.site/api/v1/search?q=informe`}</pre>
        </section>
      </div>
    </div>
  );
}
