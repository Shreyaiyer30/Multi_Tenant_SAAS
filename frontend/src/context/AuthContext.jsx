import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { pingBackend, setupInterceptors } from "@/api/api";
import { loginRequest, registerRequest } from "@/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(localStorage.getItem("access_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("tenant_slug");
    localStorage.removeItem("workspaces");
    setAccessToken(null);
    setUser(null);
  };

  const persistTokens = (payload) => {
    const token = payload?.access || payload?.access_token || null;
    const refresh = payload?.refresh || null;

    if (token) {
      localStorage.setItem("access_token", token);
      setAccessToken(token);
    }

    if (refresh) {
      localStorage.setItem("refresh_token", refresh);
    }

    return token;
  };

  const resolveBackend = async () => {
    const reachable = await pingBackend();
    setBackendReady(reachable);
    return reachable;
  };

  useEffect(() => {
    setupInterceptors(
      () => accessToken,
      () => localStorage.getItem("tenant_slug"),
      logout
    );
  }, [accessToken]);

  const applyUserAndWorkspaces = (data) => {
    setUser(data);
    const workspaces = Array.isArray(data.workspaces) ? data.workspaces : [];
    localStorage.setItem("workspaces", JSON.stringify(workspaces));

    const currentTenant = localStorage.getItem("tenant_slug");
    const hasMembership = workspaces.some((ws) => ws.slug === currentTenant);

    if (!currentTenant || !hasMembership) {
      if (workspaces.length) {
        localStorage.setItem("tenant_slug", workspaces[0].slug);
        window.dispatchEvent(new Event("tenant-changed"));
      } else {
        localStorage.removeItem("tenant_slug");
        window.dispatchEvent(new Event("tenant-changed"));
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
    await fetchMe(token);
    toast.success("Welcome to TaskSaaS! Your workspace is ready.");
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
