import { useCallback, useEffect, useState } from "react";
import { fetchMe, getToken, login, LoginResponse, setToken } from "../api";

export function useSession() {
  const [booting, setBooting] = useState(() => !!getToken());
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const clearSession = useCallback(() => {
    setToken(null);
    setSession(null);
    setLoginUser("");
    setLoginPass("");
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    fetchMe()
      .then((me) => {
        setSession({
          accessToken: token,
          tokenType: "Bearer",
          username: me.username,
          role: me.role,
        });
      })
      .catch(() => {
        setToken(null);
        setSession(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setToken(null);
      const res = await login(loginUser, loginPass);
      setToken(res.accessToken);
      setSession(res);
      return res;
    },
    [loginUser, loginPass],
  );

  const applyLogin = useCallback((res: LoginResponse) => {
    setToken(res.accessToken);
    setSession(res);
  }, []);

  return {
    booting,
    session,
    isAdmin: session?.role === "ADMIN",
    loginUser,
    setLoginUser,
    loginPass,
    setLoginPass,
    handleLogin,
    applyLogin,
    clearSession,
  };
}
