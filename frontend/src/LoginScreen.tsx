import { FormEvent, useEffect, useState } from "react";
import {
  InvitationPreview,
  LoginResponse,
  previewInvitation,
  register,
  userFacingError,
} from "./api";

type Props = {
  booting: boolean;
  loginUser: string;
  loginPass: string;
  error: string | null;
  inviteToken?: string | null;
  onLoginUser: (v: string) => void;
  onLoginPass: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRegistered: (res: LoginResponse, projectId?: number) => void;
  onError: (msg: string | null) => void;
};

export default function LoginScreen({
  booting,
  loginUser,
  loginPass,
  error,
  inviteToken,
  onLoginUser,
  onLoginPass,
  onSubmit,
  onRegistered,
  onError,
}: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [invitePreview, setInvitePreview] = useState<InvitationPreview | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setInvitePreview(null);
      return;
    }
    setInviteLoading(true);
    void previewInvitation(inviteToken)
      .then((preview) => {
        setInvitePreview(preview);
        if (preview.registrationRequired) {
          setMode("register");
          if (preview.email) setRegEmail(preview.email);
        }
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Invitación inválida"))
      .finally(() => setInviteLoading(false));
  }, [inviteToken, onError]);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (regPass !== regPass2) {
      onError("Las contraseñas no coinciden");
      return;
    }
    setRegistering(true);
    onError(null);
    try {
      const res = await register(regUser.trim(), regPass, regEmail.trim(), inviteToken);
      onRegistered(res, invitePreview?.projectId);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>SOrbitS</h1>
        <p className="tagline">
          {booting ? "Conectando…" : "Tus archivos y enlaces, en un solo lugar"}
        </p>

        {inviteToken && invitePreview && !invitePreview.expired && (
          <div className="login-invite-banner" role="status">
            <strong>{invitePreview.inviterUsername}</strong> te invita a{" "}
            <strong>{invitePreview.projectName}</strong> como {invitePreview.role}.
            {invitePreview.registrationRequired
              ? " Crea tu cuenta para unirte."
              : " Inicia sesión para aceptar."}
          </div>
        )}

        {!booting && inviteToken && inviteLoading && <p className="muted">Cargando invitación…</p>}

        {!booting && (
          <>
            {invitePreview?.registrationRequired && (
              <div className="login-mode-tabs">
                <button
                  type="button"
                  className={mode === "register" ? "on" : ""}
                  onClick={() => setMode("register")}
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  className={mode === "login" ? "on" : ""}
                  onClick={() => setMode("login")}
                >
                  Ya tengo cuenta
                </button>
              </div>
            )}

            {mode === "login" || !invitePreview?.registrationRequired ? (
              <form className="login-form" onSubmit={onSubmit}>
                <label>
                  <span>Usuario</span>
                  <input
                    value={loginUser}
                    onChange={(e) => onLoginUser(e.target.value)}
                    autoComplete="username"
                  />
                </label>
                <label>
                  <span>Contraseña</span>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => onLoginPass(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                {error && <p className="alert error">{userFacingError(error)}</p>}
                <button type="submit" className="btn primary login-submit">
                  Iniciar sesión
                </button>
              </form>
            ) : (
              <form className="login-form" onSubmit={(e) => void handleRegister(e)}>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    readOnly={Boolean(invitePreview?.email)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>Usuario</span>
                  <input
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </label>
                <label>
                  <span>Contraseña</span>
                  <input
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  <span>Repetir contraseña</span>
                  <input
                    type="password"
                    value={regPass2}
                    onChange={(e) => setRegPass2(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </label>
                {error && <p className="alert error">{userFacingError(error)}</p>}
                <button type="submit" className="btn primary login-submit" disabled={registering}>
                  {registering ? "Creando cuenta…" : "Crear cuenta y unirme"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
