import axios from "axios";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1/";

const normalizeBaseUrl = (url) => {
  const value = (url || DEFAULT_API_BASE_URL).trim();
  return value.endsWith("/") ? value : `${value}/`;
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

export const setupInterceptors = (tokenGetter, tenantGetter, unauthorizedCb) => {
  getToken = tokenGetter;
  getTenant = tenantGetter;
  onUnauthorized = unauthorizedCb;
};

api.interceptors.request.use((config) => {
  const token = getToken?.();
  const tenant = getTenant?.();
  const url = config.url || "";
  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const shouldAttachTenant =
    tenant &&
    !normalizedUrl.startsWith("auth/") &&
    !normalizedUrl.startsWith("schema/") &&
    !normalizedUrl.startsWith("docs/") &&
    !normalizedUrl.startsWith("notifications/");

  if (shouldAttachTenant) {
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
