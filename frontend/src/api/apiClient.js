import axios from "axios";
import { toast } from "sonner";

const DEFAULT_API_BASE_URL = "https://multi-tenant-saas-production.up.railway.app/api/v1/";

const ACCESS_TOKEN_KEY = "accessToken";
const ACCESS_TOKEN_LEGACY_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_TOKEN_LEGACY_KEY = "refresh_token";
const ACTIVE_TENANT_KEY = "activeTenant";
const ACTIVE_TENANT_LEGACY_KEY = "tenant_slug";

const normalizeBaseUrl = (url) => {
  const raw = (url || "").trim();
  const base = raw || DEFAULT_API_BASE_URL;
  const withoutDocsSuffix = base.replace(/\/(?:docs|schema|redoc)\/?$/i, "");
  return withoutDocsSuffix.endsWith("/") ? withoutDocsSuffix : `${withoutDocsSuffix}/`;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

const getTokenFromStorage = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_LEGACY_KEY);

const getTenantFromStorage = () =>
  localStorage.getItem(ACTIVE_TENANT_KEY) || localStorage.getItem(ACTIVE_TENANT_LEGACY_KEY) || "";

const getTenantFromWorkspaceFallback = () => {
  try {
    const raw = localStorage.getItem("workspaces");
    const workspaces = raw ? JSON.parse(raw) : [];
    return Array.isArray(workspaces) ? workspaces[0]?.slug || "" : "";
  } catch {
    return "";
  }
};

const clearAuthState = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_LEGACY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_LEGACY_KEY);
  localStorage.removeItem(ACTIVE_TENANT_KEY);
  localStorage.removeItem(ACTIVE_TENANT_LEGACY_KEY);
  localStorage.removeItem("workspaces");
  window.dispatchEvent(new Event("tenant-changed"));
};

let getToken = getTokenFromStorage;
let getTenant = getTenantFromStorage;
let onUnauthorized = null;
let unauthorizedHandled = false;

const shouldSkipUnauthorizedAutoHandling = (url = "") => {
  const normalizedUrl = String(url).toLowerCase();
  return (
    normalizedUrl.includes("auth/login/") ||
    normalizedUrl.includes("auth/register/") ||
    normalizedUrl.includes("auth/refresh/")
  );
};

export const setupInterceptors = (tokenGetter, tenantGetter, unauthorizedCb) => {
  getToken = tokenGetter || getTokenFromStorage;
  getTenant = tenantGetter || getTenantFromStorage;
  onUnauthorized = unauthorizedCb || null;
};

apiClient.interceptors.request.use((config) => {
  const token = getToken?.() || getTokenFromStorage();
  const explicitTenant = (getTenant?.() || "").trim();
  const tenant = explicitTenant || getTenantFromWorkspaceFallback();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenant) {
    config.headers["x-tenant"] = tenant;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || "";

    if (status === 401 && !shouldSkipUnauthorizedAutoHandling(requestUrl)) {
      if (!unauthorizedHandled) {
        unauthorizedHandled = true;
        clearAuthState();
        if (onUnauthorized) {
          onUnauthorized(error);
        } else {
          toast.error("Session expired. Please login again.");
          if (window.location.pathname !== "/login") {
            window.location.assign("/login");
          }
        }
        setTimeout(() => {
          unauthorizedHandled = false;
        }, 1200);
      }
    } else if (status >= 500) {
      toast.error("Something went wrong. Please try again in a moment.");
      // Keep full details for diagnostics in dev tools.
      console.error("API Server Error", {
        url: requestUrl,
        method: error?.config?.method,
        status,
        data: error?.response?.data
      });
    }

    return Promise.reject(error);
  }
);

export const pingBackend = async () => {
  try {
    await apiClient.get("health/");
    return true;
  } catch {
    return false;
  }
};

export default apiClient;
