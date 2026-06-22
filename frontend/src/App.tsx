import { useCallback, useEffect, useState } from "react";
import { CalendarDays, FolderKanban } from "lucide-react";
import LoginScreen from "./LoginScreen";
import SpaceworkPanel from "./SpaceworkPanel";
import LifePanel from "./life/LifePanel";
import QuickCaptureModal from "./life/QuickCaptureModal";
import { useSession } from "./hooks/useSession";
import { isSessionExpired, lifeInboxCount, userFacingError } from "./api";
import type { SpaceworkNavTarget } from "./spaceworkNav";
import type { LifeNavTarget } from "./lifeNav";

type MainView = "spacework" | "life";

export default function App() {
  const {
    booting,
    session,
    loginUser,
    setLoginUser,
    loginPass,
    setLoginPass,
    handleLogin,
    clearSession,
  } = useSession();

  const [mainView, setMainView] = useState<MainView>("life");
  const [error, setError] = useState<string | null>(null);
  const [spaceworkNav, setSpaceworkNav] = useState<SpaceworkNavTarget | null>(null);
  const [lifeNav, setLifeNav] = useState<LifeNavTarget | null>({ view: "today" });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [inboxPending, setInboxPending] = useState(0);

  const refreshInboxCount = useCallback(async () => {
    if (!session) return;
    try {
      setInboxPending(await lifeInboxCount());
    } catch {
      /* ignore badge errors */
    }
  }, [session]);

  useEffect(() => {
    void refreshInboxCount();
  }, [refreshInboxCount]);

  const onSessionLost = useCallback(() => {
    clearSession();
    setError("Sesión expirada. Vuelve a iniciar sesión.");
  }, [clearSession]);

  const onError = useCallback((msg: string) => {
    if (isSessionExpired(msg)) onSessionLost();
    else setError(msg);
  }, [onSessionLost]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await handleLogin(e);
    } catch (err) {
      setError(userFacingError(err instanceof Error ? err.message : String(err)));
    }
  }

  if (booting) {
    return (
      <div className="today-boot">
        <p>Cargando…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        booting={false}
        loginUser={loginUser}
        loginPass={loginPass}
        error={error}
        onLoginUser={setLoginUser}
        onLoginPass={setLoginPass}
        onSubmit={submitLogin}
        onRegistered={() => {}}
        onError={setError}
      />
    );
  }

  return (
    <div className="today-shell">
      <header className="today-topbar">
        <div className="today-brand">
          <span className="today-brand__mark">Today</span>
          <span className="today-brand__sub">Spacework + Hoy</span>
        </div>

        <nav className="today-nav" aria-label="Vista principal">
          <button
            type="button"
            className={`today-nav__btn ${mainView === "life" ? "on" : ""}`}
            onClick={() => {
              setMainView("life");
              setLifeNav((n) => n ?? { view: "today" });
            }}
          >
            <CalendarDays size={18} aria-hidden />
            Hoy
            {inboxPending > 0 ? <span className="today-nav__badge">{inboxPending}</span> : null}
          </button>
          <button
            type="button"
            className={`today-nav__btn ${mainView === "spacework" ? "on" : ""}`}
            onClick={() => setMainView("spacework")}
          >
            <FolderKanban size={18} aria-hidden />
            Spacework
          </button>
        </nav>

        <div className="today-topbar__actions">
          <button type="button" className="today-capture-btn" onClick={() => setCaptureOpen(true)}>
            Captura rápida
          </button>
          <span className="today-user">{session.username}</span>
          <button type="button" className="today-logout" onClick={clearSession}>
            Salir
          </button>
        </div>
      </header>

      {error ? (
        <div className="today-error" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar">
            ×
          </button>
        </div>
      ) : null}

      <main className="today-main">
        {mainView === "spacework" ? (
          <SpaceworkPanel
            sessionUsername={session.username}
            navTarget={spaceworkNav}
            onNavConsumed={() => setSpaceworkNav(null)}
            onSessionLost={onSessionLost}
            onError={onError}
          />
        ) : (
          <LifePanel
            sessionUsername={session.username}
            navTarget={lifeNav}
            onNavConsumed={() => setLifeNav(null)}
            onSessionLost={onSessionLost}
            onError={onError}
            onInboxChange={refreshInboxCount}
          />
        )}
      </main>

      <QuickCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onSaved={refreshInboxCount}
        onSessionLost={onSessionLost}
        onError={onError}
      />
    </div>
  );
}
