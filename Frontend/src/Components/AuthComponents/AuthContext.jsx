import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { onSessionExpired, refreshAccessToken, tokenStore } from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

const AuthContext = createContext(null);

const ADMIN_ROLES = ["admin", "superadmin"];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  // "loading" until we know whether the refresh cookie still holds a session
  const [status, setStatus] = useState("loading");
  const [sessionMessage, setSessionMessage] = useState("");

  const applySession = useCallback((data) => {
    tokenStore.set(data.accessToken);
    setUser(data.user);
    setPermissions(data.permissions || []);
    setStatus("authenticated");
    setSessionMessage("");
    connectSocket();
  }, []);

  const clearSession = useCallback((message = "") => {
    tokenStore.set(null);
    setUser(null);
    setPermissions([]);
    setStatus("anonymous");
    setSessionMessage(message);
    disconnectSocket();
  }, []);

  // Restore the session on page load.
  useEffect(() => {
    let cancelled = false;
    refreshAccessToken()
      .then((data) => !cancelled && applySession(data))
      .catch(() => !cancelled && clearSession());
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    onSessionExpired((code) => {
      const message =
        code === "ACCOUNT_BLOCKED"
          ? "Your account has been blocked. Please contact an administrator."
          : "Your session has ended. Please sign in again.";
      clearSession(message);
    });
  }, [clearSession]);

  const login = useCallback(
    async (identifier, password) => {
      const { data } = await api.post("/auth/login", { identifier, password });
      if (data.requiresTwoFactor) return { requiresTwoFactor: true, twoFactorToken: data.twoFactorToken };
      applySession(data);
      return { user: data.user };
    },
    [applySession]
  );

  const verifyTwoFactor = useCallback(
    async (twoFactorToken, code) => {
      const { data } = await api.post("/auth/login/2fa", { twoFactorToken, code });
      applySession(data);
      return data;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutEverywhere = useCallback(async () => {
    await api.post("/auth/logout-all");
    clearSession();
  }, [clearSession]);

  /** After a password change the server hands back a fresh access token. */
  const replaceAccessToken = useCallback((token) => tokenStore.set(token), []);

  const updateUser = useCallback((changes) => setUser((current) => (current ? { ...current, ...changes } : current)), []);

  const value = useMemo(
    () => ({
      user,
      status,
      permissions,
      sessionMessage,
      isLoggedIn: status === "authenticated",
      isAdmin: Boolean(user && ADMIN_ROLES.includes(user.role)),
      isSuperAdmin: user?.role === "superadmin",
      can: (permission) => permissions.includes(permission),
      login,
      verifyTwoFactor,
      logout,
      logoutEverywhere,
      replaceAccessToken,
      updateUser,
    }),
    [user, status, permissions, sessionMessage, login, verifyTwoFactor, logout, logoutEverywhere, replaceAccessToken, updateUser]
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};

export default AuthContext;
