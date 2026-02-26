import { createContext, useContext, useMemo, useState } from "react";
import { useEffect } from "react";

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenantState] = useState(localStorage.getItem("tenant_slug") || "");

  const setTenant = (slug) => {
    localStorage.setItem("tenant_slug", slug);
    setTenantState(slug);
    window.dispatchEvent(new Event("tenant-changed"));
  };

  useEffect(() => {
    const syncTenant = () => setTenantState(localStorage.getItem("tenant_slug") || "");
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
