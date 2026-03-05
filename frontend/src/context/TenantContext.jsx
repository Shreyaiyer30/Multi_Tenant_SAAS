import { createContext, useContext, useMemo, useState } from "react";
import { useEffect } from "react";

const TenantContext = createContext(null);
const ACTIVE_TENANT_KEY = "activeTenant";
const ACTIVE_TENANT_LEGACY_KEY = "tenant_slug";

const getStoredTenant = () =>
  localStorage.getItem(ACTIVE_TENANT_KEY) || localStorage.getItem(ACTIVE_TENANT_LEGACY_KEY) || "";

export function TenantProvider({ children }) {
  const [tenant, setTenantState] = useState(getStoredTenant());

  const setTenant = (slug) => {
    localStorage.setItem(ACTIVE_TENANT_KEY, slug);
    localStorage.setItem(ACTIVE_TENANT_LEGACY_KEY, slug);
    setTenantState(slug);
    window.dispatchEvent(new Event("tenant-changed"));
  };

  useEffect(() => {
    const syncTenant = () => setTenantState(getStoredTenant());
    window.addEventListener("storage", syncTenant);
    window.addEventListener("tenant-changed", syncTenant);
    return () => {
      window.removeEventListener("storage", syncTenant);
      window.removeEventListener("tenant-changed", syncTenant);
    };
  }, []);

  const value = useMemo(() => ({ tenant, setTenant }), [tenant]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);
