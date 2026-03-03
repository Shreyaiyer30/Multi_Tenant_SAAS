import axios from "axios";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1/";

const normalizeBaseUrl = (url) => {
  const raw = (url || "").trim();
  const fallback = DEFAULT_API_BASE_URL;
  const base = raw || fallback;

  // Guard against misconfiguration where Swagger/docs URLs are provided.
  const withoutDocsSuffix = base.replace(/\/(?:docs|schema|redoc)\/?$/i, "");
  return withoutDocsSuffix.endsWith("/") ? withoutDocsSuffix : `${withoutDocsSuffix}/`;
};

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

let getToken = () => localStorage.getItem("access_token");
let getTenant = () => localStorage.getItem("tenant_slug");
let onUnauthorized = null;

const EXCLUDED_TENANT_PREFIXES = ["auth/", "schema/", "docs/", "health/"];

const resolveTenant = () => {
  const direct = (getTenant?.() || "").trim();
  if (direct) {
    return direct;
  }

  try {
    const rawWorkspaces = localStorage.getItem("workspaces");
    const workspaces = rawWorkspaces ? JSON.parse(rawWorkspaces) : [];
    const fallback = Array.isArray(workspaces) ? workspaces[0]?.slug : "";

    if (fallback) {
      localStorage.setItem("tenant_slug", fallback);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tenant-changed"));
      }
      return fallback;
    }
  } catch {
    // Ignore invalid localStorage JSON and continue without tenant.
  }

  return "";
};

export const setupInterceptors = (tokenGetter, tenantGetter, unauthorizedCb) => {
  getToken = tokenGetter;
  getTenant = tenantGetter;
  onUnauthorized = unauthorizedCb;
};

api.interceptors.request.use((config) => {
  const token = getToken?.();
  const tenant = resolveTenant();
  const url = config.url || "";
  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;
  const isTenantScoped = !EXCLUDED_TENANT_PREFIXES.some((prefix) => normalizedUrl.startsWith(prefix));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (isTenantScoped && tenant) {
    config.headers["X-Tenant"] = tenant;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export const pingBackend = async () => {
  try {
    await api.get("health/");
    return true;
  } catch {
    return false;
  }
};

export { API_BASE_URL };
export default api;
