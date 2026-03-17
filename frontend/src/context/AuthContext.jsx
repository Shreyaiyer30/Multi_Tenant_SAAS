import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { pingBackend, setupInterceptors } from "@/api/api";
import { loginRequest, registerRequest } from "@/api/auth";

const AuthContext = createContext(null);
const ACCESS_TOKEN_KEY = "accessToken";
const ACCESS_TOKEN_LEGACY_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_TOKEN_LEGACY_KEY = "refresh_token";
const ACTIVE_TENANT_KEY = "activeTenant";
const ACTIVE_TENANT_LEGACY_KEY = "tenant_slug";

const getStoredTenant = () =>
  localStorage.getItem(ACTIVE_TENANT_KEY) || localStorage.getItem(ACTIVE_TENANT_LEGACY_KEY) || "";

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_LEGACY_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);

  const setTenantSlug = (slug) => {
    if (slug) {
      localStorage.setItem(ACTIVE_TENANT_KEY, slug);
      localStorage.setItem(ACTIVE_TENANT_LEGACY_KEY, slug);
    } else {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
      localStorage.removeItem(ACTIVE_TENANT_LEGACY_KEY);
    }
    window.dispatchEvent(new Event("tenant-changed"));
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_LEGACY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_LEGACY_KEY);
    localStorage.removeItem(ACTIVE_TENANT_KEY);
    localStorage.removeItem(ACTIVE_TENANT_LEGACY_KEY);
    localStorage.removeItem("workspaces");
    window.dispatchEvent(new Event("tenant-changed"));
    setAccessToken(null);
    setUser(null);
  };

  const persistTokens = (payload) => {
    const token = payload?.access || payload?.access_token || null;
    const refresh = payload?.refresh || null;

    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      localStorage.setItem(ACCESS_TOKEN_LEGACY_KEY, token);
      setAccessToken(token);
    }

    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      localStorage.setItem(REFRESH_TOKEN_LEGACY_KEY, refresh);
    }

    return token;
  };

  const applyAuthWorkspacePayload = (payload = {}) => {
    const workspaces = Array.isArray(payload.workspaces) ? payload.workspaces : [];
    if (workspaces.length) {
      localStorage.setItem("workspaces", JSON.stringify(workspaces));
    }

    const workspaceSlug =
      payload.active_workspace ||
      payload.workspace?.slug ||
      (workspaces.length ? workspaces[0].slug : "");

    if (workspaceSlug) {
      setTenantSlug(workspaceSlug);
    }
  };

  const resolveBackend = async () => {
    const reachable = await pingBackend();
    setBackendReady(reachable);
    return reachable;
  };

  useEffect(() => {
    setupInterceptors(
      () => accessToken,
      () => getStoredTenant(),
      () => {
        toast.error("Session expired. Please login again.");
        logout();
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    );
  }, [accessToken]);

  const applyUserAndWorkspaces = (data) => {
    setUser(data);
    const workspaces = Array.isArray(data.workspaces) ? data.workspaces : [];
    localStorage.setItem("workspaces", JSON.stringify(workspaces));

    const currentTenant = getStoredTenant();
    const hasMembership = workspaces.some((ws) => ws.slug === currentTenant);

    if (!currentTenant || !hasMembership) {
      if (workspaces.length) {
        setTenantSlug(workspaces[0].slug);
      } else {
        setTenantSlug("");
      }
    }
  };

  const fetchMe = async (explicitToken = null) => {
    const token = explicitToken || accessToken;
    if (!token) {
      setLoading(false);
      return null;
    }

    const reachable = await resolveBackend();
    if (!reachable) {
      setLoading(false);
      return null;
    }

    try {
      const { data } = await api.get("auth/me/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      applyUserAndWorkspaces(data);
      return data;
    } catch (error) {
      if (error?.response?.status === 401) {
        logout();
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, [accessToken]);

  const login = async (payload) => {
    const reachable = await resolveBackend();
    if (!reachable) {
      throw new Error("Backend unavailable");
    }

    const { data } = await loginRequest(payload);
    const token = persistTokens(data);
    applyAuthWorkspacePayload(data);
    await fetchMe(token);
    return data;
  };

  const register = async (payload) => {
    const reachable = await resolveBackend();
    if (!reachable) {
      throw new Error("Backend unavailable");
    }

    const { data } = await registerRequest(payload);
    const token = persistTokens(data);
    applyAuthWorkspacePayload(data);
    await fetchMe(token);
    toast.success("Welcome to FlowDesk! Your workspace is ready.");
    return data;
  };

  const value = useMemo(
    () => ({
      accessToken,
      backendReady,
      user,
      loading,
      isAuthenticated: Boolean(accessToken),
      login,
      register,
      logout,
      refreshUser: fetchMe
    }),
    [accessToken, backendReady, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
